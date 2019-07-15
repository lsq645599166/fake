import { wcwidth } from './CharWidth';
import { IChar, IInputHandler } from './Types';

function rgx(tmplObj, ...subst) {
  // Use the 'raw' value so we don't have to double backslash in a template string
  const regexText: string = tmplObj.raw[0];

  // Remove white-space and comments
  const wsrgx = /^\s+|\s+\n|\s+#[\s\S]+?\n/gm;
  const txt2 = regexText.replace(wsrgx, '');

  return new RegExp(txt2, 'm');
}

export class InputHandler implements IInputHandler {
  private _bright: boolean;
  private _fg: number;
  private _bg: number;
  private _buffer: string;
  private _sgrRegex: RegExp;

  constructor(private _terminal: any) {
    this._bright = false;
    this._fg = this._bg = 256;

    this._buffer = '';
  }

  public parse(data: string): void {
    const pkt = this._buffer + data;
    this._buffer = '';

    const rawTextPkts = pkt.split(/\x1B\[/);

    if (rawTextPkts.length === 1) {
      rawTextPkts.push('');
    }

    this._handleIncompleteSequences(rawTextPkts);

    const firstChunk = this._withState(rawTextPkts.shift());

    const len = rawTextPkts.length;
    const blocks = [];

    for (let i = 0; i < len; i += 1) {
      blocks[i] = this._processAnsi(rawTextPkts[i]);
      // blocks[i].text = this._oldEscapeForHtml(blocks[i].text);
      // blocks[i] = this._formatter.transform(this._processAnsi(rawTextPkts[i]), this);
    }

    blocks.unshift(firstChunk);

    const result = [];
    for (const block of blocks) {
      const text = block.text;

      for (let j = 0; j < text.length; j += 1) {
        // const width = wcwidth(text.charCodeAt(j));
        // if (width === 0) {
          // continue;
        // }
        // [char, fg, bg, width]
        result.push([
          text[j],
          block.fg,
          block.bg,
          wcwidth(text.charCodeAt(j)),
        ]);
      }
    }

    this._terminal.buffer.append(result);
  }

  private _detectIncompleteAnsi(txt: string): boolean {
    // Scan forwards for a potential command character
    // If one exists, we must assume we are good
    // [\x40-\x7e])               # the command

    return !(/.*?[\x40-\x7e]/.test(txt));
  }

  private _handleIncompleteSequences(chunks: Array<string>): void {
    let lastChunk = chunks[chunks.length - 1];

    // - incomplete ANSI sequence
    if (lastChunk.length > 0 && this._detectIncompleteAnsi(lastChunk)) {
      this._buffer = `\x1B[${lastChunk}`;
      chunks.pop();
      chunks.push('');
    } else {
      // - incomplete ESC
      if (lastChunk.slice(-1) === '\x1B') {
        this._buffer = '\x1B';
        chunks.pop();
        chunks.push(lastChunk.substr(0, lastChunk.length - 1));
      }

      // - Incomplete ESC, only one packet
      if (chunks.length === 2 &&
        chunks[1] === '' &&
        chunks[0].slice(-1) === '\x1B') {
        this._buffer = '\x1B';
        lastChunk = chunks.shift();
        chunks.unshift(lastChunk.substr(0, lastChunk.length - 1));
      }
    }
  }

  private _oldEscapeForHtml(txt: string): string {
    return txt.replace(/[&<>]/gm, (str) => {
      if (str === '&') { return '&amp;'; }
      if (str === '<') { return '&lt;'; }
      if (str === '>') { return '&gt;'; }
    });
  }

  private _processAnsi(block: string): IChar {
    if (!this._sgrRegex) {
      // This regex is designed to parse an ANSI terminal CSI command. To be more specific,
      // we follow the XTERM conventions vs. the various other "standards".
      // http://invisible-island.net/xterm/ctlseqs/ctlseqs.html
      //
      this._sgrRegex = rgx`
        ^                    # beginning of line
        ([!\x3c-\x3f]?)      # a private-mode char (!, <, =, >, ?)
        ([\d;]*)             # any digits or semicolons
        ([\x20-\x2f]?        # an intermediate modifier
        [\x40-\x7e])         # the command
        ([\s\S]*)            # any text following this CSI sequence
      `;
    }

    const matches = block.match(this._sgrRegex);

    // The regex should have handled all cases!
    if (!matches) {
      return this._withState(block);
    }

    const origTxt = matches[4];

    if (matches[1] !== '' || matches[3] !== 'm') {
      return this._withState(origTxt);
    }

    // Ok - we have a valid "SGR" (Select Graphic Rendition)

    const sgrCmds = matches[2].split(';');

    // Each of these params affects the SGR state

    // Why do we shift through the array instead of a forEach??
    // ... because some commands consume the params that follow !
    while (sgrCmds.length > 0) {
      const sgrCmdStr = sgrCmds.shift();
      const num = parseInt(sgrCmdStr, 10);

      if (isNaN(num) || num === 0) {
        this._fg = this._bg = 256;
        this._bright = false;
      } else if (num === 1) {
        this._bright = true;
      } else if (num === 22) {
        this._bright = false;
      } else if (num === 39) {
        this._fg = 256;
      } else if (num === 49) {
        this._bg = 256;
      } else if ((num >= 30) && (num < 38)) {
        const bidx = this._bright ? 1 : 0;
        this._fg = bidx * 8 + num - 30;
        // this._fg = this._ansiColors[bidx][(num - 30)];
      } else if ((num >= 90) && (num < 98)) {
        this._fg = 8 + num - 90;
        // this._fg = this._ansiColors[1][(num - 90)];
      } else if ((num >= 40) && (num < 48)) {
        this._bg = num - 40;
        // this._bg = this._ansiColors[0][(num - 40)];
      } else if ((num >= 100) && (num < 108)) {
        this._bg = 8 + num - 100;
        // this._bg = this._ansiColors[1][(num - 100)];
      } else if (num === 38 || num === 48) {

        // extended set foreground/background color

        // validate that param exists
        if (sgrCmds.length > 0) {
          // extend color (38=fg, 48=bg)
          const isForeground = (num === 38);

          const modeCmd = sgrCmds.shift();

          // MODE '5' - 256 color palette
          if (modeCmd === '5' && sgrCmds.length > 0) {
            const paletteIndex = parseInt(sgrCmds.shift(), 10);
            if (paletteIndex >= 0 && paletteIndex <= 255) {
              if (isForeground) {
                this._fg = paletteIndex;
              } else {
                this._bg = paletteIndex;
              }
            }
          }

          // MODE '2' - True Color
          // if (modeCmd === '2' && sgrCmds.length > 2) {
          //   const r = parseInt(sgrCmds.shift(), 10);
          //   const g = parseInt(sgrCmds.shift(), 10);
          //   const b = parseInt(sgrCmds.shift(), 10);

          //   if ((r >= 0 && r <= 255) && (g >= 0 && g <= 255) && (b >= 0 && b <= 255)) {
          //     // const c = { rgb: [r,g,b], class_name: 'truecolor'};
          //     const c = `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`;
          //     if (isForeground)
          //       this._fg = c;
          //     else
          //       this._bg = c;
          //   }
          // }
        }
      }
    }

    return this._withState(origTxt);
  }

  private _withState(text: string): IChar {
    return {
      bright: this._bright,
      fg: this._fg,
      bg: this._bg,
      text,
    };
  }
}
