import { ITerminal } from '../Types';
import { INVERTED_DEFAULT_COLOR } from './atlas/Types';
import { BaseRenderLayer } from './BaseRenderLayer';
import { IColorSet } from './Types';

export class TextRenderLayer extends BaseRenderLayer {
  constructor(
    container: HTMLElement,
    zIndex: number,
    colors: IColorSet,
  ) {
    super(container, 'text', zIndex, false, colors);
  }

  public onGridChanged(terminal: ITerminal): void {
    this.clearAll();
    this._drawBackground(terminal);
    this._drawForeground(terminal);
  }

  private _drawForeground(terminal: ITerminal): void {
    this._forEachCell(terminal, (char, width, x, y, fg, bg) => {
      this.drawChar(terminal, char, width, fg, x, y);
    });
  }

  private _drawBackground(terminal: ITerminal): void {
    this._forEachCell(terminal, (char, width, x, y, fg, bg) => {
      this._ctx.save();
      if (bg === INVERTED_DEFAULT_COLOR) {
        this._ctx.fillStyle = this._colors.foreground.css;
      } else if (bg < 256) {
        this._ctx.fillStyle = this._colors.ansi[bg].css;
      }

      this.fillCells(x, y, width, 1);
      this._ctx.restore();
    });
  }

  private _forEachCell(
    terminal: ITerminal,
    callback: (
      char: string,
      width: number,
      x: number,
      y: number,
      fg: number,
      bg: number,
    ) => void,
  ): void {
    let y = 0;
    if (terminal.buffer.lines.length === 0) {
      return;
    }

    const start = terminal.buffer.getStart();
    const end = terminal.buffer.getEnd();

    for (let i = start[0]; i <= end[0]; i += 1) {
      const lines = terminal.buffer.lines[i].data;
      for (let j = 0; j < lines.length; j += 1) {
        if (i === start[0] && j < start[1]) {
          continue;
        }
        if (i === end[0] && j > end[1]) {
          continue;
        }
        let x = 0;
        const line = lines[j];
        for (let k = 0; k < line.length; k += 1) {
          const charData = line[k];

          let char = charData[0];
          const fg = charData[1];
          const bg = charData[2];
          let width = charData[3];
          if (width === 0) {
            continue;
          }
          k += 1;
          while (k < line.length) {
            const newChar = line[k];
            if (newChar[1] === fg && newChar[2] === bg) {
              if (newChar[3] > 0) {
                char += newChar[0];
              }
              width += newChar[3];
              k += 1;
            } else {
              k -= 1;
              break;
            }
          }
          callback(char, width, x, y, fg, bg);
          x += width;
        }
        y += 1;
      }
    }
  }
}
