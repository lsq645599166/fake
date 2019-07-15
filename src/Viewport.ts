import { ITerminal, IViewport } from './Types';

const FALLBACK_SCROLL_BAR_WIDTH = 15;

export class Viewport implements IViewport {
  public scrollBarWidth: number = 0;

  private _currentRowHeight: number;

  constructor(
    private _terminal: ITerminal,
    private _viewportElement: HTMLElement,
    private _scrollArea: HTMLElement,
  ) {
    this.scrollBarWidth = (this._viewportElement.offsetWidth - this._scrollArea.offsetWidth)
      || FALLBACK_SCROLL_BAR_WIDTH;
    this._viewportElement.addEventListener('scroll', this._onScroll.bind(this));

    setTimeout(() => this.syncScrollArea(), 0);
  }

  public scroll(disp: number): void {
    this._viewportElement.scrollTop += disp;
    this._onScroll();
  }

  public syncScrollArea(): void {
    this._refresh();
  }

  private _onScroll(): void {
    this._terminal.scrollTop = this._viewportElement.scrollTop;
    this._terminal.scrollLines();
  }

  private _refresh(): void {
    this._currentRowHeight = this._terminal.renderer.dimensions.scaledCellHeight / window.devicePixelRatio;

    const paddingHor = this._terminal.options.padding.top + this._terminal.options.padding.bottom;

    let atBottom = false;
    if (this._viewportElement.scrollHeight === this._viewportElement.offsetHeight + this._viewportElement.scrollTop) {
      atBottom = true;
    }

    this._scrollArea.style.height = `${this._terminal.buffer.getLines() * this._currentRowHeight + paddingHor}px`;

    if (atBottom) {
      this._viewportElement.scrollTop = this._viewportElement.scrollHeight - this._viewportElement.offsetHeight;
    }
  }
}
