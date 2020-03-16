import { EventEmitter } from '../EventEmitter';
import { ITerminalOptions } from '../Types';

export class CharMeasure extends EventEmitter {
  private _document: Document;
  private _parentElement: HTMLElement;
  private _measureElement: HTMLElement;
  private _width: number;
  private _height: number;

  constructor(document: Document, parentElement: HTMLElement) {
    super();
    this._document = document;
    this._parentElement = parentElement;
    this._measureElement = this._document.createElement('span');
    this._measureElement.classList.add('fake-char-measure-element');
    this._measureElement.textContent = 'W';
    this._parentElement.appendChild(this._measureElement);
  }

  public get width(): number {
    return this._width;
  }

  public get height(): number {
    return this._height;
  }

  public measure(options: ITerminalOptions): void {
    this._measureElement.style.fontFamily = options.fontFamily;
    this._measureElement.style.fontSize = `${options.fontSize}px`;
    // set the standard char line-height equal to the font-size
    this._measureElement.style.lineHeight = `${options.fontSize}px`;
    const geometry = this._measureElement.getBoundingClientRect();
    // The element is likely currently display:none, we should retain the
    // previous value.
    if (geometry.width === 0 || geometry.height === 0) {
      return;
    }
    if (this._width !== geometry.width || this._height !== geometry.height) {
      this._width = geometry.width;
      this._height = Math.ceil(geometry.height);
      this.emit('charsizechanged');
    }
  }
}
