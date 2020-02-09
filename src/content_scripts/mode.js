/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
//
// A mode implements a number of keyboard (and possibly other) event handlers which are pushed onto the handler
// stack when the mode is activated, and popped off when it is deactivated.  The Mode class constructor takes a
// single argument "options" which can define (amongst other things):
//
// name:
//   A name for this mode.
//
// keydown:
// keypress:
// keyup:
//   Key handlers.  Optional: provide these as required.  The default is to continue bubbling all key events.
//
// Further options are described in the constructor, below.
//
// Additional handlers associated with a mode can be added by using the push method.  For example, if a mode
// responds to "focus" events, then push an additional handler:
//   @push
//     "focus": (event) => ....
// Such handlers are removed when the mode is deactivated.
//
// The following events can be handled:
//   keydown, keypress, keyup, click, focus and blur

// Debug only.
let count = 0;

class Mode {
  static initClass() {
    // If Mode.debug is true, then we generate a trace of modes being activated and deactivated on the console.
    this.debug = false;
    this.modes = [];
  
    // Constants; short, readable names for the return values expected by handlerStack.bubbleEvent.
    this.prototype.continueBubbling = handlerStack.continueBubbling;
    this.prototype.suppressEvent = handlerStack.suppressEvent;
    this.prototype.passEventToPage = handlerStack.passEventToPage;
    this.prototype.suppressPropagation = handlerStack.suppressPropagation;
    this.prototype.restartBubbling = handlerStack.restartBubbling;
  
    this.prototype.alwaysContinueBubbling = handlerStack.alwaysContinueBubbling;
    this.prototype.alwaysSuppressPropagation = handlerStack.alwaysSuppressPropagation;
  }

  constructor(options) {
    if (options == null) { options = {}; }
    this.options = options;
    this.handlers = [];
    this.exitHandlers = [];
    this.modeIsActive = true;
    this.modeIsExiting = false;
    this.name = this.options.name || "anonymous";

    this.count = ++count;
    this.id = `${this.name}-${this.count}`;
    this.log("activate:", this.id);

    // If options.suppressAllKeyboardEvents is truthy, then all keyboard events are suppressed.  This avoids
    // the need for modes which suppress all keyboard events 1) to provide handlers for all of those events,
    // or 2) to worry about event suppression and event-handler return values.
    if (this.options.suppressAllKeyboardEvents) {
      for (var type of [ "keydown", "keypress" ]) {
        ((handler) => {
          return this.options[type] = event => this.alwaysSuppressPropagation(() => (typeof handler === 'function' ? handler(event) : undefined));
        })(this.options[type]);
      }
    }

    this.push({
      keydown: this.options.keydown || null,
      keypress: this.options.keypress || null,
      keyup: this.options.keyup || null,
      indicator: () => {
        // Update the mode indicator.  Setting @options.indicator to a string shows a mode indicator in the
        // HUD.  Setting @options.indicator to 'false' forces no mode indicator.  If @options.indicator is
        // undefined, then the request propagates to the next mode.
        // The active indicator can also be changed with @setIndicator().
        if (this.options.indicator != null) {
          if (this.options.indicator) { HUD.show(this.options.indicator); } else { HUD.hide(true, false); }
          return this.passEventToPage;
        } else { return this.continueBubbling; }
      }
    });

    // If @options.exitOnEscape is truthy, then the mode will exit when the escape key is pressed.
    if (this.options.exitOnEscape) {
      // Note. This handler ends up above the mode's own key handlers on the handler stack, so it takes
      // priority.
      this.push({
        _name: `mode-${this.id}/exitOnEscape`,
        "keydown": event => {
          if (!KeyboardUtils.isEscape(event)) { return this.continueBubbling; }
          this.exit(event, event.target);
          return this.suppressEvent;
        }
      });
    }

    // If @options.exitOnBlur is truthy, then it should be an element.  The mode will exit when that element
    // loses the focus.
    if (this.options.exitOnBlur) {
      this.push({
        _name: `mode-${this.id}/exitOnBlur`,
        "blur": event => this.alwaysContinueBubbling(() => { if (event.target === this.options.exitOnBlur) { return this.exit(event); } })
      });
    }

    // If @options.exitOnClick is truthy, then the mode will exit on any click event.
    if (this.options.exitOnClick) {
      this.push({
        _name: `mode-${this.id}/exitOnClick`,
        "click": event => this.alwaysContinueBubbling(() => this.exit(event))
      });
    }

    //If @options.exitOnFocus is truthy, then the mode will exit whenever a focusable element is activated.
    if (this.options.exitOnFocus) {
      this.push({
        _name: `mode-${this.id}/exitOnFocus`,
        "focus": event => this.alwaysContinueBubbling(() => {
          if (DomUtils.isFocusable(event.target)) { return this.exit(event); }
        })
      });
    }

    // If @options.exitOnScroll is truthy, then the mode will exit on any scroll event.
    if (this.options.exitOnScroll) {
      this.push({
        _name: `mode-${this.id}/exitOnScroll`,
        "scroll": event => this.alwaysContinueBubbling(() => this.exit(event))
      });
    }

    // Some modes are singletons: there may be at most one instance active at any time.  A mode is a singleton
    // if @options.singleton is set.  The value of @options.singleton should be the key which is intended to be
    // unique.  New instances deactivate existing instances with the same key.
    if (this.options.singleton) {
      const singletons = Mode.singletons || (Mode.singletons = {});
      const key = this.options.singleton;
      this.onExit(() => delete singletons[key]);
      if (singletons[key] != null) {
        singletons[key].exit();
      }
      singletons[key] = this;
    }

    // if @options.suppressTrailingKeyEvents is set, then  -- on exit -- we suppress all key events until a
    // subsquent (non-repeat) keydown or keypress.  In particular, the intention is to catch keyup events for
    // keys which we have handled, but which otherwise might trigger page actions (if the page is listening for
    // keyup events).
    if (this.options.suppressTrailingKeyEvents) {
      this.onExit(function() {
        const handler = function(event) {
          if (event.repeat) {
            return handlerStack.suppressEvent;
          } else {
            this.remove();
            return handlerStack.continueBubbling;
          }
        };

        return handlerStack.push({
          name: "suppress-trailing-key-events",
          keydown: handler,
          keypress: handler
        });
      });
    }

    Mode.modes.push(this);
    this.setIndicator();
    this.logModes();
  }
    // End of Mode constructor.

