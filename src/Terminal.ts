import { Buffer } from './Buffer';
import { EventEmitter } from './EventEmitter';
import { copyHandler } from './handlers/Clipboard';
import { InputHandler } from './InputHandler';
import { Renderer } from './renderer/Renderer';
import { IRenderer } from './renderer/Types';
import { SelectionManager } from './SelectionManager';
import * as Browser from './shared/utils/Browser';
import { IBrowser, IBuffer, ITerminal, ITerminalOptions, IViewport } from './Types';
import { CharMeasure } from './utils/CharMeasure';
import { MouseHelper } from './utils/MouseHelper';
import { Viewport } from './Viewport';

const document = (typeof window !== 'undefined') ? window.document : null;

const WRITE_BATCH_SIZE = 300;

const DEFAULT_OPTIONS: ITerminalOptions = {
  padding: {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  fontFamily: 'monospace',
  fontSize: 14,
  lineHeight: 22,
  letterSpacing: 0,
  theme: {
    foreground: '#ffffff',
    background: '#000000',
  },
};

export default class Terminal extends EventEmitter implements ITerminal {

  public get rows(): number {
    return this._rows;
  }

  public set rows(newRow: number) {
    this.oldRows = this._rows;
    this._rows = newRow;
  }

  public get cols(): number {
    return this._cols;
  }

  public set cols(newCol: number) {
    this.oldCols = this._cols;
    this._cols = newCol;
  }

  public get isFocused(): boolean {
    return document.activeElement === this.textarea;
  }
  public charMeasure: CharMeasure;
  public element: HTMLElement;
  public options: ITerminalOptions;
  public renderer: IRenderer;
  public screenElement: HTMLElement;
  public textarea: HTMLTextAreaElement;
  public writeBuffer: Array<string>;
  public oldCols: number = 0;
  public oldRows: number = 0;
  public viewport: IViewport;
  public buffer: IBuffer;
  public selectionManager: SelectionManager;
  public scrollTop: number = 0;
  public mouseHelper: MouseHelper;
  public browser: IBrowser = Browser as any;

  private _cols: number = 0;
  private _rows: number = 0;
  private _document: Document;
  private _helperContainer: HTMLElement;
  private _inputHandler: InputHandler;
  private _parent!: HTMLElement;
  private _viewportElement: HTMLElement;
  private _viewportScrollArea: HTMLElement;
  private _writeInProgress: boolean;

  constructor(options: ITerminalOptions) {
    super();
    this.options = options; // clone the user options & set it to the terminal attr
    this._setup();
  }

  public dispose(): void {
    super.dispose();

    this.clear();
    this.write = () => {};  //  tslint:disable-line:no-empty
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this. _clearGlobal();
  }

  public destroy(): void {
    this.dispose();
  }

  public open(parent) {
    // if parent is not set, use the document.body
    this._parent = parent || this._parent;

    if (!this._parent) {
      throw new Error('Terminal requires a parent element.');
    }

    /*
     * init the dom tree
     * <div class="fake">
     *   <div class="fake-viewport"></div>
     *   <div class="fake-screen">
     *     <div class="fake-helpers">
     *       <textarea class="fake-helper-textarea"></textarea>
     *       <span class="fake-char-measure-element">W</span>
     *     </div>
     *     <canvas class="text-layer"></canvas>
     *     <canvas clsas="selection-layer"></canvas>
     *   </div>
     * </div>
     */

    this._document = this._parent.ownerDocument;

    this.element = this._document.createElement('div');
    this.element.dir = 'ltr';
    this.element.classList.add('fake');
    this.element.setAttribute('tabindex', '0');
    this._parent.appendChild(this.element);

    const fragment = document.createDocumentFragment();
    this._viewportElement = document.createElement('div');
    this._viewportElement.classList.add('fake-viewport');
    fragment.appendChild(this._viewportElement);
    this._viewportScrollArea = document.createElement('div');
    this._viewportScrollArea.classList.add('fake-scroll-area');
    this._viewportElement.style.background = this.options.theme.background;
    this._viewportElement.appendChild(this._viewportScrollArea);

    this.screenElement = document.createElement('div');
    this.screenElement.classList.add('fake-screen');
    this._helperContainer = document.createElement('div');
    this._helperContainer.classList.add('fake-helpers');
    this.screenElement.appendChild(this._helperContainer);
    fragment.appendChild(this.screenElement);

    this.textarea = document.createElement('textarea');
    this.textarea.classList.add('fake-helper-textarea');
    this.textarea.setAttribute('aria-multiline', 'false');
    this.textarea.setAttribute('autocorrect', 'off');
    this.textarea.setAttribute('autocapitalize', 'off');
    this.textarea.setAttribute('spellcheck', 'false');
    this.textarea.tabIndex = 0;
    this.textarea.addEventListener('focus', () => this._onTextAreaFocus());
    this._helperContainer.appendChild(this.textarea);

    this.element.appendChild(fragment);

    this.charMeasure = new CharMeasure(document, this._helperContainer);

    this.selectionManager = new SelectionManager(this, this.charMeasure);
    this.element.addEventListener('mousedown', (e: MouseEvent) => this.selectionManager.onMouseDown(e));

    this.selectionManager.on('refresh', (data) => {
      this.renderer.onSelectionChanged(data.start, data.end);
    });
    this.selectionManager.on('newselection', (text) => {
      this.textarea.focus();
    });

    this.charMeasure.measure(this.options);

    this.viewport = new Viewport(this, this._viewportElement, this._viewportScrollArea);

    this.renderer = new Renderer(this, this.options.theme);

    this.mouseHelper = new MouseHelper(this.renderer);

    this._initGlobal();

    this.bindMouse();

    this.on('scroll', () => {
      this.selectionManager.refresh();
    });

    this.charMeasure.on('charsizechanged', () => this._onResize());
  }

  public bindMouse(): void {
    const el = this.element;

    on(el, 'mousedown', (ev: MouseEvent) => {

      // Prevent the focus on the textarea from getting lost
      // and make sure we get focused on mousedown
      ev.preventDefault();
      this.focus();
    });
  }

  public focus(): void {
    if (this.textarea) {
      this.textarea.focus();
    }
  }

  public hasSelection(): boolean {
    return this.selectionManager ? this.selectionManager.hasSelection : false;
  }

  public write(data): void {
    if (!data) {
      return;
    }

    this.writeBuffer.push(data);

    if (!this._writeInProgress && this.writeBuffer.length > 0 && this.renderer) {
      // Kick off a write which will write all data in sequence recursively
      this._writeInProgress = true;
      // Kick off an async innerWrite so more writes can come in while processing data
      setTimeout(() => {
        this.innerWrite();
      });
    }
  }

  public writeln(data): void {
    this.write(`${data}\r\n`);
  }

  public scrollLines(): void {
    this.renderer.refreshRows();

    this.emit('scroll');
  }

  public clear(): void {
    this.buffer.clear();
    this.selectionManager.clear();

    this.scrollTop = 0;
    this.viewport.syncScrollArea();
    this.scrollLines();
  }

  protected innerWrite(): void {
    const writeBatch = this.writeBuffer.splice(0, WRITE_BATCH_SIZE);
    while (writeBatch.length > 0) {
      const data = writeBatch.shift();

      // deal with /r /n /r/n with the same way
      const blocks = data.split(/\r\n|\r|\n/);
      if (blocks.length && blocks[blocks.length - 1] === '') {
        blocks.pop();
      }

      for (const block of blocks) {
        this._inputHandler.parse(block);
      }
    }

    if (this.renderer) {
      this.viewport.syncScrollArea();
      this.renderer.refreshRows();
    }

    if (this.writeBuffer.length > 0) {
      // Allow renderer to catch up before processing the next batch
      setTimeout(() => this.innerWrite(), 0);
    } else {
      this._writeInProgress = false;
    }
  }

  private _setup(): void {
    // if attr in options is not set, set the attr value to the default
    Object.keys(DEFAULT_OPTIONS).forEach((key) => {
      if (this.options[key] == null) {
        this.options[key] = DEFAULT_OPTIONS[key];
      }
    });

    // if no parent element is set, use the body
    // if body is not set, use null
    this._parent = document ? document.body : null;

    this.writeBuffer = [];
    this._writeInProgress = false;

    this._inputHandler = new InputHandler(this);
    this.buffer = new Buffer(this);
  }

  private _onTextAreaFocus(): void {
    this.element.classList.add('focus');
    this.emit('focus');
  }

  private _onResize = () => {
    this.renderer.onResize();
    this.buffer.resize();
    this.viewport.syncScrollArea();
    this.renderer.refreshRows();
  }

  private _onContextMenu = (event) => {
    event.preventDefault();
  }

  private _onCopy = (event: ClipboardEvent) => {
    if (!this.hasSelection()) {
      return;
    }
    copyHandler(event, this, this.selectionManager);
  }

  private _initGlobal(): void {
    on(this.element, 'copy', this._onCopy);
    on(window, 'resize', this._onResize);
    on(this.element, 'contextmenu', this._onContextMenu);
  }

  private _clearGlobal(): void {
    remove(this.element, 'copy', this._onCopy);
    remove(window, 'resize', this._onResize);
    remove(this.element, 'contextmenu', this._onContextMenu);
  }
}

function globalOn(el: any, type: string, handler: (event: Event) => any, capture?: boolean): void {
  const elFinal = Array.isArray(el) ? el : [el];
  elFinal.forEach((element: HTMLElement) => {
    element.addEventListener(type, handler, capture || false);
  });
}

function globalRemove(el: any, type: string, handler: (event: Event) => any, capture?: boolean): void {
  const elFinal = Array.isArray(el) ? el : [el];
  elFinal.forEach((element: HTMLElement) => {
    element.removeEventListener(type, handler, capture || false);
  });
}
// TODO: Remove once everything is typed
const on = globalOn;
const remove = globalRemove;
