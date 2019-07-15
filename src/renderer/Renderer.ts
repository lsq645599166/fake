import { EventEmitter } from '../EventEmitter';
import { ITerminal, ITheme } from '../Types';
import { ScreenDprMonitor } from '../utils/ScreenDprMonitor';
import { ColorManager } from './ColorManager';
import { SelectionRenderLayer } from './SelectionRenderLayer';
import { TextRenderLayer } from './TextRenderLayer';
import { IRenderDimensions, IRenderer, IRenderLayer } from './Types';

export class Renderer extends EventEmitter implements IRenderer {

  public colorManager: ColorManager;
  public dimensions: IRenderDimensions;
  private _renderLayers: Array<IRenderLayer>;
  private _animationFrame: number = null;
  private _devicePixelRatio: number;
  private _screenDprMonitor: ScreenDprMonitor;

  constructor(
    private _terminal: ITerminal,
    theme: ITheme) {
    super();
    this.colorManager = new ColorManager(document);

    if (theme) {
      this.colorManager.setTheme(theme);
    }

    this._renderLayers = [
      new TextRenderLayer(this._terminal.screenElement, 0, this.colorManager.colors),
      new SelectionRenderLayer(this._terminal.screenElement, 1, this.colorManager.colors),
    ];

    this.dimensions = {
      scaledCharWidth: null,
      scaledCharHeight: null,
      scaledCellWidth: null,
      scaledCellHeight: null,
      scaledCharLeft: null,
      scaledCharTop: null,
      scaledCanvasWidth: null,
      scaledCanvasHeight: null,
      canvasWidth: null,
      canvasHeight: null,
      actualCellWidth: null,
      actualCellHeight: null,
    };
    this._devicePixelRatio = window.devicePixelRatio;
    this._updateDimensions();

    this._screenDprMonitor = new ScreenDprMonitor();
    // this._screenDprMonitor.setListener(() => this.onWindowResize(window.devicePixelRatio));

    this._renderLayers.forEach(l => l.resize(this._terminal, this.dimensions));
  }

  public refreshRows(): void {
    this._renderRows();
  }

  public onWindowResize(devicePixelRatio: number): void {
    // If the device pixel ratio changed, the char atlas needs to be regenerated
    // and the terminal needs to refreshed
    if (this._devicePixelRatio !== devicePixelRatio) {
      this._devicePixelRatio = devicePixelRatio;
      this.onResize();
    }
  }

  public onResize(): void {
    // Update character and canvas dimensions
    this._updateDimensions();

    // Resize all render layers
    this._renderLayers.forEach(l => l.resize(this._terminal, this.dimensions));

    // Resize the screen
    this._terminal.screenElement.style.width = `${this.dimensions.canvasWidth}px`;
    this._terminal.screenElement.style.height = `${this.dimensions.canvasHeight}px`;

    // this.emit('resize');
  }

  public onSelectionChanged(start: [number, number, number], end: [number, number, number]): void {
    this._runOperation((l) => {
      if (l instanceof SelectionRenderLayer) {
        l.onSelectionChanged(this._terminal, start, end);
      }
    });
  }

  private _runOperation(operation: (layer) => void): void {
    this._renderLayers.forEach(l => operation(l));
  }

  private _renderRows(): void {
    this._renderLayers.forEach((l) => {
      if (l instanceof TextRenderLayer) {
        l.onGridChanged(this._terminal);
      }
    });
  }

  private _updateDimensions(): void {
    if (!this._terminal.charMeasure.width || !this._terminal.charMeasure.height) {
      return;
    }

    const parentElementStyle = window.getComputedStyle(this._terminal.element.parentElement);
    const parentElementHeight = parseInt(parentElementStyle.getPropertyValue('height'), 0);
    const parentElementWidth = Math.max(0, parseInt(parentElementStyle.getPropertyValue('width'), 0));

    if (!parentElementWidth || !parentElementHeight) {
      return;
    }

    // Calculate the scaled character width. Width is floored as it must be
    // drawn to an integer grid in order for the CharAtlas "stamps" to not be
    // blurry. When text is drawn to the grid not using the CharAtlas, it is
    // clipped to ensure there is no overlap with the next cell.
    this.dimensions.scaledCharWidth = parseFloat(
      (this._terminal.charMeasure.width * window.devicePixelRatio).toFixed(2),
    );

    // Calculate the scaled character height. Height is ceiled in case
    // devicePixelRatio is a floating point number in order to ensure there is
    // enough space to draw the character to the cell.
    this.dimensions.scaledCharHeight = parseFloat(
      (this._terminal.charMeasure.height * window.devicePixelRatio).toFixed(2),
    );

    // Calculate the scaled cell height, if lineHeight is not 1 then the value
    // will be floored because since lineHeight can never be lower then 1, there
    // is a guarentee that the scaled line height will always be larger than
    // scaled char height.
    this.dimensions.scaledCellHeight = this.dimensions.scaledCharHeight * this._terminal.options.lineHeight;

    // Calculate the y coordinate within a cell that text should draw from in
    // order to draw in the center of a cell.
    this.dimensions.scaledCharTop = this._terminal.options.lineHeight === 1
      ? 0 : Math.round((this.dimensions.scaledCellHeight - this.dimensions.scaledCharHeight) / 2);

    // Calculate the scaled cell width, taking the letterSpacing into account.
    this.dimensions.scaledCellWidth = this.dimensions.scaledCharWidth
      + Math.round(this._terminal.options.letterSpacing);

    // Calculate the x coordinate with a cell that text should draw from in
    // order to draw in the center of a cell.
    this.dimensions.scaledCharLeft = Math.floor(this._terminal.options.letterSpacing / 2);

    const padding = this._terminal.options.padding;
    this.dimensions.canvasHeight = Math.floor(parentElementHeight - padding.top - padding.bottom);
    this.dimensions.canvasWidth = Math.floor(
      parentElementWidth - this._terminal.viewport.scrollBarWidth - padding.left - padding.right,
    );

    this.dimensions.scaledCanvasHeight = this.dimensions.canvasHeight * window.devicePixelRatio;
    this.dimensions.scaledCanvasWidth = this.dimensions.canvasWidth * window.devicePixelRatio;

    this._terminal.rows = Math.floor(this.dimensions.scaledCanvasHeight / this.dimensions.scaledCellHeight);
    this._terminal.cols = Math.floor(this.dimensions.scaledCanvasWidth / this.dimensions.scaledCellWidth);

    // Get the _actual_ dimensions of an individual cell. This needs to be
    // derived from the canvasWidth/Height calculated above which takes into
    // account window.devicePixelRatio. CharMeasure.width/height by itself is
    // insufficient when the page is not at 100% zoom level as CharMeasure is
    // measured in CSS pixels, but the actual char size on the canvas can
    // differ.
    this.dimensions.actualCellHeight = this.dimensions.canvasHeight / this._terminal.rows;
    this.dimensions.actualCellWidth = this.dimensions.canvasWidth / this._terminal.cols;
  }
}
