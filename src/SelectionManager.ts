import { EventEmitter } from './EventEmitter';
import { SelectionModel } from './SelectionModel';
import * as Browser from './shared/utils/Browser';
import { IBuffer, ISelectionManager, ITerminal } from './Types';
import { CharMeasure } from './utils/CharMeasure';
import { MouseHelper } from './utils/MouseHelper';

const DRAG_SCROLL_MAX_THRESHOLD = 50;

const DRAG_SCROLL_MAX_SPEED = 15;

const DRAG_SCROLL_INTERVAL = 50;

const enum SelectionMode {
  NORMAL,
  WORD,
  LINE,
}

export class SelectionManager extends EventEmitter implements ISelectionManager {

  public get hasSelection(): boolean {
    const start = this._model.finalSelectionStart;
    const end = this._model.finalSelectionEnd;
    if (!start || !end) {
      return false;
    }

    return start[0] !== end[0] || start[1] !== end[1] || start[2] !== end[2];
  }

  private get _buffer(): IBuffer {
    return this._terminal.buffer;
  }

  public get selectionText(): string {
    const start = this._model.finalSelectionStart;
    const end = this._model.finalSelectionEnd;
    if (!start || !end) {
      return '';
    }

    const result: Array<string> = this._buffer.getBufferString(start, end);

    return result.join('\r\n');
  }

  public clear(): void {
    this._model.clearSelection();
  }

  protected _model: SelectionModel;
  private _mouseMoveListener: EventListener;
  private _mouseUpListener: EventListener;

  private _enabled: boolean = true;
  private _activeSelectionMode: SelectionMode;
  private _refreshAnimationFrame: number;

  private _dragScrollAmount: number = 0;
  private _dragScrollIntervalTimer;

  constructor(
    private _terminal: ITerminal,
    private _charMeasure: CharMeasure,
  ) {
    super();
    this._initListeners();
    this.enable();

    this._model = new SelectionModel(_terminal);
    this._activeSelectionMode = SelectionMode.NORMAL;
  }

  public onMouseDown(event: MouseEvent): void {
    event.preventDefault();

    this._dragScrollAmount = 0;

    switch (event.detail) {
      case 1:
        this._onSingleClick(event);
        break;
      case 2:
        this._onDoubleClick(event);
        break;
      case 3:
        this._onTripleClick(event);
        break;
      default: break;
    }

    this._addMouseDownListeners();
    this.refresh(true);
  }

  public enable(): void {
    this._enabled = true;
  }

  // public get selectionText(): string {
  //   const start = this._model.finalSelectionStart;
  //   const end = this._model.finalSelectionEnd;
  //   if (!start || !end) {
  //     return '';
  //   }

  //   // Get first row
  //   const startRowEndCol = start[1] === end[1] ? end[0] : null;
  //   let result: string[] = [];
  //   result.push(this._buffer.translateBufferLineToString(start[1], true, start[0], startRowEndCol));

  //   // Get middle rows
  //   for (let i = start[1] + 1; i <= end[1] - 1; i++) {
  //     const bufferLine = this._buffer.lines.get(i);
  //     const lineText = this._buffer.translateBufferLineToString(i, true);
  //     if ((<any>bufferLine).isWrapped) {
  //       result[result.length - 1] += lineText;
  //     } else {
  //       result.push(lineText);
  //     }
  //   }

  //   // Get final row
  //   if (start[1] !== end[1]) {
  //     const bufferLine = this._buffer.lines.get(end[1]);
  //     const lineText = this._buffer.translateBufferLineToString(end[1], true, 0, end[0]);
  //     if ((<any>bufferLine).isWrapped) {
  //       result[result.length - 1] += lineText;
  //     } else {
  //       result.push(lineText);
  //     }
  //   }

