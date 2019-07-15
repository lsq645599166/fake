import { Disposable } from './common/Lifecycle';
import { IEventEmitter, XtermListener } from './Types';

export class EventEmitter extends Disposable implements IEventEmitter {
  private _events: {[type: string]: Array<XtermListener>};

  constructor() {
    super();
    this._events = this._events || {};
  }

  public on(type: string, listener): void {
    this._events[type] = this._events[type] || [];
    this._events[type].push(listener);
  }

  public emit(type: string, ...args: Array<any>): void {
    if (!this._events[type]) {
      return;
    }
    const obj = this._events[type];
    for (const item of obj) {
      item.apply(this, args);
    }
  }

  public dispose(): void {
    super.dispose();
    this._events = {};
  }
}
