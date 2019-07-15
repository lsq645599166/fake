import { IColorSet } from '../shared/Types';
import { ITerminal } from '../Types';

export interface IRenderDimensions {
  scaledCharWidth: number;
  scaledCharHeight: number;
  scaledCellWidth: number;
  scaledCellHeight: number;
  scaledCharLeft: number;
  scaledCharTop: number;
  scaledCanvasWidth: number;
  scaledCanvasHeight: number;
  canvasWidth: number;
  canvasHeight: number;
  actualCellWidth: number;
  actualCellHeight: number;
}

export interface IRenderer {
  dimensions: IRenderDimensions;
  // colorManager: IColorManager;

  // setTheme(theme: ITheme): IColorSet;
  onWindowResize(devicePixelRatio: number): void;
  onResize(): void;
  // onBlur(): void;
  // onFocus(): void;
  onSelectionChanged(start: [number, number, number], end: [number, number, number]): void;
  // onCursorMove(): void;
  // onOptionsChanged(): void;
  // clear(): void;
  refreshRows(): void;
}

export { IColorSet };

export interface IRenderLayer {
  resize(terminal: ITerminal, dim: IRenderDimensions): void;
  onGridChanged?(terminal: ITerminal): void;
  onSelectionChanged?(terminal: ITerminal, start: [number, number, number], end: [number, number, number]): void;
}
