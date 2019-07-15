import { ITerminal } from '../Types';
import { BaseRenderLayer } from './BaseRenderLayer';
import { IColorSet } from './Types';

export class SelectionRenderLayer extends BaseRenderLayer {
  private _state: {start: [number, number], end: [number, number]};

  constructor(container: HTMLElement, zIndex: number, colors: IColorSet) {
    super(container, 'selection', zIndex, true, colors);
    this._state = {
      start: null,
      end: null,
    };
  }

  public onSelectionChanged(terminal: ITerminal, start: [number, number, number], end: [number, number, number]): void {
    // Remove all selections
    this.clearAll();

    if (!start || !end) {
      return;
    }

    this._ctx.fillStyle = this._colors.selection.css;
    this._forEachCell(terminal, start, end, (x, y, width) => {
      this.fillCells(x, y, width, 1);
    });
  }

  private _forEachCell(
    terminal: ITerminal,
    start: [number, number, number],
    end: [number, number, number],
    callback: (
      x: number,
      y: number,
      width: number,
    ) => void,
  ): void {
    const offset = terminal.buffer.getOffset();

    let x = start[2];
    let y = -offset;
    for (let i = 0; i < start[0]; i += 1) {
      y += terminal.buffer.lines[i].length;
    }
    y += start[1];

    for (let i = start[0]; i <= end[0]; i += 1) {
      const lines = terminal.buffer.lines[i].data;
      for (let j = 0; j < lines.length; j += 1) {
        if (i === start[0] && j < start[1]) {
          continue;
        }

        if (i === end[0] && j > end[1]) {
          continue;
        }

        const line = lines[j];
        for (let k = 0; k < line.length; k += 1) {
          if (i === start[0] && j === start[1] && k < start[2]) {
            continue;
          }

          if (i === end[0] && j === end[1] && k >= end[2]) {
            continue;
          }

          const charData = line[k];

          const width = charData[3];
          if (width === 0 && i === start[0] && j === start[1] && k === start[2] && line[k - 1][3] === 2) {
            callback(x - 1, y, charData[3]);
            x += 1;
            continue;
          }

          callback(x, y, width);
          x += width;
        }
        x = 0;
        y += 1;
      }
    }
  }
}