  //   // Format string by replacing non-breaking space chars with regular spaces
  //   // and joining the array into a multi-line string.
  //   const formattedResult = result.map(line => {
  //     return line.replace(ALL_NON_BREAKING_SPACE_REGEX, ' ');
  //   }).join(Browser.isMSWindows ? '\r\n' : '\n');

  //   return formattedResult;
  // }

  public refresh(isNewSelection?: boolean): void {
    // Queue the refresh for the renderer
    if (!this._refreshAnimationFrame) {
      this._refreshAnimationFrame = window.requestAnimationFrame(() => this._refresh());
      // console.log(this.selectionText);
    }

    // If the platform is Linux and the refresh call comes from a mouse event,
    // we need to update the selection for middle click to paste selection.
    if (Browser.isLinux && isNewSelection) {
      // const selectionText = this.selectionText;
      // if (selectionText.length) {
        // this.emit('newselection', this.selectionText);
      this.emit('newselection', this.selectionText);
      // }
    }
  }

  // private _getWordAt(coords: [number, number], allowWhitespaceOnlySelection: boolean): IWordPosition {
  //   // Ensure coords are within viewport (eg. not within scroll bar)
  //   if (coords[0] >= this._terminal.cols) {
  //     return null;
  //   }

  //   const bufferLine = this._buffer.lines.get(coords[1]);
  //   if (!bufferLine) {
  //     return null;
  //   }

  //   const line = this._buffer.translateBufferLineToString(coords[1], false);

  //   // Get actual index, taking into consideration wide characters
  //   let startIndex = this._convertViewportColToCharacterIndex(bufferLine, coords);
  //   let endIndex = startIndex;

  //   // Record offset to be used later
  //   const charOffset = coords[0] - startIndex;
  //   let leftWideCharCount = 0;
  //   let rightWideCharCount = 0;
  //   let leftLongCharOffset = 0;
  //   let rightLongCharOffset = 0;

  //   if (line.charAt(startIndex) === ' ') {
  //     // Expand until non-whitespace is hit
  //     while (startIndex > 0 && line.charAt(startIndex - 1) === ' ') {
  //       startIndex--;
  //     }
  //     while (endIndex < line.length && line.charAt(endIndex + 1) === ' ') {
  //       endIndex++;
  //     }
  //   } else {
  //     // Expand until whitespace is hit. This algorithm works by scanning left
  //     // and right from the starting position, keeping both the index format
  //     // (line) and the column format (bufferLine) in sync. When a wide
  //     // character is hit, it is recorded and the column index is adjusted.
  //     let startCol = coords[0];
  //     let endCol = coords[0];

  //     // Consider the initial position, skip it and increment the wide char
  //     // variable
  //     if (bufferLine[startCol][CHAR_DATA_WIDTH_INDEX] === 0) {
  //       leftWideCharCount++;
  //       startCol--;
  //     }
  //     if (bufferLine[endCol][CHAR_DATA_WIDTH_INDEX] === 2) {
  //       rightWideCharCount++;
  //       endCol++;
  //     }

  //     // Adjust the end index for characters whose length are > 1 (emojis)
  //     if (bufferLine[endCol][CHAR_DATA_CHAR_INDEX].length > 1) {
  //       rightLongCharOffset += bufferLine[endCol][CHAR_DATA_CHAR_INDEX].length - 1;
  //       endIndex += bufferLine[endCol][CHAR_DATA_CHAR_INDEX].length - 1;
  //     }

