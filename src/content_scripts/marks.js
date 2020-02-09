/* eslint-disable
    consistent-return,
    max-len,
    no-nested-ternary,
    no-return-assign,
    no-undef,
    no-useless-escape,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

const Marks = {
  previousPositionRegisters: ['`', "'"],
  localRegisters: {},
  currentRegistryEntry: null,
  mode: null,

  exit(continuation = null) {
    if (this.mode != null) {
      this.mode.exit();
    }
    this.mode = null;
    return (typeof continuation === 'function' ? continuation() : undefined);
  },

  // This returns the key which is used for storing mark locations in localStorage.
  getLocationKey(keyChar) {
    return `vimiumMark|${window.location.href.split('#')[0]}|${keyChar}`;
  },

  getMarkString() {
    return JSON.stringify({ scrollX: window.scrollX, scrollY: window.scrollY, hash: window.location.hash });
  },

  setPreviousPosition() {
    const markString = this.getMarkString();
    return Array.from(this.previousPositionRegisters).map((reg) => (this.localRegisters[reg] = markString));
  },

  showMessage(message, keyChar) {
    return HUD.showForDuration(`${message} \"${keyChar}\".`, 1000);
  },

  // If <Shift> is depressed, then it's a global mark, otherwise it's a local mark.  This is consistent
  // vim's [A-Z] for global marks and [a-z] for local marks.  However, it also admits other non-Latin
  // characters.  The exceptions are "`" and "'", which are always considered local marks.
  // The "swap" command option inverts global and local marks.
  isGlobalMark(event, keyChar) {
    let {
      shiftKey,
    } = event;
    if (this.currentRegistryEntry.options.swap) { shiftKey = !shiftKey; }
    return shiftKey && !Array.from(this.previousPositionRegisters).includes(keyChar);
  },

  activateCreateMode(count, { registryEntry }) {
    this.currentRegistryEntry = registryEntry;
    return this.mode = new Mode({
      name: 'create-mark',
      indicator: 'Create mark...',
      exitOnEscape: true,
      suppressAllKeyboardEvents: true,
      keydown: (event) => {
        if (KeyboardUtils.isPrintable(event)) {
          const keyChar = KeyboardUtils.getKeyChar(event);
          this.exit(() => {
            if (this.isGlobalMark(event, keyChar)) {
              // We record the current scroll position, but only if this is the top frame within the tab.
              // Otherwise, we'll fetch the scroll position of the top frame from the background page later.
              let scrollX; let
                scrollY;
              if (DomUtils.isTopFrame()) { [scrollX, scrollY] = Array.from([window.scrollX, window.scrollY]); }
              return chrome.runtime.sendMessage({
                handler: 'createMark',
                markName: keyChar,
                scrollX,
                scrollY,
              },
              () => this.showMessage('Created global mark', keyChar));
            }
            localStorage[this.getLocationKey(keyChar)] = this.getMarkString();
            return this.showMessage('Created local mark', keyChar);
          });
          return handlerStack.suppressEvent;
        }
      },
    });
  },

  activateGotoMode(count, { registryEntry }) {
    this.currentRegistryEntry = registryEntry;
    return this.mode = new Mode({
      name: 'goto-mark',
      indicator: 'Go to mark...',
      exitOnEscape: true,
      suppressAllKeyboardEvents: true,
      keydown: (event) => {
        if (KeyboardUtils.isPrintable(event)) {
          this.exit(() => {
            const keyChar = KeyboardUtils.getKeyChar(event);
            if (this.isGlobalMark(event, keyChar)) {
              // This key must match @getLocationKey() in the back end.
              const key = `vimiumGlobalMark|${keyChar}`;
              return Settings.storage.get(key, (items) => {
                if (key in items) {
                  chrome.runtime.sendMessage({ handler: 'gotoMark', markName: keyChar });
                  return HUD.showForDuration(`Jumped to global mark '${keyChar}'`, 1000);
                }
                return HUD.showForDuration(`Global mark not set '${keyChar}'`, 1000);
              });
            }
            const markString = this.localRegisters[keyChar] != null ? this.localRegisters[keyChar] : localStorage[this.getLocationKey(keyChar)];
            if (markString != null) {
              this.setPreviousPosition();
              const position = JSON.parse(markString);
              if (position.hash && (position.scrollX === 0) && (position.scrollY === 0)) {
                window.location.hash = position.hash;
              } else {
                window.scrollTo(position.scrollX, position.scrollY);
              }
              return this.showMessage('Jumped to local mark', keyChar);
            }
            return this.showMessage('Local mark not set', keyChar);
          });
          return handlerStack.suppressEvent;
        }
      },
    });
  },
};

const root = typeof exports !== 'undefined' && exports !== null ? exports : (window.root != null ? window.root : (window.root = {}));
root.Marks = Marks;
if (typeof exports === 'undefined' || exports === null) { extend(window, root); }
