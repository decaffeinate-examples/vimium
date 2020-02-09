/* eslint-disable
    max-len,
    no-restricted-syntax,
    no-return-assign,
    no-undef,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS203: Remove `|| {}` from converted for-own loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
require('./test_helper.js');
extend(global, require('./test_chrome_stubs.js'));

extend(global, require('../../lib/utils.js'));

Utils.getCurrentVersion = () => '1.44';
Utils.isBackgroundPage = () => true;
Utils.isExtensionPage = () => true;
global.localStorage = {};
extend(global, require('../../lib/settings.js'));
extend(global, require('../../pages/options.js'));

context('settings',

  setup(() => {
    stub(global, 'localStorage', {});
    Settings.cache = global.localStorage; // Point the settings cache to the new localStorage object.
    return Settings.postUpdateHooks = {};
  }), // Avoid running update hooks which include calls to outside of settings.

  should('save settings in localStorage as JSONified strings', () => {
    Settings.set('dummy', '');
    return assert.equal(localStorage.dummy, '""');
  }),

  should('obtain defaults if no key is stored', () => {
    assert.isFalse(Settings.has('scrollStepSize'));
    return assert.equal(Settings.get('scrollStepSize'), 60);
  }),

  should('store values', () => {
    Settings.set('scrollStepSize', 20);
    return assert.equal(Settings.get('scrollStepSize'), 20);
  }),

  should('revert to defaults if no key is stored', () => {
    Settings.set('scrollStepSize', 20);
    Settings.clear('scrollStepSize');
    return assert.equal(Settings.get('scrollStepSize'), 60);
  }));

context('synced settings',

  setup(() => {
    stub(global, 'localStorage', {});
    Settings.cache = global.localStorage; // Point the settings cache to the new localStorage object.
    return Settings.postUpdateHooks = {};
  }), // Avoid running update hooks which include calls to outside of settings.

  should('propagate non-default value via synced storage listener', () => {
    Settings.set('scrollStepSize', 20);
    assert.equal(Settings.get('scrollStepSize'), 20);
    Settings.propagateChangesFromChromeStorage({ scrollStepSize: { newValue: '40' } });
    return assert.equal(Settings.get('scrollStepSize'), 40);
  }),

  should('propagate default value via synced storage listener', () => {
    Settings.set('scrollStepSize', 20);
    assert.equal(Settings.get('scrollStepSize'), 20);
    Settings.propagateChangesFromChromeStorage({ scrollStepSize: { newValue: '60' } });
    return assert.equal(Settings.get('scrollStepSize'), 60);
  }),

  should('propagate non-default values from synced storage', () => {
    chrome.storage.sync.set({ scrollStepSize: JSON.stringify(20) });
    return assert.equal(Settings.get('scrollStepSize'), 20);
  }),

  should('propagate default values from synced storage', () => {
    Settings.set('scrollStepSize', 20);
    chrome.storage.sync.set({ scrollStepSize: JSON.stringify(60) });
    return assert.equal(Settings.get('scrollStepSize'), 60);
  }),

  should('clear a setting from synced storage', () => {
    Settings.set('scrollStepSize', 20);
    chrome.storage.sync.remove('scrollStepSize');
    return assert.equal(Settings.get('scrollStepSize'), 60);
  }),

  should('trigger a postUpdateHook', () => {
    const message = 'Hello World';
    let receivedMessage = '';
    Settings.postUpdateHooks.scrollStepSize = (value) => receivedMessage = value;
    chrome.storage.sync.set({ scrollStepSize: JSON.stringify(message) });
    return assert.equal(message, receivedMessage);
  }),

  should('sync a key which is not a known setting (without crashing)', () => chrome.storage.sync.set({ notASetting: JSON.stringify('notAUsefullValue') })));

context('default valuess',

  should('have a default value for every option', () => (() => {
    const result = [];
    for (const key of Object.keys(Options || {})) {
      result.push(assert.isTrue(key in Settings.defaults));
    }
    return result;
  })()));