  //     // Expand the string in both directions until a space is hit
  //     while (startCol > 0 && startIndex > 0 && !this._isCharWordSeparator(bufferLine[startCol - 1])) {
  //       const char = bufferLine[startCol - 1];
  //       if (char[CHAR_DATA_WIDTH_INDEX] === 0) {
  //         // If the next character is a wide char, record it and skip the column
  //         leftWideCharCount++;
  //         startCol--;
  //       } else if (char[CHAR_DATA_CHAR_INDEX].length > 1) {
  //         // If the next character's string is longer than 1 char (eg. emoji),
  //         // adjust the index
  //         leftLongCharOffset += char[CHAR_DATA_CHAR_INDEX].length - 1;
  //         startIndex -= char[CHAR_DATA_CHAR_INDEX].length - 1;
  //       }
  //       startIndex--;
  //       startCol--;
  //     }
  //     while (endCol < bufferLine.length && endIndex + 1 < line.length && !this._isCharWordSeparator(bufferLine[endCol + 1])) {
  //       const char = bufferLine[endCol + 1];
  //       if (char[CHAR_DATA_WIDTH_INDEX] === 2) {
  //         // If the next character is a wide char, record it and skip the column
  //         rightWideCharCount++;
  //         endCol++;
  //       } else if (char[CHAR_DATA_CHAR_INDEX].length > 1) {
  //         // If the next character's string is longer than 1 char (eg. emoji),
  //         // adjust the index
  //         rightLongCharOffset += char[CHAR_DATA_CHAR_INDEX].length - 1;
  //         endIndex += char[CHAR_DATA_CHAR_INDEX].length - 1;
  //       }
  //       endIndex++;
  //       endCol++;
  //     }
  //   }

  //   // Incremenet the end index so it is at the start of the next character
  //   endIndex++;

  //   // Calculate the start _column_, converting the the string indexes back to
  //   // column coordinates.
  //   const start =
  //       startIndex // The index of the selection's start char in the line string
  //       + charOffset // The difference between the initial char's column and index
  //       - leftWideCharCount // The number of wide chars left of the initial char
  //       + leftLongCharOffset; // The number of additional chars left of the initial char added by columns with strings longer than 1 (emojis)

  //   // Calculate the length in _columns_, converting the the string indexes back
  //   // to column coordinates.
  //   const length = Math.min(this._terminal.cols, // Disallow lengths larger than the terminal cols
  //       endIndex // The index of the selection's end char in the line string
  //       - startIndex // The index of the selection's start char in the line string
  //       + leftWideCharCount // The number of wide chars left of the initial char
  //       + rightWideCharCount // The number of wide chars right of the initial char (inclusive)
  //       - leftLongCharOffset // The number of additional chars left of the initial char added by columns with strings longer than 1 (emojis)
  //       - rightLongCharOffset); // The number of additional chars right of the initial char (inclusive) added by columns with strings longer than 1 (emojis)

  //   if (!allowWhitespaceOnlySelection && line.slice(startIndex, endIndex).trim() === '') {
  //     return null;
  //   }

  //   return { start, length };
  // }

  // protected _selectWordAt(coords: [number, number, number]): void {
    // const wordPosition = this._getWordAt(coords, allowWhitespaceOnlySelection);
    // if (wordPosition) {
      // this._model.selectionStart = [wordPosition.start, coords[1]];
      // this._model.selectionStartLength = wordPosition.length;
    // }
  // }

  protected selectLineAt(line: number) {
    this._model.selectionStart = [line, 0, 0];
    this._model.selectionEnd = [line, this._buffer.lines[line].length - 1, this._terminal.cols];
  }

  private _initListeners(): void {
    this._mouseMoveListener = event => this._onMouseMove(event as MouseEvent);
    this._mouseUpListener = event => this._onMouseUp(event as MouseEvent);
  }

  private _onSingleClick(event: MouseEvent): void {
    this._model.selectionStartLength = 0;
    this._model.isSelectAllActive = false;
    this._activeSelectionMode = SelectionMode.NORMAL;

    // Initialize the new selection
    this._model.selectionStart = this._getMouseBufferCoords(event);
    this._model.selectionEnd = null;
  }

  private _onDoubleClick(event: MouseEvent): void {
    const coords = this._getMouseBufferCoords(event);
    if (coords) {
      this._activeSelectionMode = SelectionMode.WORD;
      const points = this._buffer.getSelectWord(coords);
      if (points) {
        this._model.selectionStart = [coords[0], coords[1], points.start];
        this._model.selectionEnd = [coords[0], coords[1], points.end];
      }
    }
  }

