import { IRenderer } from './renderer/Types';
// export type HexColor = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export type XtermListener = (...args: any[]) => void;

export interface IEventEmitter {
  on(type: string, listener: (...args: any[]) => void): void;
  // off(type: string, listener: (...args: any[]) => void): void;
  emit(type: string, data?: any): void;
  // addDisposableListener(type: string, handler: (...args: any[]) => void): IDisposable;
}

export interface IChar {
  bright: boolean;
  fg: number;
  bg: number;
  text: string;
}

export interface ITheme {
  foreground?: string;
  background?: string;
  selection?: string;
  black?: string;
  red?: string;
  green?: string;
  yellow?: string;
  blue?: string;
  magenta?: string;
  cyan?: string;
  white?: string;
  brightBlack?: string;
  brightRed?: string;
  brightGreen?: string;
  brightYellow?: string;
  brightBlue?: string;
  brightMagenta?: string;
  brightCyan?: string;
  brightWhite?: string;
}

export interface IPadding {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

export interface ITerminal {
  buffer: IBuffer;
  browser: IBrowser;
  charMeasure: ICharMeasure;
  cols: number;
  rows: number;
  oldCols: number;
  oldRows: number;
  element: HTMLElement;
  options: ITerminalOptions;
  scrollTop: number;
  renderer: IRenderer;
  viewport: IViewport;
  mouseHelper: IMouseHelper;
  screenElement: HTMLElement;
  scrollLines(): void;
}

export interface IMouseHelper {
  getCoords(
    event: { pageX: number, pageY: number },
    element: HTMLElement,
    buffer: IBuffer,
    charMeasure: ICharMeasure,
    lineHeight: number,
    colCount: number,
    rowCount: number,
    padding: IPadding,
    isSelection?: boolean,
  ): [number, number, number];
}

export interface ICharMeasure {
  width: number;
  height: number;
  measure(options: ITerminalOptions): void;
}

export interface IInputHandler {
  parse(data: string): void;
}

export interface IViewport {
  scrollBarWidth: number;
  syncScrollArea(): void;
  scroll(disp: number): void;
}

export interface IBuffer {
  lines: Array<any>;
  clear(): void;
  getOffset(): number;
  resize(): void;
  getLines(): number;
  getStart(): [number, number];
  getEnd(): [number, number];
  getBufferString(start: [number, number, number], end: [number, number, number]): string[];
  getSelectionCoords(coord: [number, number]): [number, number, number];
  getSelectWord(coord: [number, number, number]): {start: number, end: number};
}

export interface ITerminalOptions {
  padding: IPadding;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  theme: ITheme;
}

export interface IBrowser {
  isNode: boolean;
  userAgent: string;
  platform: string;
  isFirefox: boolean;
  isMSIE: boolean;
  isMac: boolean;
  isIpad: boolean;
  isIphone: boolean;
  isMSWindows: boolean;
}

export interface ISelectionManager {
  selectionText: string;
}

export interface IDisposable {
  dispose(): void;
}