  setIndicator(indicator) {
    if (indicator == null) { ({
      indicator
    } = this.options); }
    this.options.indicator = indicator;
    return Mode.setIndicator();
  }

  static setIndicator() {
    return handlerStack.bubbleEvent("indicator");
  }

  push(handlers) {
    if (!handlers._name) { handlers._name = `mode-${this.id}`; }
    return this.handlers.push(handlerStack.push(handlers));
  }

  unshift(handlers) {
    if (!handlers._name) { handlers._name = `mode-${this.id}`; }
    return this.handlers.push(handlerStack.unshift(handlers));
  }

  onExit(handler) {
    return this.exitHandlers.push(handler);
  }

  exit(...args) {
    if (this.modeIsExiting || !this.modeIsActive) { return; }
    this.log("deactivate:", this.id);
    this.modeIsExiting = true;

    for (let handler of Array.from(this.exitHandlers)) { handler(...Array.from(args || [])); }
    for (let handlerId of Array.from(this.handlers)) { handlerStack.remove(handlerId); }
    Mode.modes = Mode.modes.filter(mode => mode !== this);

    this.modeIsActive = false;
    return this.setIndicator();
  }

  // Debugging routines.
  logModes() {
    if (Mode.debug) {
      this.log("active modes (top to bottom):");
      return Array.from(Mode.modes.slice().reverse()).map((mode) => this.log(" ", mode.id));
    }
  }

  log(...args) {
    if (Mode.debug) { return console.log(...Array.from(args || [])); }
  }

  // For tests only.
  static top() {
    return this.modes[this.modes.length-1];
  }

  // For tests only.
  static reset() {
    for (let mode of Array.from(this.modes)) { mode.exit(); }
    return this.modes = [];
  }
}
Mode.initClass();

class SuppressAllKeyboardEvents extends Mode {
  constructor(options) {
    if (options == null) { options = {}; }
    const defaults = {
      name: "suppressAllKeyboardEvents",
      suppressAllKeyboardEvents: true
    };
    super(extend(defaults, options));
  }
}

class CacheAllKeydownEvents extends SuppressAllKeyboardEvents {
  constructor(options) {
    let keydownEvents;
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) { super(); }
      let thisFn = (() => { return this; }).toString();
      let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
      eval(`${thisName} = this;`);
    }
    if (options == null) { options = {}; }
    this.keydownEvents = (keydownEvents = []);
    const defaults = {
      name: "cacheAllKeydownEvents",
      keydown(event) { return keydownEvents.push(event); }
    };
    super(extend(defaults, options));
  }

  replayKeydownEvents() {
    return Array.from(this.keydownEvents).map((event) => handlerStack.bubbleEvent("keydown", event));
  }
}

const root = typeof exports !== 'undefined' && exports !== null ? exports : (window.root != null ? window.root : (window.root = {}));
extend(root, {Mode, SuppressAllKeyboardEvents, CacheAllKeydownEvents});
if (typeof exports === 'undefined' || exports === null) { extend(window, root); }
