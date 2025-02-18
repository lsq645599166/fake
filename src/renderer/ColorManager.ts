import { IColor, IColorSet } from '../shared/Types';
import { ITheme } from '../Types';

const DEFAULT_FOREGROUND = fromHex('#ffffff');
const DEFAULT_BACKGROUND = fromHex('#000000');
const DEFAULT_SELECTION = {
  css: 'rgba(255, 255, 255, 0.3)',
  rgba: 0xFFFFFF77,
};

export const DEFAULT_ANSI_COLORS = (() => {
  const colors = [
    // dark:
    fromHex('#2e3436'),
    fromHex('#cc0000'),
    fromHex('#4e9a06'),
    fromHex('#c4a000'),
    fromHex('#3465a4'),
    fromHex('#75507b'),
    fromHex('#06989a'),
    fromHex('#d3d7cf'),
    // bright:
    fromHex('#555753'),
    fromHex('#ef2929'),
    fromHex('#8ae234'),
    fromHex('#fce94f'),
    fromHex('#729fcf'),
    fromHex('#ad7fa8'),
    fromHex('#34e2e2'),
    fromHex('#eeeeec'),
  ];

  // Fill in the remaining 240 ANSI colors.
  // Generate colors (16-231)
  const v = [0x00, 0x5f, 0x87, 0xaf, 0xd7, 0xff];
  for (let i = 0; i < 216; i += 1) {
    const r = v[(i / 36) % 6 | 0];
    const g = v[(i / 6) % 6 | 0];
    const b = v[i % 6];
    colors.push({
      css: `#${toPaddedHex(r)}${toPaddedHex(g)}${toPaddedHex(b)}`,
      // Use >>> 0 to force a conversion to an unsigned int
      rgba: ((r << 24) | (g << 16) | (b << 8) | 0xFF) >>> 0,
    });
  }

  // Generate greys (232-255)
  for (let i = 0; i < 24; i += 1) {
    const c = 8 + i * 10;
    const ch = toPaddedHex(c);
    colors.push({
      css: `#${ch}${ch}${ch}`,
      rgba: ((c << 24) | (c << 16) | (c << 8) | 0xFF) >>> 0,
    });
  }

  return colors;
})();

function fromHex(css: string): IColor {
  return {
    css,
    rgba: parseInt(css.slice(1), 16) << 8 | 0xFF,
  };
}

function toPaddedHex(c: number): string {
  const s = c.toString(16);

  return s.length < 2 ? `0${s}` : s;
}

export class ColorManager {
  public colors: IColorSet;

  constructor(document: Document) {
    this.colors = {
      foreground: DEFAULT_FOREGROUND,
      background: DEFAULT_BACKGROUND,
      selection: DEFAULT_SELECTION,
      ansi: DEFAULT_ANSI_COLORS.slice(),
    };
  }

  public setTheme(theme: ITheme): void {
    this.colors.foreground = this._parseColor(theme.foreground, DEFAULT_FOREGROUND);
    this.colors.background = this._parseColor(theme.background, DEFAULT_BACKGROUND);
    this.colors.selection = this._parseColor(theme.selection, DEFAULT_SELECTION);
    this.colors.ansi[0] = this._parseColor(theme.black, DEFAULT_ANSI_COLORS[0]);
    this.colors.ansi[1] = this._parseColor(theme.red, DEFAULT_ANSI_COLORS[1]);
    this.colors.ansi[2] = this._parseColor(theme.green, DEFAULT_ANSI_COLORS[2]);
    this.colors.ansi[3] = this._parseColor(theme.yellow, DEFAULT_ANSI_COLORS[3]);
    this.colors.ansi[4] = this._parseColor(theme.blue, DEFAULT_ANSI_COLORS[4]);
    this.colors.ansi[5] = this._parseColor(theme.magenta, DEFAULT_ANSI_COLORS[5]);
    this.colors.ansi[6] = this._parseColor(theme.cyan, DEFAULT_ANSI_COLORS[6]);
    this.colors.ansi[7] = this._parseColor(theme.white, DEFAULT_ANSI_COLORS[7]);
    this.colors.ansi[8] = this._parseColor(theme.brightBlack, DEFAULT_ANSI_COLORS[8]);
    this.colors.ansi[9] = this._parseColor(theme.brightRed, DEFAULT_ANSI_COLORS[9]);
    this.colors.ansi[10] = this._parseColor(theme.brightGreen, DEFAULT_ANSI_COLORS[10]);
    this.colors.ansi[11] = this._parseColor(theme.brightYellow, DEFAULT_ANSI_COLORS[11]);
    this.colors.ansi[12] = this._parseColor(theme.brightBlue, DEFAULT_ANSI_COLORS[12]);
    this.colors.ansi[13] = this._parseColor(theme.brightMagenta, DEFAULT_ANSI_COLORS[13]);
    this.colors.ansi[14] = this._parseColor(theme.brightCyan, DEFAULT_ANSI_COLORS[14]);
    this.colors.ansi[15] = this._parseColor(theme.brightWhite, DEFAULT_ANSI_COLORS[15]);
  }

  private _parseColor(
    css: string,
    fallback: IColor,
  ): IColor {
    if (!css) {
      return fallback;
    }

    return fromHex(css);
  }
}
