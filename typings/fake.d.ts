declare module 'fakejs' {
  export interface ITerminalOptions {
    padding?: IPadding;
    fontFamily?: string;
    fontSize?: number;
    lineHeight?: number;
    letterSpacing?: number;
    theme?: ITheme;
  }

  export interface IPadding {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
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

  export class Terminal {
    any: any
  }
}