  private _onTripleClick(event: MouseEvent): void {
    const coords = this._getMouseBufferCoords(event);
    if (coords) {
      this._activeSelectionMode = SelectionMode.LINE;
      this.selectLineAt(coords[0]);
    }
  }

  private _addMouseDownListeners(): void {
    // Listen on the document so that dragging outside of viewport works
    this._terminal.element.ownerDocument.addEventListener('mousemove', this._mouseMoveListener);
    this._terminal.element.ownerDocument.addEventListener('mouseup', this._mouseUpListener);
    this._dragScrollIntervalTimer = setInterval(() => this._dragScroll(), DRAG_SCROLL_INTERVAL);
  }

  private _removeMouseDownListeners(): void {
    this._terminal.element.ownerDocument.removeEventListener('mousemove', this._mouseMoveListener);
    this._terminal.element.ownerDocument.removeEventListener('mouseup', this._mouseUpListener);
    clearInterval(this._dragScrollIntervalTimer);
    this._dragScrollIntervalTimer = null;
  }

  private _dragScroll(): void {
    if (this._dragScrollAmount) {
      this._terminal.viewport.scroll(this._dragScrollAmount);
      // reset the
      if (this._dragScrollAmount > 0) {
        const end = this._terminal.buffer.getEnd();
        this._model.selectionEnd = [end[0], end[1], this._terminal.cols];
      } else {
        const start = this._terminal.buffer.getStart();
        this._model.selectionEnd = [start[0], start[1], 0];
      }
      this.refresh();
    }
  }

  private _getMouseBufferCoords(event: MouseEvent): [number, number, number] {
    const coords = this._terminal.mouseHelper.getCoords(
      event,
      this._terminal.screenElement,
      this._terminal.buffer,
      this._charMeasure,
      this._terminal.options.lineHeight,
      this._terminal.cols,
      this._terminal.rows,
      this._terminal.options.padding,
      true,
    );
    if (!coords) {
      return null;
    }

    // Convert viewport coords to buffer coords
    // coords[1] += this._terminal.buffer.ydisp;
    return coords;
  }

  private _onMouseMove(event: MouseEvent): void {
    event.stopImmediatePropagation();

    const previousSelectionEnd = this._model.selectionEnd
      ? [this._model.selectionEnd[0], this._model.selectionEnd[1]] : null;

    this._model.selectionEnd = this._getMouseBufferCoords(event);

    this._dragScrollAmount = this._getMouseEventScrollAmount(event);
    this.refresh(true);
  }

  private _getMouseEventScrollAmount(event: MouseEvent): number {
    let offset = MouseHelper.GET_COORDS_RELATIVE_TO_ELEMENT(
      event, this._terminal.screenElement, this._terminal.options.padding,
    )[1];
    // const terminalHeight = this._terminal.rows * Math.ceil(this._charMeasure.height * this._terminal.options.lineHeight);
    const terminalHeight = this._terminal.renderer.dimensions.canvasHeight;
    if (offset >= 0 && offset <= terminalHeight) {
      return 0;
    }
    if (offset > terminalHeight) {
      offset -= terminalHeight;
    }

    offset = Math.min(Math.max(offset, -DRAG_SCROLL_MAX_THRESHOLD), DRAG_SCROLL_MAX_THRESHOLD);
    offset /= DRAG_SCROLL_MAX_THRESHOLD;

    return (offset / Math.abs(offset)) + Math.round(offset * (DRAG_SCROLL_MAX_SPEED - 1));
  }

  private _onMouseUp(event: MouseEvent): void {
    this._removeMouseDownListeners();
  }

  private _refresh(): void {
    this._refreshAnimationFrame = null;
    this.emit('refresh', { start: this._model.finalSelectionStart, end: this._model.finalSelectionEnd });
  }
}
