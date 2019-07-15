import { IBuffer, ITerminal } from './Types';

const HT  = '\x09';

export class Buffer implements IBuffer {
  public scrollTop: number;
  public lines: Array<any> = [];
  private _hashMap: object = {};

  constructor(
    private _terminal: ITerminal,
  ) {
    this.clear();
  }

  public clear(): void {
    this.scrollTop = 0;
    this._hashMap = {};
    // this.lines = [];
    while (this.lines.length) {
      this.lines.pop();
    }
  }

  public append(data): void {
    let start = 0;
    if (this.lines.length) {
      const lastLine = this.lines[this.lines.length - 1];
      start = lastLine.start + lastLine.data.length;
    }

    let col = 0;
    const line = [[]];
    for (const char of data) {
      if (col + char[3] > this._terminal.cols) {
        col = 0;
        this._hashMap[start + line.length - 1] = this.lines.length;
        line.push([]);
      }

      if (char[0] === HT) {
        let width = (Math.floor(col / 8) + 1) * 8 - col;
        if (col + width > this._terminal.cols) {
          col = 0;
          line.push([]);
        } else {
          col += width;
          while (width > 0) {
            line[line.length - 1].push([' ', char[1], char[2], 1]);
            width -= 1;
          }
        }
      } else if (char[3] > 0) {
        col += char[3];
        line[line.length - 1].push(char);
        if (char[3] === 2) {
          line[line.length - 1].push([char[0], char[1], char[2], 0]);
        }
      }
    }
    this._hashMap[start + line.length - 1] = this.lines.length;

    this.lines.push({
      data: line,
      start,
      length: line.length,
    });
  }

  public resize(): void {
    const cols = this._terminal.cols;
    const oldCols = this._terminal.oldCols;
    const diff = Math.abs(this._terminal.cols - this._terminal.oldCols);

    if (oldCols === cols) {
      return;
    }
    if (oldCols < cols) {
      this._hashMap = {};

      let start = 0;
      for (let i = 0; i < this.lines.length; i += 1) {
        const line = this.lines[i];
        line.start = start;

        if (line.length === 1) {
          this._hashMap[line.start] = i;
          start += 1;
        } else {
          const datas = [];
          const result = [];
          for (let j = 0; j < line.length; j += 1) {
            datas.push(...line.data[j]);
          }
          let count = 0;
          while (datas.length) {
            const data = datas.splice(0, cols);
            if (data[data.length - 1][3] === 2) {
              const char = data.pop();
              datas.unshift(char);
            }
            this._hashMap[line.start + count] = i;
            result.push(data);
            count += 1;
            start += 1;
          }
          line.data = result;
          line.length = result.length;
        }
      }
    } else if (oldCols > cols) {
      this._hashMap = {};

      let start = 0;
      for (let i = 0; i < this.lines.length; i += 1) {
        const line = this.lines[i];
        line.start = start;
        if (line.length === 1 && line.data[0].length < cols) {
          this._hashMap[line.start] = i;
          start += 1;
        } else {
          const datas = [];
          const result = [];
          let count = 0;
          for (let j = 0; j < line.length; j += 1) {
            datas.push(...line.data[j]);
          }
          while (datas.length) {
            const data = datas.splice(0, cols);
            if (data[data.length - 1][3] === 2) {
              const char = data.pop();
              datas.unshift(char);
            }
            this._hashMap[line.start + count] = i;
            result.push(data);
            count += 1;
            start += 1;
          }
          line.data = result;
          line.length = result.length;
        }
      }
    }
  }

  public getOffset(): number {
    const _currentRowHeight = this._terminal.renderer.dimensions.scaledCellHeight / window.devicePixelRatio;
    const scrollTop = this._terminal.scrollTop;

    return Math.ceil(this._terminal.scrollTop / _currentRowHeight);
  }

  public getLines(): number {
    const len = this.lines.length;
    if (len) {
      return this.lines[len - 1].start + this.lines[len - 1].length;
    }

    return 0;
  }

  public getStart(): [number, number] {
    const start = this.getOffset();
    const lineIndex = this._hashMap[start];
    if (this.lines[lineIndex]) {
      const line = this.lines[lineIndex];

      return [lineIndex, start - line.start];
    }
    // const line = this.lines[this._hashMap[start]];
    // for (let i = 0; i < this.lines.length; i += 1) {
    //   const line = this.lines[i];
    //   if (line.start <= start && line.start + line.length >= start) {
    //     return [i, start - line.start];
    //   }
    // }

    return [0, 0];
  }

  public getEnd(): [number, number] {
    if (this.lines.length === 0) {
      return null;
    }

    const end = this.getOffset() + this._terminal.rows;
    const lineIndex = this._hashMap[end];
    if (this.lines[lineIndex]) {
      const line = this.lines[lineIndex];

      return [lineIndex, end - line.start - 1];
    }
    // for (let i = 0; i < this.lines.length; i += 1) {
    //   const line = this.lines[i];
    //   if (line.start <= end && line.start + line.length >= end) {
    //     return [i, end - line.start - 1];
    //   }
    // }

    return [this.lines.length - 1, this.lines[this.lines.length - 1].length - 1];
  }

  public getSelectionCoords(coord: [number, number]): [number, number, number] {
    if (!this.lines.length) {
      return null;
    }
    const count = this.getOffset() + coord[1];
    for (let i = 0; i < this.lines.length; i += 1) {
      const line = this.lines[i];
      if (line.start <= count && line.start + line.length > count) {
        return [i, count - line.start, coord[0]];
      }
    }

    const len = this.lines.length - 1;
    const lastLine = this.lines[len];

    return [len, lastLine.length - 1, this._terminal.cols];
  }

  public getBufferString(start: [number, number, number], end: [number, number, number]): Array<string> {
    const result: Array<string> = [];

    for (let i = start[0]; i <= end[0]; i += 1) {
      const line = this.lines[i];
      let str: string = '';
      for (let j = 0; j < line.length; j += 1) {
        if (i === start[0] && j < start[1]) {
          continue;
        }
        if (i === end[0] && j > end[1]) {
          continue;
        }

        const chars = line.data[j];
        for (let k = 0; k < chars.length; k += 1) {
          if (i === start[0] && j === start[1] && k < start[2]) {
            continue;
          }
          if (i === end[0] && j === end[1] && k >= end[2]) {
            continue;
          }

          if (chars[k][3] === 0 && chars[k - 1][3] === 2) {
            continue;
          }

          str += chars[k][0];
        }
      }
      result.push(str);
    }

    if (result[0] === '') {
      result.shift();
    }

    if (result[result.length - 1] === '') {
      result.pop();
    }

    return result;
  }

  public getSelectWord(coord: [number, number, number]): {start: number, end: number} {
    const line = this.lines[coord[0]].data[coord[1]];
    let start;
    let end;

    if (coord[2] > line.length) {
      return null;
    }

    if (line[coord[2]][0] === ' ') {
      start = coord[2];
      end = coord[2] + 1;
    } else {
      for (let i = coord[2] - 1; i >= 0; i -= 1) {
        if (line[i][0] === ' ') {
          start = i + 1;
          break;
        }
      }

      for (let i = coord[2] + 1; i < line.length; i += 1) {
        if (line[i][0] === ' ') {
          end = i;
          break;
        }
      }
    }

    if (!start) {
      start = 0;
    }

    if (!end) {
      end = line.length;
    }

    return {
      start,
      end,
    };
  }
}
