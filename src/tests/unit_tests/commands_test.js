/* eslint-disable
    func-names,
    implicit-arrow-linebreak,
    max-len,
    no-loop-func,
    no-multi-assign,
    no-restricted-syntax,
    no-return-assign,
    no-shadow,
    no-undef,
    no-var,
    prefer-spread,
    vars-on-top,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS203: Remove `|| {}` from converted for-own loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let command; let
  options;
require('./test_helper.js');
extend(global, require('./test_chrome_stubs.js'));
extend(global, require('../../background_scripts/bg_utils.js'));

global.Settings = { postUpdateHooks: {}, get() { return ''; }, set() {} };
const { Commands } = require('../../background_scripts/commands.js');

// Include mode_normal to check that all commands have been implemented.
global.KeyHandlerMode = (global.Mode = {});
global.KeyboardUtils = { platform: '' };
extend(global, require('../../content_scripts/link_hints.js'));
extend(global, require('../../content_scripts/marks.js'));
extend(global, require('../../content_scripts/vomnibar.js'));
const { NormalModeCommands } = require('../../content_scripts/mode_normal.js');

context('Key mappings',
  setup(function () {
    return this.testKeySequence = function (key, expectedKeyText, expectedKeyLength) {
      const keySequence = Commands.parseKeySequence(key);
      assert.equal(expectedKeyText, keySequence.join('/'));
      return assert.equal(expectedKeyLength, keySequence.length);
    };
  }),

  should('lowercase keys correctly', function () {
    this.testKeySequence('a', 'a', 1);
    this.testKeySequence('A', 'A', 1);
    return this.testKeySequence('ab', 'a/b', 2);
  }),

  should('recognise non-alphabetic keys', function () {
    this.testKeySequence('#', '#', 1);
    this.testKeySequence('.', '.', 1);
    this.testKeySequence('##', '#/#', 2);
    return this.testKeySequence('..', './.', 2);
  }),

  should('parse keys with modifiers', function () {
    this.testKeySequence('<c-a>', '<c-a>', 1);
    this.testKeySequence('<c-A>', '<c-A>', 1);
    this.testKeySequence('<C-A>', '<c-A>', 1);
    this.testKeySequence('<c-a><a-b>', '<c-a>/<a-b>', 2);
    this.testKeySequence('<m-a>', '<m-a>', 1);
    return this.testKeySequence('z<m-a>', 'z/<m-a>', 2);
  }),

  should('normalize with modifiers', function () {
    // Modifiers should be in alphabetical order.
    return this.testKeySequence('<m-c-a-A>', '<a-c-m-A>', 1);
  }),

  should('parse and normalize named keys', function () {
    this.testKeySequence('<space>', '<space>', 1);
    this.testKeySequence('<Space>', '<space>', 1);
    this.testKeySequence('<C-Space>', '<c-space>', 1);
    this.testKeySequence('<f12>', '<f12>', 1);
    return this.testKeySequence('<F12>', '<f12>', 1);
  }),

  should('handle angle brackets which are part of not modifiers', function () {
    this.testKeySequence('<', '<', 1);
    this.testKeySequence('>', '>', 1);

    this.testKeySequence('<<', '</<', 2);
    this.testKeySequence('>>', '>/>', 2);

    this.testKeySequence('<>', '</>', 2);
    this.testKeySequence('<>', '</>', 2);

    this.testKeySequence('<<space>', '</<space>', 2);
    this.testKeySequence('<C->>', '<c->>', 1);

    return this.testKeySequence('<a>', '</a/>', 3);
  }),

  should('negative tests', function () {
    // These should not be parsed as modifiers.
    this.testKeySequence('<b-a>', '</b/-/a/>', 5);
    return this.testKeySequence('<c-@@>', '</c/-/@/@/>', 6);
  }));

context('Validate commands and options',
  should('have either noRepeat or repeatLimit, but not both', () => // TODO(smblott) For this and each following test, is there a way to structure the tests such that the name
  // of the offending command appears in the output, if the test fails?
    (() => {
      const result = [];
      for (command of Object.keys(Commands.availableCommands || {})) {
        options = Commands.availableCommands[command];
        result.push(assert.isTrue(!(options.noRepeat && options.repeatLimit)));
      }
      return result;
    })()),

  should('describe each command', () => (() => {
    const result = [];
    for (command of Object.keys(Commands.availableCommands || {})) {
      options = Commands.availableCommands[command];
      result.push(assert.equal('string', typeof options.description));
    }
    return result;
  })()),

  should('define each command in each command group', () => (() => {
    const result = [];
    for (const group of Object.keys(Commands.commandGroups || {})) {
      var commands = Commands.commandGroups[group];
      result.push((() => {
        const result1 = [];
        for (command of Array.from(commands)) {
          assert.equal('string', typeof command);
          result1.push(assert.isTrue(Commands.availableCommands[command]));
        }
        return result1;
      })());
    }
    return result;
  })()),

  should('have valid commands for each advanced command', () => (() => {
    const result = [];
    for (command of Array.from(Commands.advancedCommands)) {
      assert.equal('string', typeof command);
      result.push(assert.isTrue(Commands.availableCommands[command]));
    }
    return result;
  })()),

  should('have valid commands for each default key mapping', () => {
    const count = Object.keys(Commands.keyToCommandRegistry).length;
    assert.isTrue((count > 0));
    return (() => {
      const result = [];
      for (const key of Object.keys(Commands.keyToCommandRegistry || {})) {
        command = Commands.keyToCommandRegistry[key];
        assert.equal('object', typeof command);
        result.push(assert.isTrue(Commands.availableCommands[command.command]));
      }
      return result;
    })();
  }));

context('Validate advanced commands',
  setup(function () {
    return this.allCommands = [].concat.apply([], ((() => {
      const result = [];
      for (const group of Object.keys(Commands.commandGroups || {})) {
        const commands = Commands.commandGroups[group];
        result.push(commands);
      }
      return result;
    })()));
  }),

  should('include each advanced command in a command group', function () {
    return Array.from(Commands.advancedCommands).map((command) => assert.isTrue(this.allCommands.indexOf(command) >= 0));
  }));

context('Parse commands',
  should('omit whitespace', () => assert.equal(0, BgUtils.parseLines('    \n    \n   ').length)),

  should('omit comments', () => assert.equal(0, BgUtils.parseLines(' # comment   \n " comment   \n   ').length)),

  should('join lines', () => {
    assert.equal(1, BgUtils.parseLines('a\\\nb').length);
    return assert.equal('ab', BgUtils.parseLines('a\\\nb')[0]);
  }),

  should('trim lines', () => {
    assert.equal(2, BgUtils.parseLines('  a  \n  b').length);
    assert.equal('a', BgUtils.parseLines('  a  \n  b')[0]);
    return assert.equal('b', BgUtils.parseLines('  a  \n  b')[1]);
  }));

context('Commands implemented',
  ...Array.from(((() => {
    const result = [];
    for (command of Object.keys(Commands.availableCommands || {})) {
      options = Commands.availableCommands[command];
      result.push((function (command, options) {
        if (options.background) {
          return should(`${command} (background command)`, () => {});
          // TODO: Import background_scripts/main.js and expose BackgroundCommands from there.
          // assert.isTrue BackgroundCommands[command]
        }
        return should(`${command} (foreground command)`, () => assert.isTrue(NormalModeCommands[command]));
      })(command, options));
    }

    return result;
  })())));
