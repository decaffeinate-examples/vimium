/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS104: Avoid inline assignments
 * DS204: Change includes calls to have a more natural evaluation order
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

class InsertMode extends Mode {
  static initClass() {
  
    // Static stuff. This allows PostFindMode to suppress the permanently-installed InsertMode instance.
    this.suppressedEvent = null;
  }
  constructor(options) {
    // There is one permanently-installed instance of InsertMode.  It tracks focus changes and
    // activates/deactivates itself (by setting @insertModeLock) accordingly.
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) { super(); }
      let thisFn = (() => { return this; }).toString();
      let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
      eval(`${thisName} = this;`);
    }
    if (options == null) { options = {}; }
    this.permanent = options.permanent;

    // If truthy, then we were activated by the user (with "i").
    this.global = options.global;

    const handleKeyEvent = event => {
      let needle;
      if (!this.isActive(event)) { return this.continueBubbling; }

      // See comment here: https://github.com/philc/vimium/commit/48c169bd5a61685bb4e67b1e76c939dbf360a658.
      const activeElement = this.getActiveElement();
      if ((activeElement === document.body) && activeElement.isContentEditable) { return this.passEventToPage; }

      // Check for a pass-next-key key.
      if ((needle = KeyboardUtils.getKeyCharString(event), Array.from(Settings.get("passNextKeyKeys")).includes(needle))) {
        new PassNextKeyMode;

      } else if ((event.type === 'keydown') && KeyboardUtils.isEscape(event)) {
        if (DomUtils.isFocusable(activeElement)) { activeElement.blur(); }
        if (!this.permanent) { this.exit(); }

      } else {
        return this.passEventToPage;
      }

      return this.suppressEvent;
    };

    const defaults = {
      name: "insert",
      indicator: !this.permanent && !Settings.get("hideHud")  ? "Insert mode" : undefined,
      keypress: handleKeyEvent,
      keydown: handleKeyEvent
    };

    super(extend(defaults, options));

    // Only for tests.  This gives us a hook to test the status of the permanently-installed instance.
    if (this.permanent) { InsertMode.permanentInstance = this; }
  }

  isActive(event) {
    if (event === InsertMode.suppressedEvent) { return false; }
    if (this.global) { return true; }
    return DomUtils.isFocusable(this.getActiveElement());
  }

  getActiveElement() {
    let {
      activeElement
    } = document;
    while (__guard__(activeElement != null ? activeElement.shadowRoot : undefined, x => x.activeElement)) {
      ({
        activeElement
      } = activeElement.shadowRoot);
    }
    return activeElement;
  }
  static suppressEvent(event) { return this.suppressedEvent = event; }
}
InsertMode.initClass();

// This implements the pasNexKey command.
class PassNextKeyMode extends Mode {
  constructor(count) {
    if (count == null) { count = 1; }
    let seenKeyDown = false;
    let keyDownCount = 0;

    super({
      name: "pass-next-key",
      indicator: "Pass next key.",
      // We exit on blur because, once we lose the focus, we can no longer track key events.
      exitOnBlur: window,
      keypress: () => {
        return this.passEventToPage;
      },

      keydown: () => {
        seenKeyDown = true;
        keyDownCount += 1;
        return this.passEventToPage;
      },

      keyup: () => {
        if (seenKeyDown) {
          if (!(0 < --keyDownCount)) {
            if (!(0 < --count)) {
              this.exit();
            }
          }
        }
        return this.passEventToPage;
      }
    });
  }
}

const root = typeof exports !== 'undefined' && exports !== null ? exports : (window.root != null ? window.root : (window.root = {}));
root.InsertMode = InsertMode;
root.PassNextKeyMode = PassNextKeyMode;
if (typeof exports === 'undefined' || exports === null) { extend(window, root); }

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}