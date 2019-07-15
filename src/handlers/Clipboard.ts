import { ISelectionManager, ITerminal } from '../Types';

interface IWindow extends Window {
  clipboardData?: {
    getData(format: string): string;
    setData(format: string, data: string): void;
  };
}

declare var window: IWindow;

export function copyHandler(ev: ClipboardEvent, term: ITerminal, selectionManager: ISelectionManager): void {
  if (term.browser.isMSIE) {
    window.clipboardData.setData('Text', selectionManager.selectionText);
  } else {
    ev.clipboardData.setData('text/plain', selectionManager.selectionText);
  }

  // Prevent or the original text will be copied.
  ev.preventDefault();
}
