import { ITerminal } from '../Types';
import { INVERTED_DEFAULT_COLOR } from './atlas/Types';
import { IColorSet, IRenderDimensions, IRenderLayer } from './Types';

export abstract class BaseRenderLayer implements IRenderLayer {
  protected _ctx: CanvasRenderingContext2D;

  protected _scaledCharWidth: number = 0;
  protected _scaledCharHeight: number = 0;
  private _canvas: HTMLCanvasElement;
  private _scaledCellWidth: number = 0;
  private _scaledCellHeight: number = 0;
  private _scaledCharLeft: number = 0;
  private _scaledCharTop: number = 0;

  constructor(
    private _container: HTMLElement,
    id: string,
    zIndex: number,
    private _alpha: boolean,
    protected _colors: IColorSet,
  ) {
    this._canvas = document.createElement('canvas');
    this._canvas.classList.add(`${id}-layer`);
    this._canvas.style.zIndex = zIndex.toString();
    this._initCanvas();
    this._container.appendChild(this._canvas);
  }

  // public abstract onGridChanged(terminal: ITerminal): void;
  // public abstract onSelectionChanged(terminal: ITerminal, start: [number, number, number], end: [number, number, number]): void;

  public resize(terminal: ITerminal, dim: IRenderDimensions): void {
    this._scaledCellWidth = dim.scaledCellWidth;
    this._scaledCellHeight = dim.scaledCellHeight;
    this._canvas.width = dim.scaledCanvasWidth;
    this._canvas.height = dim.scaledCanvasHeight;
    this._canvas.style.width = `${dim.canvasWidth}px`;
    this._canvas.style.height = `${dim.canvasHeight}px`;

    this._canvas.style.transform = `translate(${terminal.options.padding.left}px,${terminal.options.padding.top}px)`;

    // Draw the background if this is an opaque layer
    this.clearAll();
  }

  protected clearAll(): void {
    if (this._alpha) {
      this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    } else {
      this._ctx.fillStyle = this._colors.background.css;
      this._ctx.fillRect(0, 0, this._canvas.width, this._canvas.height);
    }
  }

  protected drawChar(terminal: ITerminal, char: string, width: number, fg: number, x: number, y: number): void {
    this._drawUncachedChar(terminal, char, width, fg, x, y);
  }

  protected getFont(terminal: ITerminal): string {
    return `${terminal.options.fontSize * window.devicePixelRatio}px ${terminal.options.fontFamily}`;
  }

  protected fillCells(x: number, y: number, width: number, height: number): void {
    this._ctx.fillRect(
      x * this._scaledCellWidth,
      y * this._scaledCellHeight,
      width * this._scaledCellWidth,
      height * this._scaledCellHeight,
    );
  }

  private _initCanvas(): void {
    this._ctx = this._canvas.getContext('2d', { alpha: this._alpha });

    if (!this._alpha) {
      this.clearAll();
    }
  }

  private _drawUncachedChar(terminal: ITerminal, char: string, width: number, fg: number, x: number, y: number): void {
    this._ctx.save();
    this._ctx.font = this.getFont(terminal);
    this._ctx.textBaseline = 'top';

    if (fg === INVERTED_DEFAULT_COLOR) {
      this._ctx.fillStyle = this._colors.background.css;
    } else if (fg < 256) {
      this._ctx.fillStyle = this._colors.ansi[fg].css;
    } else {
      this._ctx.fillStyle = this._colors.foreground.css;
    }

    this._ctx.fillText(
      char,
      x * this._scaledCellWidth,
      y * this._scaledCellHeight);

    this._ctx.restore();
  }
}
