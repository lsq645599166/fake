export class SelectionModel {
  public isSelectAllActive: boolean;
  public selectionStart: [number, number, number];
  public selectionEnd: [number, number, number];
  public selectionStartLength: number;

  constructor(
    private _terminal,
  ) {
    this.clearSelection();
  }

  public clearSelection(): void {
    this.selectionStart = null;
    this.selectionEnd = null;
    this.isSelectAllActive = false;
    this.selectionStartLength = 0;
  }

  public areSelectionValuesReversed(): boolean {
    const start = this.selectionStart;
    const end = this.selectionEnd;
    if (!start || !end) {
      return false;
    }

    return start[0] > end[0] ||
      (start[0] === end[0] && start[1] > end[1]) ||
      (start[0] === end[0] && start[1] === end[1] && start[2] > end[2]);
  }

  public get finalSelectionStart(): [number, number, number] {
    if (this.isSelectAllActive) {
      return [0, 0, 0];
    }

    if (!this.selectionEnd || !this.selectionStart) {
      return this.selectionStart;
    }

    return this.areSelectionValuesReversed() ? this.selectionEnd : this.selectionStart;
  }

  /**
   * The final selection end, taking into consideration select all, double click
   * word selection and triple click line selection.
   */
  public get finalSelectionEnd(): [number, number, number] {
    if (this.isSelectAllActive) {
      const line = this._terminal.buffer.getLines();
      const data = this._terminal.buffer.lines[line].data;
      // return [this._terminal.cols, this._terminal.buffer.ybase + this._terminal.rows - 1];

      return [line, data.length, data[data.length - 1].length - 1];
    }

    if (!this.selectionStart) {
      return null;
    }

    return this.areSelectionValuesReversed() ? this.selectionStart : this.selectionEnd;
  }
}
