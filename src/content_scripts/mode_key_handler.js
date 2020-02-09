/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// Example key mapping (@keyMapping):
//   i:
//     command: "enterInsertMode", ... # This is a registryEntry object (as too are the other commands).
//   g:
//     g:
//       command: "scrollToTop", ...
//     t:
//       command: "nextTab", ...
//
// This key-mapping structure is generated by Commands.generateKeyStateMapping() and may be arbitrarily deep.
// Observe that @keyMapping["g"] is itself also a valid key mapping.  At any point, the key state (@keyState)
// consists of a (non-empty) list of such mappings.

class KeyHandlerMode extends Mode {
  setKeyMapping(keyMapping) { this.keyMapping = keyMapping; return this.reset(); }
  setPassKeys(passKeys) { this.passKeys = passKeys; return this.reset(); }
  // Only for tests.
  setCommandHandler(commandHandler) {
    this.commandHandler = commandHandler;
  }

  // Reset the key state, optionally retaining the count provided.
  reset(countPrefix) {
    if (countPrefix == null) { countPrefix = 0; }
    this.countPrefix = countPrefix;
    return this.keyState = [this.keyMapping];
  }

  constructor(options) {
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) { super(); }
      let thisFn = (() => { return this; }).toString();
      let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
      eval(`${thisName} = this;`);
    }
    this.commandHandler = options.commandHandler != null ? options.commandHandler : (function() {});
    this.setKeyMapping(options.keyMapping != null ? options.keyMapping : {});

    super(extend(options,
      {keydown: this.onKeydown.bind(this)})
    );

    if (options.exitOnEscape) {
      // If we're part way through a command's key sequence, then a first Escape should reset the key state,
      // and only a second Escape should actually exit this mode.
      this.push({
        _name: "key-handler-escape-listener",
        keydown: event => {
          if (KeyboardUtils.isEscape(event) && !this.isInResetState()) {
            this.reset();
            return this.suppressEvent;
          } else {
            return this.continueBubbling;
          }
        }
      });
    }
  }

  onKeydown(event) {
    const keyChar = KeyboardUtils.getKeyCharString(event);
    const isEscape = KeyboardUtils.isEscape(event);
    if (isEscape && ((this.countPrefix !== 0) || (this.keyState.length !== 1))) {
      return DomUtils.consumeKeyup(event, () => this.reset());
    // If the help dialog loses the focus, then Escape should hide it; see point 2 in #2045.
    } else if (isEscape && (typeof HelpDialog !== 'undefined' && HelpDialog !== null ? HelpDialog.isShowing() : undefined)) {
      HelpDialog.toggle();
      return this.suppressEvent;
    } else if (isEscape) {
      return this.continueBubbling;
    } else if (this.isMappedKey(keyChar)) {
      this.handleKeyChar(keyChar);
      return this.suppressEvent;
    } else if (this.isCountKey(keyChar)) {
      const digit = parseInt(keyChar);
      this.reset(this.keyState.length === 1 ? (this.countPrefix * 10) + digit : digit);
      return this.suppressEvent;
    } else {
      if (keyChar) { this.reset(); }
      return this.continueBubbling;
    }
  }

  // This tests whether there is a mapping of keyChar in the current key state (and accounts for pass keys).
  isMappedKey(keyChar) {
    return ((Array.from(this.keyState).filter((mapping) => keyChar in mapping))[0] != null) && !this.isPassKey(keyChar);
  }

  // This tests whether keyChar is a digit (and accounts for pass keys).
  isCountKey(keyChar) {
    return keyChar && ((0 < this.countPrefix ? '0' : '1') <= keyChar && keyChar <= '9') && !this.isPassKey(keyChar);
  }

  // Keystrokes are *never* considered pass keys if the user has begun entering a command.  So, for example, if
  // 't' is a passKey, then the "t"-s of 'gt' and '99t' are neverthless handled as regular keys.
  isPassKey(keyChar) {
    // Find all *continuation* mappings for keyChar in the current key state (i.e. not the full key mapping).
    const mappings = (Array.from(this.keyState).filter((mapping) => keyChar in mapping && (mapping !== this.keyMapping)));
    // If there are no continuation mappings, and there's no count prefix, and keyChar is a pass key, then
    // it's a pass key.
    return (mappings.length === 0) && (this.countPrefix === 0) && Array.from(this.passKeys != null ? this.passKeys : "").includes(keyChar);
  }

  isInResetState() {
    return (this.countPrefix === 0) && (this.keyState.length === 1);
  }

  handleKeyChar(keyChar) {
    bgLog(`handle key ${keyChar} (${this.name})`);
    // A count prefix applies only so long a keyChar is mapped in @keyState[0]; e.g. 7gj should be 1j.
    if (!(keyChar in this.keyState[0])) { this.countPrefix = 0; }
    // Advance the key state.  The new key state is the current mappings of keyChar, plus @keyMapping.
    this.keyState = [...Array.from(((Array.from(this.keyState).filter((mapping) => keyChar in mapping).map((mapping) => mapping[keyChar])))), this.keyMapping];
    if (this.keyState[0].command != null) {
      const command = this.keyState[0];
      const count = 0 < this.countPrefix ? this.countPrefix : 1;
      bgLog(`  invoke ${command.command} count=${count} `);
      this.reset();
      this.commandHandler({command, count});
      if ((this.options.count != null) && (--this.options.count <= 0)) { this.exit(); }
    }
    return this.suppressEvent;
  }
}

const root = typeof exports !== 'undefined' && exports !== null ? exports : (window.root != null ? window.root : (window.root = {}));
root.KeyHandlerMode = KeyHandlerMode;
if (typeof exports === 'undefined' || exports === null) { extend(window, root); }
