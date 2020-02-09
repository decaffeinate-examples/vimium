/* eslint-disable
    consistent-return,
    func-names,
    max-len,
    no-loop-func,
    no-multi-assign,
    no-multi-str,
    no-new,
    no-param-reassign,
    no-plusplus,
    no-restricted-syntax,
    no-return-assign,
    no-sequences,
    no-shadow,
    no-undef,
    no-unused-vars,
    no-use-before-define,
    no-useless-concat,
    no-useless-escape,
    no-var,
    vars-on-top,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS104: Avoid inline assignments
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let commandCount;
window.vimiumDomTestsAreRunning = true;

// Install frontend event handlers.
HUD.init();
Frame.registerFrameId({ chromeFrameId: 0 });

const getSelection = () => window.getSelection().toString();

let commandName = (commandCount = null);

// Some tests have side effects on the handler stack and the active mode, so these are reset on setup.  Also,
// some tests affect the focus (e.g. Vomnibar tests), so we make sure the window has the focus.
const initializeModeState = function () {
  window.focus();
  Mode.reset();
  handlerStack.reset();
  const normalMode = installModes();
  normalMode.setPassKeys('p');
  normalMode.setKeyMapping({
    m: { options: {}, command: 'm' }, // A mapped key.
    p: { options: {}, command: 'p' }, // A pass key.
    z: {
      p: { options: {}, command: 'zp' },
    },
  }); // Not a pass key.
  normalMode.setCommandHandler(({ command, count }) => {
    let ref;
    return [commandName, commandCount] = Array.from(ref = [command.command, count]), ref;
  });
  commandName = (commandCount = null);
  return normalMode; // Return this.
};

// Tell Settings that it's been loaded.
Settings.isLoaded = true;

// Shoulda.js doesn't support async code, so we try not to use any.
Utils.nextTick = (func) => func();

//
// Retrieve the hint markers as an array object.
//
const getHintMarkers = () => Array.prototype.slice.call(document.getElementsByClassName('vimiumHintMarker'), 0);

const stubSettings = (key, value) => stub(Settings.cache, key, JSON.stringify(value));

HintCoordinator.sendMessage = function (name, request) {
  if (request == null) { request = {}; } if (typeof HintCoordinator[name] === 'function') {
    HintCoordinator[name](request);
  } return request;
};
const activateLinkHintsMode = function () {
  HintCoordinator.getHintDescriptors({ modeIndex: 0 });
  return HintCoordinator.activateMode({ hintDescriptors: {}, modeIndex: 0, originatingFrameId: frameId });
};

//
// Generate tests that are common to both default and filtered
// link hinting modes.
//
const createGeneralHintTests = function (isFilteredMode) {
  window.vimiumOnClickAttributeName = 'does-not-matter';

  return context('Link hints',

    setup(() => {
      initializeModeState();
      const testContent = '<a>test</a><a>tress</a>';
      document.getElementById('test-div').innerHTML = testContent;
      stubSettings('filterLinkHints', isFilteredMode);
      stubSettings('linkHintCharacters', 'ab');
      stubSettings('linkHintNumbers', '12');
      return stub(window, 'windowIsFocused', () => true);
    }),

    tearDown(() => document.getElementById('test-div').innerHTML = ''),

    should('create hints when activated, discard them when deactivated', () => {
      const linkHints = activateLinkHintsMode();
      assert.isFalse((linkHints.hintMarkerContainingDiv == null));
      linkHints.deactivateMode();
      return assert.isTrue((linkHints.hintMarkerContainingDiv == null));
    }),

    should('position items correctly', () => {
      const assertStartPosition = function (element1, element2) {
        assert.equal(element1.getClientRects()[0].left, element2.getClientRects()[0].left);
        return assert.equal(element1.getClientRects()[0].top, element2.getClientRects()[0].top);
      };
      stub(document.body.style, 'position', 'static');
      let linkHints = activateLinkHintsMode();
      let hintMarkers = getHintMarkers();
      assertStartPosition(document.getElementsByTagName('a')[0], hintMarkers[0]);
      assertStartPosition(document.getElementsByTagName('a')[1], hintMarkers[1]);
      linkHints.deactivateMode();
      stub(document.body.style, 'position', 'relative');
      linkHints = activateLinkHintsMode();
      hintMarkers = getHintMarkers();
      assertStartPosition(document.getElementsByTagName('a')[0], hintMarkers[0]);
      assertStartPosition(document.getElementsByTagName('a')[1], hintMarkers[1]);
      return linkHints.deactivateMode();
    }));
};

createGeneralHintTests(false);
createGeneralHintTests(true);

context('False positives in link-hint',

  setup(() => {
    const testContent = '<span class="buttonWrapper">false positive<a>clickable</a></span><span class="buttonWrapper">clickable</span>';
    document.getElementById('test-div').innerHTML = testContent;
    stubSettings('filterLinkHints', true);
    stubSettings('linkHintNumbers', '12');
    return stub(window, 'windowIsFocused', () => true);
  }),

  tearDown(() => document.getElementById('test-div').innerHTML = ''),

  should('handle false positives', () => {
    const linkHints = activateLinkHintsMode();
    const hintMarkers = getHintMarkers();
    linkHints.deactivateMode();
    assert.equal(2, hintMarkers.length);
    return Array.from(hintMarkers).map((hintMarker) => assert.equal('clickable', hintMarker.linkText));
  }));

context('jsaction matching',

  setup(function () {
    stubSettings('filterLinkHints', true);
    const testContent = '<p id="test-paragraph">clickable</p>';
    document.getElementById('test-div').innerHTML = testContent;
    return this.element = document.getElementById('test-paragraph');
  }),

  tearDown(() => document.getElementById('test-div').innerHTML = ''),

  should('select jsaction elements', function () {
    return (() => {
      const result = [];
      for (const text of ['click:namespace.actionName', 'namespace.actionName']) {
        this.element.setAttribute('jsaction', text);
        const linkHints = activateLinkHintsMode();
        const hintMarkers = getHintMarkers().filter((marker) => marker.linkText !== 'Frame.');
        linkHints.deactivateMode();
        assert.equal(1, hintMarkers.length);
        assert.equal('clickable', hintMarkers[0].linkText);
        result.push(assert.equal(this.element, hintMarkers[0].localHintDescriptor.element));
      }
      return result;
    })();
  }),

  should('not select inactive jsaction elements', function () {
    return (() => {
      const result = [];
      for (const text of ['mousedown:namespace.actionName', 'click:namespace._', 'none', 'namespace:_']) {
        this.element.setAttribute('jsaction', text);
        const linkHints = activateLinkHintsMode();
        const hintMarkers = getHintMarkers().filter((marker) => marker.linkText !== 'Frame.');
        linkHints.deactivateMode();
        result.push(assert.equal(0, hintMarkers.length));
      }
      return result;
    })();
  }));

const sendKeyboardEvent = function (key, type, extra) {
  if (type == null) { type = 'keydown'; }
  if (extra == null) { extra = {}; }
  return handlerStack.bubbleEvent(type, extend(extra, {
    type,
    key,
    preventDefault() {},
    stopImmediatePropagation() {},
  }));
};

const sendKeyboardEvents = (keys) => Array.from(keys.split('')).map((key) => sendKeyboardEvent(key));

const inputs = [];
context('Test link hints for focusing input elements correctly',

  setup(() => {
    let input;
    initializeModeState();
    const testDiv = document.getElementById('test-div');
    testDiv.innerHTML = '';

    stubSettings('filterLinkHints', false);
    stubSettings('linkHintCharacters', 'ab');

    // Every HTML5 input type except for hidden. We should be able to activate all of them with link hints.
    //
    // TODO: Re-insert "color" into the inputTypes list when PhantomJS issue #13979 is fixed and integrated.
    // Ref: https://github.com/ariya/phantomjs/issues/13979, and Vimium #1944.
    const inputTypes = ['button', 'checkbox', 'date', 'datetime', 'datetime-local', 'email', 'file',
      'image', 'month', 'number', 'password', 'radio', 'range', 'reset', 'search', 'submit', 'tel', 'text',
      'time', 'url', 'week'];

    for (const type of Array.from(inputTypes)) {
      input = document.createElement('input');
      input.type = type;
      testDiv.appendChild(input);
      inputs.push(input);
    }

    // Manually add also a select element to test focus.
    input = document.createElement('select');
    testDiv.appendChild(input);
    return inputs.push(input);
  }),

  tearDown(() => document.getElementById('test-div').innerHTML = ''),

  should('Focus each input when its hint text is typed', () => (() => {
    const result = [];
    for (var input of Array.from(inputs)) {
      input.scrollIntoView(); // Ensure the element is visible so we create a link hint for it.

      const activeListener = ensureCalled((event) => {
        if (event.type === 'focus') { return input.blur(); }
      });
      input.addEventListener('focus', activeListener, false);
      input.addEventListener('click', activeListener, false);

      activateLinkHintsMode();
      const [hint] = Array.from(getHintMarkers().filter((hint) => input === HintCoordinator.getLocalHintMarker(hint.hintDescriptor).element));
      for (const char of Array.from(hint.hintString)) { sendKeyboardEvent(char); }

      input.removeEventListener('focus', activeListener, false);
      result.push(input.removeEventListener('click', activeListener, false));
    }
    return result;
  })()));

context('Test link hints for changing mode',

  setup(function () {
    initializeModeState();
    const testDiv = document.getElementById('test-div');
    testDiv.innerHTML = '<a>link</a>';
    return this.linkHints = activateLinkHintsMode();
  }),

  tearDown(function () {
    document.getElementById('test-div').innerHTML = '';
    return this.linkHints.deactivateMode();
  }),

  should('change mode on shift', function () {
    assert.equal('curr-tab', this.linkHints.mode.name);
    sendKeyboardEvent('Shift', 'keydown');
    assert.equal('bg-tab', this.linkHints.mode.name);
    sendKeyboardEvent('Shift', 'keyup');
    return assert.equal('curr-tab', this.linkHints.mode.name);
  }),

  should('change mode on ctrl', function () {
    assert.equal('curr-tab', this.linkHints.mode.name);
    sendKeyboardEvent('Control', 'keydown');
    assert.equal('fg-tab', this.linkHints.mode.name);
    sendKeyboardEvent('Control', 'keyup');
    return assert.equal('curr-tab', this.linkHints.mode.name);
  }));

context('Alphabetical link hints',

  setup(function () {
    initializeModeState();
    stubSettings('filterLinkHints', false);
    stubSettings('linkHintCharacters', 'ab');
    stub(window, 'windowIsFocused', () => true);

    document.getElementById('test-div').innerHTML = '';
    // Three hints will trigger double hint chars.
    createLinks(3);
    return this.linkHints = activateLinkHintsMode();
  }),

  tearDown(function () {
    this.linkHints.deactivateMode();
    return document.getElementById('test-div').innerHTML = '';
  }),

  should('label the hints correctly', () => {
    const hintMarkers = getHintMarkers();
    const expectedHints = ['aa', 'b', 'ab'];
    assert.equal(3, hintMarkers.length);
    return Array.from(expectedHints).map((hint, i) => assert.equal(hint, hintMarkers[i].hintString));
  }),

  should('narrow the hints', () => {
    const hintMarkers = getHintMarkers();
    sendKeyboardEvent('a');
    assert.equal('none', hintMarkers[1].style.display);
    return assert.equal('', hintMarkers[0].style.display);
  }),

  should('generate the correct number of alphabet hints', () => {
    const alphabetHints = new AlphabetHints();
    return (() => {
      const result = [];
      for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
        const hintStrings = alphabetHints.hintStrings(n);
        result.push(assert.equal(n, hintStrings.length));
      }
      return result;
    })();
  }),

  should('generate non-overlapping alphabet hints', () => {
    const alphabetHints = new AlphabetHints();
    return (() => {
      const result = [];
      for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
        var hintStrings = alphabetHints.hintStrings(n);
        result.push(Array.from(hintStrings).map((h1) => (() => {
          const result1 = [];
          for (const h2 of Array.from(hintStrings)) {
            if (h1 !== h2) {
              result1.push(assert.isFalse(h1.indexOf(h2) === 0));
            } else {
              result1.push(undefined);
            }
          }
          return result1;
        })()));
      }
      return result;
    })();
  }));

context('Filtered link hints',
  // Note.  In all of these tests, the order of the elements returned by getHintMarkers() may be different from
  // the order they are listed in the test HTML content.  This is because LinkHints.activateMode() sorts the
  // elements.

  setup(() => {
    stubSettings('filterLinkHints', true);
    stubSettings('linkHintNumbers', '0123456789');
    return stub(window, 'windowIsFocused', () => true);
  }),

  context('Text hints',

    setup(function () {
      initializeModeState();
      const testContent = "<a>test</a><a>tress</a><a>trait</a><a>track<img alt='alt text'/></a>";
      document.getElementById('test-div').innerHTML = testContent;
      return this.linkHints = activateLinkHintsMode();
    }),

    tearDown(function () {
      document.getElementById('test-div').innerHTML = '';
      return this.linkHints.deactivateMode();
    }),

    should('label the hints', () => {
      const hintMarkers = getHintMarkers();
      const expectedMarkers = [1, 2, 3, 4].map((m) => m.toString());
      const actualMarkers = [0, 1, 2, 3].map((i) => hintMarkers[i].textContent.toLowerCase());
      assert.equal(expectedMarkers.length, actualMarkers.length);
      return Array.from(expectedMarkers).map((marker) => assert.isTrue(Array.from(actualMarkers).includes(marker)));
    }),

    should('narrow the hints', () => {
      const hintMarkers = getHintMarkers();
      sendKeyboardEvent('t');
      sendKeyboardEvent('r');
      assert.equal('none', hintMarkers[0].style.display);
      assert.equal('3', hintMarkers[1].hintString);
      assert.equal('', hintMarkers[1].style.display);
      sendKeyboardEvent('a');
      return assert.equal('1', hintMarkers[3].hintString);
    }),

    // This test is the same as above, but with an extra non-matching character.  The effect should be the
    // same.
    should('narrow the hints and ignore typing mistakes', () => {
      const hintMarkers = getHintMarkers();
      sendKeyboardEvent('t');
      sendKeyboardEvent('r');
      sendKeyboardEvent('x');
      assert.equal('none', hintMarkers[0].style.display);
      assert.equal('3', hintMarkers[1].hintString);
      assert.equal('', hintMarkers[1].style.display);
      sendKeyboardEvent('a');
      return assert.equal('1', hintMarkers[3].hintString);
    })),

  context('Image hints',

    setup(function () {
      initializeModeState();
      const testContent = '<a><img alt=\'alt text\'/></a><a><img alt=\'alt text\' title=\'some title\'/></a> \
<a><img title=\'some title\'/></a>' + "<a><img src='' width='320px' height='100px'/></a>";
      document.getElementById('test-div').innerHTML = testContent;
      return this.linkHints = activateLinkHintsMode();
    }),

    tearDown(function () {
      document.getElementById('test-div').innerHTML = '';
      return this.linkHints.deactivateMode();
    }),

    should('label the images', () => {
      let hintMarkers = getHintMarkers().map((marker) => marker.textContent.toLowerCase());
      // We don't know the actual hint numbers which will be assigned, so we replace them with "N".
      hintMarkers = hintMarkers.map((str) => str.replace(/^[1-4]/, 'N'));
      assert.equal(4, hintMarkers.length);
      assert.isTrue(Array.from(hintMarkers).includes('N: alt text'));
      assert.isTrue(Array.from(hintMarkers).includes('N: some title'));
      assert.isTrue(Array.from(hintMarkers).includes('N: alt text'));
      return assert.isTrue(Array.from(hintMarkers).includes('N'));
    })),

  context('Input hints',

    setup(function () {
      initializeModeState();
      const testContent = '<input type=\'text\' value=\'some value\'/><input type=\'password\' value=\'some value\'/> \
<textarea>some text</textarea><label for=\'test-input\'/>a label</label> \
<input type=\'text\' id=\'test-input\' value=\'some value\'/> \
<label for=\'test-input-2\'/>a label: </label><input type=\'text\' id=\'test-input-2\' value=\'some value\'/>';
      document.getElementById('test-div').innerHTML = testContent;
      return this.linkHints = activateLinkHintsMode();
    }),

    tearDown(function () {
      document.getElementById('test-div').innerHTML = '';
      return this.linkHints.deactivateMode();
    }),

    should('label the input elements', () => {
      let hintMarkers = getHintMarkers();
      hintMarkers = getHintMarkers().map((marker) => marker.textContent.toLowerCase());
      // We don't know the actual hint numbers which will be assigned, so we replace them with "N".
      hintMarkers = hintMarkers.map((str) => str.replace(/^[0-9]+/, 'N'));
      assert.equal(5, hintMarkers.length);
      assert.isTrue(Array.from(hintMarkers).includes('N'));
      assert.isTrue(Array.from(hintMarkers).includes('N'));
      assert.isTrue(Array.from(hintMarkers).includes('N: a label'));
      assert.isTrue(Array.from(hintMarkers).includes('N: a label'));
      return assert.isTrue(Array.from(hintMarkers).includes('N'));
    })),

  context('Text hint scoring',

    setup(function () {
      initializeModeState();
      const testContent = [
        { id: 0, text: 'the xboy stood on the xburning deck' }, // Noise.
        { id: 1, text: 'the boy stood on the xburning deck' }, // Whole word (boy).
        { id: 2, text: 'on the xboy stood the xburning deck' }, // Start of text (on).
        { id: 3, text: 'the xboy stood on the xburning deck' }, // Noise.
        { id: 4, text: 'the xboy stood on the xburning deck' }, // Noise.
        { id: 5, text: 'the xboy stood on the xburning' }, // Shortest text..
        { id: 6, text: 'the xboy stood on the burning xdeck' }, // Start of word (bu)
        { id: 7, text: 'test abc one - longer' }, // For tab test - 2.
        { id: 8, text: 'test abc one' }, // For tab test - 1.
        { id: 9, text: 'test abc one - longer still' }, // For tab test - 3.
      ].map(({ id, text }) => `<a id=\"${id}\">${text}</a>`).join(' ');
      document.getElementById('test-div').innerHTML = testContent;
      this.linkHints = activateLinkHintsMode();
      return this.getActiveHintMarker = function () {
        return HintCoordinator.getLocalHintMarker(this.linkHints.markerMatcher.activeHintMarker.hintDescriptor).element.id;
      };
    }),

    tearDown(function () {
      document.getElementById('test-div').innerHTML = '';
      return this.linkHints.deactivateMode();
    }),

    should('score start-of-word matches highly', function () {
      sendKeyboardEvents('bu');
      return assert.equal('6', this.getActiveHintMarker());
    }),

    should('score start-of-text matches highly (br)', function () {
      sendKeyboardEvents('on');
      return assert.equal('2', this.getActiveHintMarker());
    }),

    should('score whole-word matches highly', function () {
      sendKeyboardEvents('boy');
      return assert.equal('1', this.getActiveHintMarker());
    }),

    should('score shorter texts more highly', function () {
      sendKeyboardEvents('stood');
      return assert.equal('5', this.getActiveHintMarker());
    }),

    should('use tab to select the active hint', function () {
      sendKeyboardEvents('abc');
      assert.equal('8', this.getActiveHintMarker());
      sendKeyboardEvent('Tab', 'keydown');
      assert.equal('7', this.getActiveHintMarker());
      sendKeyboardEvent('Tab', 'keydown');
      return assert.equal('9', this.getActiveHintMarker());
    })));

context('Input focus',

  setup(() => {
    initializeModeState();
    const testContent = '<input type=\'text\' id=\'first\'/><input style=\'display:none;\' id=\'second\'/> \
<input type=\'password\' id=\'third\' value=\'some value\'/>';
    return document.getElementById('test-div').innerHTML = testContent;
  }),

  tearDown(() => document.getElementById('test-div').innerHTML = ''),

  should('focus the first element', () => {
    NormalModeCommands.focusInput(1);
    return assert.equal('first', document.activeElement.id);
  }),

  should('focus the nth element', () => {
    NormalModeCommands.focusInput(100);
    return assert.equal('third', document.activeElement.id);
  }),

  should('activate insert mode on the first element', () => {
    NormalModeCommands.focusInput(1);
    return assert.isTrue(InsertMode.permanentInstance.isActive());
  }),

  should('activate insert mode on the first element', () => {
    NormalModeCommands.focusInput(100);
    return assert.isTrue(InsertMode.permanentInstance.isActive());
  }),

  should('activate the most recently-selected input if the count is 1', () => {
    NormalModeCommands.focusInput(3);
    NormalModeCommands.focusInput(1);
    return assert.equal('third', document.activeElement.id);
  }),

  should('not trigger insert if there are no inputs', () => {
    document.getElementById('test-div').innerHTML = '';
    NormalModeCommands.focusInput(1);
    return assert.isFalse(InsertMode.permanentInstance.isActive());
  }));

// TODO: these find prev/next link tests could be refactored into unit tests which invoke a function which has
// a tighter contract than goNext(), since they test minor aspects of goNext()'s link matching behavior, and we
// don't need to construct external state many times over just to test that.
// i.e. these tests should look something like:
// assert.equal(findLink(html("<a href=...">))[0].href, "first")
// These could then move outside of the dom_tests file.
context('Find prev / next links',

  setup(() => {
    initializeModeState();
    return window.location.hash = '';
  }),

  should('find exact matches', () => {
    document.getElementById('test-div').innerHTML = `\
<a href='#first'>nextcorrupted</a>
<a href='#second'>next page</a>\
`;
    stubSettings('nextPatterns', 'next');
    NormalModeCommands.goNext();
    return assert.equal('#second', window.location.hash);
  }),

  should('match against non-word patterns', () => {
    document.getElementById('test-div').innerHTML = '\
<a href=\'#first\'>&gt;&gt;</a>\
';
    stubSettings('nextPatterns', '>>');
    NormalModeCommands.goNext();
    return assert.equal('#first', window.location.hash);
  }),

  should('favor matches with fewer words', () => {
    document.getElementById('test-div').innerHTML = `\
<a href='#first'>lorem ipsum next</a>
<a href='#second'>next!</a>\
`;
    stubSettings('nextPatterns', 'next');
    NormalModeCommands.goNext();
    return assert.equal('#second', window.location.hash);
  }),

  should('find link relation in header', () => {
    document.getElementById('test-div').innerHTML = '\
<link rel=\'next\' href=\'#first\'>\
';
    NormalModeCommands.goNext();
    return assert.equal('#first', window.location.hash);
  }),

  should('favor link relation to text matching', () => {
    document.getElementById('test-div').innerHTML = `\
<link rel='next' href='#first'>
<a href='#second'>next</a>\
`;
    NormalModeCommands.goNext();
    return assert.equal('#first', window.location.hash);
  }),

  should('match mixed case link relation', () => {
    document.getElementById('test-div').innerHTML = '\
<link rel=\'Next\' href=\'#first\'>\
';
    NormalModeCommands.goNext();
    return assert.equal('#first', window.location.hash);
  }));

var createLinks = (n) => (() => {
  const result = [];
  for (let i = 0, end = n; i < end; i++) {
    const link = document.createElement('a');
    link.textContent = 'test';
    result.push(document.getElementById('test-div').appendChild(link));
  }
  return result;
})();

context('Key mapping',
  setup(function () {
    this.normalMode = initializeModeState();
    this.handlerCalled = false;
    this.handlerCalledCount = 0;
    return this.normalMode.setCommandHandler(({ count }) => {
      this.handlerCalled = true;
      return this.handlerCalledCount = count;
    });
  }),

  should('recognize first mapped key', function () {
    return assert.isTrue(this.normalMode.isMappedKey('m'));
  }),

  should('recognize second mapped key', function () {
    assert.isFalse(this.normalMode.isMappedKey('p'));
    sendKeyboardEvent('z');
    return assert.isTrue(this.normalMode.isMappedKey('p'));
  }),

  should('recognize pass keys', function () {
    return assert.isTrue(this.normalMode.isPassKey('p'));
  }),

  should('not mis-recognize pass keys', function () {
    assert.isFalse(this.normalMode.isMappedKey('p'));
    sendKeyboardEvent('z');
    return assert.isTrue(this.normalMode.isMappedKey('p'));
  }),

  should('recognize initial count keys', function () {
    assert.isTrue(this.normalMode.isCountKey('1'));
    return assert.isTrue(this.normalMode.isCountKey('9'));
  }),

  should("not recognize '0' as initial count key", function () {
    return assert.isFalse(this.normalMode.isCountKey('0'));
  }),

  should('recognize subsequent count keys', function () {
    sendKeyboardEvent('1');
    assert.isTrue(this.normalMode.isCountKey('0'));
    return assert.isTrue(this.normalMode.isCountKey('9'));
  }),

  should('set and call command handler', function () {
    sendKeyboardEvent('m');
    return assert.isTrue(this.handlerCalled);
  }),

  should('not call command handler for pass keys', function () {
    sendKeyboardEvent('p');
    return assert.isFalse(this.handlerCalled);
  }),

  should('accept a count prefix with a single digit', function () {
    sendKeyboardEvent('2');
    sendKeyboardEvent('m');
    return assert.equal(2, this.handlerCalledCount);
  }),

  should('accept a count prefix with multiple digits', function () {
    sendKeyboardEvent('2');
    sendKeyboardEvent('0');
    sendKeyboardEvent('m');
    return assert.equal(20, this.handlerCalledCount);
  }),

  should('cancel a count prefix', function () {
    sendKeyboardEvent('2');
    sendKeyboardEvent('z');
    sendKeyboardEvent('m');
    return assert.equal(1, this.handlerCalledCount);
  }),

  should('accept a count prefix for multi-key command mappings', function () {
    sendKeyboardEvent('5');
    sendKeyboardEvent('z');
    sendKeyboardEvent('p');
    return assert.equal(5, this.handlerCalledCount);
  }),

  should('cancel a key prefix', function () {
    sendKeyboardEvent('z');
    sendKeyboardEvent('m');
    return assert.equal(1, this.handlerCalledCount);
  }),

  should('cancel a count prefix after a prefix key', function () {
    sendKeyboardEvent('2');
    sendKeyboardEvent('z');
    sendKeyboardEvent('m');
    return assert.equal(1, this.handlerCalledCount);
  }),

  should('cancel a prefix key on escape', function () {
    sendKeyboardEvent('z');
    sendKeyboardEvent('Escape', 'keydown');
    sendKeyboardEvent('p');
    return assert.equal(0, this.handlerCalledCount);
  }));

context('Normal mode',
  setup(() => initializeModeState()),

  should('invoke commands for mapped keys', () => {
    sendKeyboardEvent('m');
    return assert.equal('m', commandName);
  }),

  should('invoke commands for mapped keys with a mapped prefix', () => {
    sendKeyboardEvent('z');
    sendKeyboardEvent('m');
    return assert.equal('m', commandName);
  }),

  should('invoke commands for mapped keys with an unmapped prefix', () => {
    sendKeyboardEvent('a');
    sendKeyboardEvent('m');
    return assert.equal('m', commandName);
  }),

  should('not invoke commands for pass keys', () => {
    sendKeyboardEvent('p');
    return assert.equal(null, commandName);
  }),

  should('not invoke commands for pass keys with an unmapped prefix', () => {
    sendKeyboardEvent('a');
    sendKeyboardEvent('p');
    return assert.equal(null, commandName);
  }),

  should('invoke commands for pass keys with a count', () => {
    sendKeyboardEvent('1');
    sendKeyboardEvent('p');
    return assert.equal('p', commandName);
  }),

  should('invoke commands for pass keys with a key queue', () => {
    sendKeyboardEvent('z');
    sendKeyboardEvent('p');
    return assert.equal('zp', commandName);
  }),

  should('default to a count of 1', () => {
    sendKeyboardEvent('m');
    return assert.equal(1, commandCount);
  }),

  should('accept count prefixes of length 1', () => {
    sendKeyboardEvent('2');
    sendKeyboardEvent('m');
    return assert.equal(2, commandCount);
  }),

  should('accept count prefixes of length 2', () => {
    sendKeyboardEvents('12');
    sendKeyboardEvent('m');
    return assert.equal(12, commandCount);
  }),

  should('get the correct count for mixed inputs (single key)', () => {
    sendKeyboardEvent('2');
    sendKeyboardEvent('z');
    sendKeyboardEvent('m');
    return assert.equal(1, commandCount);
  }),

  should('get the correct count for mixed inputs (multi key)', () => {
    sendKeyboardEvent('2');
    sendKeyboardEvent('z');
    sendKeyboardEvent('p');
    return assert.equal(2, commandCount);
  }),

  should('get the correct count for mixed inputs (multi key, duplicates)', () => {
    sendKeyboardEvent('2');
    sendKeyboardEvent('z');
    sendKeyboardEvent('z');
    sendKeyboardEvent('p');
    return assert.equal(1, commandCount);
  }),

  should('get the correct count for mixed inputs (with leading mapped keys)', () => {
    sendKeyboardEvent('z');
    sendKeyboardEvent('2');
    sendKeyboardEvent('m');
    return assert.equal(2, commandCount);
  }),

  should('get the correct count for mixed inputs (with leading unmapped keys)', () => {
    sendKeyboardEvent('a');
    sendKeyboardEvent('2');
    sendKeyboardEvent('m');
    return assert.equal(2, commandCount);
  }),

  should('not get a count after unmapped keys', () => {
    sendKeyboardEvent('2');
    sendKeyboardEvent('a');
    sendKeyboardEvent('m');
    return assert.equal(1, commandCount);
  }),

  should('get the correct count after unmapped keys', () => {
    sendKeyboardEvent('2');
    sendKeyboardEvent('a');
    sendKeyboardEvent('3');
    sendKeyboardEvent('m');
    return assert.equal(3, commandCount);
  }),

  should('not handle unmapped keys', () => {
    sendKeyboardEvent('u');
    return assert.equal(null, commandCount);
  }));

context('Insert mode',
  setup(function () {
    initializeModeState();
    return this.insertMode = new InsertMode({ global: true });
  }),

  should('exit on escape', function () {
    assert.isTrue(this.insertMode.modeIsActive);
    sendKeyboardEvent('Escape', 'keydown');
    return assert.isFalse(this.insertMode.modeIsActive);
  }),

  should('resume normal mode after leaving insert mode', function () {
    assert.equal(null, commandCount);
    this.insertMode.exit();
    sendKeyboardEvent('m');
    return assert.equal(1, commandCount);
  }));

context('Triggering insert mode',
  setup(() => {
    initializeModeState();

    const testContent = '<input type=\'text\' id=\'first\'/> \
<input style=\'display:none;\' id=\'second\'/> \
<input type=\'password\' id=\'third\' value=\'some value\'/> \
<p id=\'fourth\' contenteditable=\'true\'/> \
<p id=\'fifth\'/>';
    return document.getElementById('test-div').innerHTML = testContent;
  }),

  tearDown(() => {
    if (document.activeElement != null) {
      document.activeElement.blur();
    }
    return document.getElementById('test-div').innerHTML = '';
  }),

  should('trigger insert mode on focus of text input', () => {
    assert.isFalse(InsertMode.permanentInstance.isActive());
    document.getElementById('first').focus();
    return assert.isTrue(InsertMode.permanentInstance.isActive());
  }),

  should('trigger insert mode on focus of password input', () => {
    assert.isFalse(InsertMode.permanentInstance.isActive());
    document.getElementById('third').focus();
    return assert.isTrue(InsertMode.permanentInstance.isActive());
  }),

  should('trigger insert mode on focus of contentEditable elements', () => {
    assert.isFalse(InsertMode.permanentInstance.isActive());
    document.getElementById('fourth').focus();
    return assert.isTrue(InsertMode.permanentInstance.isActive());
  }),

  should('not trigger insert mode on other elements', () => {
    assert.isFalse(InsertMode.permanentInstance.isActive());
    document.getElementById('fifth').focus();
    return assert.isFalse(InsertMode.permanentInstance.isActive());
  }));

// NOTE(philc): I'm disabling the caret and visual mode tests because I think they're fallen into disrepair, or
// we merged changes to master and neglected to update the tests. We should return to these and fix+re-enable
// them.

// context "Caret mode",
//   setup ->
//     document.getElementById("test-div").innerHTML = """
//     <p><pre>
//       It is an ancient Mariner,
//       And he stoppeth one of three.
//       By thy long grey beard and glittering eye,
//       Now wherefore stopp'st thou me?
//     </pre></p>
//     """
//     initializeModeState()
//     @initialVisualMode = new VisualMode

//   tearDown ->
//     document.getElementById("test-div").innerHTML = ""

//   should "enter caret mode", ->
//     assert.isFalse @initialVisualMode.modeIsActive
//     assert.equal "I", getSelection()

//   should "exit caret mode on escape", ->
//     sendKeyboardEvent "Escape", "keydown"
//     assert.equal "", getSelection()

//   should "move caret with l and h", ->
//     assert.equal "I", getSelection()
//     sendKeyboardEvent "l"
//     assert.equal "t", getSelection()
//     sendKeyboardEvent "h"
//     assert.equal "I", getSelection()

//   should "move caret with w and b", ->
//     assert.equal "I", getSelection()
//     sendKeyboardEvent "w"
//     assert.equal "i", getSelection()
//     sendKeyboardEvent "b"
//     assert.equal "I", getSelection()

//   should "move caret with e", ->
//     assert.equal "I", getSelection()
//     sendKeyboardEvent "e"
//     assert.equal " ", getSelection()
//     sendKeyboardEvent "e"
//     assert.equal " ", getSelection()

//   should "move caret with j and k", ->
//     assert.equal "I", getSelection()
//     sendKeyboardEvent "j"
//     assert.equal "A", getSelection()
//     sendKeyboardEvent "k"
//     assert.equal "I", getSelection()

//   should "re-use an existing selection", ->
//     assert.equal "I", getSelection()
//     sendKeyboardEvents "ww"
//     assert.equal "a", getSelection()
//     sendKeyboardEvent "Escape", "keydown"
//     new VisualMode
//     assert.equal "a", getSelection()

//   should "not move the selection on caret/visual mode toggle", ->
//     sendKeyboardEvents "ww"
//     assert.equal "a", getSelection()
//     for key in "vcvcvc".split()
//       sendKeyboardEvent key
//       assert.equal "a", getSelection()

// context "Visual mode",
//   setup ->
//     document.getElementById("test-div").innerHTML = """
//     <p><pre>
//       It is an ancient Mariner,
//       And he stoppeth one of three.
//       By thy long grey beard and glittering eye,
//       Now wherefore stopp'st thou me?
//     </pre></p>
//     """
//     initializeModeState()
//     @initialVisualMode = new VisualMode
//     sendKeyboardEvent "w"
//     sendKeyboardEvent "w"
//     # We should now be at the "a" of "an".
//     sendKeyboardEvent "v"

//   tearDown ->
//     document.getElementById("test-div").innerHTML = ""

//   should "select word with e", ->
//     assert.equal "a", getSelection()
//     sendKeyboardEvent "e"
//     assert.equal "an", getSelection()
//     sendKeyboardEvent "e"
//     assert.equal "an ancient", getSelection()

//   should "select opposite end of the selection with o", ->
//     assert.equal "a", getSelection()
//     sendKeyboardEvent "e"
//     assert.equal "an", getSelection()
//     sendKeyboardEvent "e"
//     assert.equal "an ancient", getSelection()
//     sendKeyboardEvents "ow"
//     assert.equal "ancient", getSelection()
//     sendKeyboardEvents "oe"
//     assert.equal "ancient Mariner", getSelection()

//   should "accept a count", ->
//     assert.equal "a", getSelection()
//     sendKeyboardEvents "2e"
//     assert.equal "an ancient", getSelection()

//   should "select a word", ->
//     assert.equal "a", getSelection()
//     sendKeyboardEvents "aw"
//     assert.equal "an", getSelection()

//   should "select a word with a count", ->
//     assert.equal "a", getSelection()
//     sendKeyboardEvents "2aw"
//     assert.equal "an ancient", getSelection()

//   should "select a word with a count", ->
//     assert.equal "a", getSelection()
//     sendKeyboardEvents "2aw"
//     assert.equal "an ancient", getSelection()

//   should "select to start of line", ->
//     assert.equal "a", getSelection()
//     sendKeyboardEvents "0"
//     assert.equal "It is", getSelection().trim()

//   should "select to end of line", ->
//     assert.equal "a", getSelection()
//     sendKeyboardEvents "$"
//     assert.equal "an ancient Mariner,", getSelection()

//   should "re-enter caret mode", ->
//     assert.equal "a", getSelection()
//     sendKeyboardEvents "cww"
//     assert.equal "M", getSelection()

context('Mode utilities',
  setup(() => {
    initializeModeState();

    const testContent = '<input type=\'text\' id=\'first\'/> \
<input style=\'display:none;\' id=\'second\'/> \
<input type=\'password\' id=\'third\' value=\'some value\'/>';
    return document.getElementById('test-div').innerHTML = testContent;
  }),

  tearDown(() => document.getElementById('test-div').innerHTML = ''),

  should('not have duplicate singletons', () => {
    let mode;
    let count = 0;

    class Test extends Mode {
      constructor() { count += 1; super({ singleton: 'test' }); }

      exit() { count -= 1; return super.exit(); }
    }

    assert.isTrue(count === 0);
    for (let i = 1; i <= 10; i++) {
      mode = new Test();
      assert.isTrue(count === 1);
    }

    mode.exit();
    return assert.isTrue(count === 0);
  }),

  should('exit on escape', () => {
    const test = new Mode({ exitOnEscape: true });

    assert.isTrue(test.modeIsActive);
    sendKeyboardEvent('Escape', 'keydown');
    return assert.isFalse(test.modeIsActive);
  }),

  should('not exit on escape if not enabled', () => {
    const test = new Mode({ exitOnEscape: false });

    assert.isTrue(test.modeIsActive);
    sendKeyboardEvent('Escape', 'keydown');
    return assert.isTrue(test.modeIsActive);
  }),

  should('exit on blur', () => {
    const element = document.getElementById('first');
    element.focus();
    const test = new Mode({ exitOnBlur: element });

    assert.isTrue(test.modeIsActive);
    element.blur();
    return assert.isFalse(test.modeIsActive);
  }),

  should('not exit on blur if not enabled', () => {
    const element = document.getElementById('first');
    element.focus();
    const test = new Mode({ exitOnBlur: false });

    assert.isTrue(test.modeIsActive);
    element.blur();
    return assert.isTrue(test.modeIsActive);
  }));

context('PostFindMode',
  setup(function () {
    initializeModeState();

    const testContent = "<input type='text' id='first'/>";
    document.getElementById('test-div').innerHTML = testContent;
    document.getElementById('first').focus();
    return this.postFindMode = new PostFindMode();
  }),

  tearDown(() => document.getElementById('test-div').innerHTML = ''),

  should('be a singleton', function () {
    assert.isTrue(this.postFindMode.modeIsActive);
    new PostFindMode();
    return assert.isFalse(this.postFindMode.modeIsActive);
  }),

  should('suppress unmapped printable keys', () => {
    sendKeyboardEvent('a');
    return assert.equal(null, commandCount);
  }),

  should('be deactivated on click events', function () {
    handlerStack.bubbleEvent('click', { target: document.activeElement });
    return assert.isFalse(this.postFindMode.modeIsActive);
  }),

  should('enter insert mode on immediate escape', function () {
    sendKeyboardEvent('Escape', 'keydown');
    assert.equal(null, commandCount);
    return assert.isFalse(this.postFindMode.modeIsActive);
  }),

  should('not enter insert mode on subsequent escapes', function () {
    sendKeyboardEvent('a');
    sendKeyboardEvent('Escape', 'keydown');
    return assert.isTrue(this.postFindMode.modeIsActive);
  }));

context('WaitForEnter',
  setup(function () {
    initializeModeState();
    this.isSuccess = null;
    return this.waitForEnter = new WaitForEnter((isSuccess) => this.isSuccess = isSuccess);
  }),

  should('exit with success on Enter', function () {
    assert.isTrue(this.waitForEnter.modeIsActive);
    assert.isFalse(this.isSuccess != null);
    sendKeyboardEvent('Enter', 'keydown');
    assert.isFalse(this.waitForEnter.modeIsActive);
    return assert.isTrue((this.isSuccess != null) && (this.isSuccess === true));
  }),

  should('exit without success on Escape', function () {
    assert.isTrue(this.waitForEnter.modeIsActive);
    assert.isFalse(this.isSuccess != null);
    sendKeyboardEvent('Escape', 'keydown');
    assert.isFalse(this.waitForEnter.modeIsActive);
    return assert.isTrue((this.isSuccess != null) && (this.isSuccess === false));
  }),

  should('not exit on other keyboard events', function () {
    assert.isTrue(this.waitForEnter.modeIsActive);
    assert.isFalse(this.isSuccess != null);
    sendKeyboardEvents('abc');
    assert.isTrue(this.waitForEnter.modeIsActive);
    return assert.isFalse(this.isSuccess != null);
  }));

context('GrabBackFocus',
  setup(() => {
    const testContent = "<input type='text' value='some value' id='input'/>";
    document.getElementById('test-div').innerHTML = testContent;
    return stubSettings('grabBackFocus', true);
  }),

  tearDown(() => document.getElementById('test-div').innerHTML = ''),

  should('blur an already focused input', () => {
    document.getElementById('input').focus();
    assert.isTrue(document.activeElement);
    assert.isTrue(DomUtils.isEditable(document.activeElement));
    initializeModeState();
    assert.isTrue(document.activeElement);
    return assert.isFalse(DomUtils.isEditable(document.activeElement));
  }),

  should('blur a newly focused input', () => {
    initializeModeState();
    document.getElementById('input').focus();
    assert.isTrue(document.activeElement);
    return assert.isFalse(DomUtils.isEditable(document.activeElement));
  }),

  should('exit on a key event', () => {
    initializeModeState();
    sendKeyboardEvent('a');
    document.getElementById('input').focus();
    assert.isTrue(document.activeElement);
    return assert.isTrue(DomUtils.isEditable(document.activeElement));
  }),

  should('exit on a mousedown event', () => {
    initializeModeState();
    handlerStack.bubbleEvent('mousedown', { target: document.body });
    document.getElementById('input').focus();
    assert.isTrue(document.activeElement);
    return assert.isTrue(DomUtils.isEditable(document.activeElement));
  }));
