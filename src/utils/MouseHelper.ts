import { IBuffer, ICharMeasure, IPadding } from '../Types';

export class MouseHelper {

  public static GET_COORDS_RELATIVE_TO_ELEMENT(
    event: {clientX: number, clientY: number},
    element: HTMLElement,
    padding: IPadding,
  ): [number, number] {
    const rect = element.getBoundingClientRect();

    return [
      event.clientX - rect.left - padding.left,
      event.clientY - rect.top - padding.top,
    ];
  }
  constructor(private _renderer) {}

  /**
   * Gets coordinates within the terminal for a particular mouse event. The result
   * is returned as an array in the form [x, y] instead of an object as it's a
   * little faster and this function is used in some low level code.
   * @param event The mouse event.
   * @param element The terminal's container element.
   * @param charMeasure The char measure object used to determine character sizes.
   * @param colCount The number of columns in the terminal.
   * @param rowCount The number of rows n the terminal.
   * @param isSelection Whether the request is for the selection or not. This will
   * apply an offset to the x value such that the left half of the cell will
   * select that cell and the right half will select the next cell.
   */
  public getCoords(
    event: {clientX: number, clientY: number},
    element: HTMLElement, buffer: IBuffer,
    charMeasure: ICharMeasure,
    lineHeight: number,
    colCount: number,
    rowCount: number,
    padding: IPadding,
    isSelection?: boolean,
  ): [number, number, number] {
    // Coordinates cannot be measured if charMeasure has not been initialized
    if (!charMeasure.width || !charMeasure.height) {
      return null;
    }

    const coords = MouseHelper.GET_COORDS_RELATIVE_TO_ELEMENT(event, element, padding);
    if (!coords) {
      return null;
    }

    /*
     * in retina screen, the scaledCellWidth is twice the realWidth, and the same with realHeight
     */
    const realWidth = this._renderer.dimensions.scaledCellWidth / window.devicePixelRatio;
    const realHeight = this._renderer.dimensions.scaledCellHeight / window.devicePixelRatio;

    coords[0] = Math.ceil((coords[0] + (isSelection ? realWidth / 2 : 0)) / realWidth);
    coords[1] = Math.ceil(coords[1] / realHeight);

    // Ensure coordinates are within the terminal viewport. Note that selections
    // need an addition point of precision to cover the end point (as characters
    // cover half of one char and half of the next).
    coords[0] = Math.min(Math.max(coords[0], 1), colCount + (isSelection ? 1 : 0));
    coords[1] = Math.min(Math.max(coords[1], 1), rowCount);

    coords[0] -= 1;
    coords[1] -= 1;

    return buffer.getSelectionCoords(coords);

    // return coords;
  }
}
