/* eslint-disable
    class-methods-use-this,
    consistent-return,
    constructor-super,
    default-case,
    func-names,
    max-classes-per-file,
    max-len,
    new-cap,
    no-alert,
    no-cond-assign,
    no-constant-condition,
    no-eval,
    no-multi-assign,
    no-nested-ternary,
    no-new,
    no-param-reassign,
    no-restricted-globals,
    no-restricted-syntax,
    no-return-assign,
    no-shadow,
    no-this-before-super,
    no-undef,
    no-underscore-dangle,
    no-unused-vars,
    no-use-before-define,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS201: Simplify complex destructure assignments
 * DS203: Remove `|| {}` from converted for-own loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

const $ = (id) => document.getElementById(id);
const bgExclusions = chrome.extension.getBackgroundPage().Exclusions;

// We have to use Settings from the background page here (not Settings, directly) to avoid a race condition for
// the page popup.  Specifically, we must ensure that the settings have been updated on the background page
// *before* the popup closes.  This ensures that any exclusion-rule changes are in place before the page
// regains the focus.
const bgSettings = chrome.extension.getBackgroundPage().Settings;

//
// Class hierarchy for various types of option.
class Option {
  static initClass() {
    // Base class for all option classes.
    // Abstract. Option does not define @populateElement or @readValueFromElement.

    // Static. Array of all options.
    this.all = [];

    this.onSaveCallbacks = [];
  }

  constructor(field, onUpdated) {
    this.field = field;
    this.onUpdated = onUpdated;
    this.element = $(this.field);
    this.element.addEventListener('change', this.onUpdated);
    this.fetch();
    Option.all.push(this);
  }

  // Fetch a setting from localStorage, remember the @previous value and populate the DOM element.
  // Return the fetched value.
  fetch() {
    this.populateElement(this.previous = bgSettings.get(this.field));
    return this.previous;
  }

  // Write this option's new value back to localStorage, if necessary.
  save() {
    const value = this.readValueFromElement();
    if (JSON.stringify(value) !== JSON.stringify(this.previous)) {
      return bgSettings.set(this.field, (this.previous = value));
    }
  }

  restoreToDefault() {
    bgSettings.clear(this.field);
    return this.fetch();
  }

  static onSave(callback) {
    return this.onSaveCallbacks.push(callback);
  }

  // Static method.
  static saveOptions() {
    Option.all.map((option) => option.save());
    return Array.from(this.onSaveCallbacks).map((callback) => callback());
  }
}
Option.initClass();

// Abstract method; only implemented in sub-classes.
// Populate the option's DOM element (@element) with the setting's current value.
// populateElement: (value) -> DO_SOMETHING

// Abstract method; only implemented in sub-classes.
// Extract the setting's new value from the option's DOM element (@element).
// readValueFromElement: -> RETURN_SOMETHING

class NumberOption extends Option {
  populateElement(value) { return this.element.value = value; }

  readValueFromElement() { return parseFloat(this.element.value); }
}

class TextOption extends Option {
  constructor(...args) {
    super(...Array.from(args || []));
    this.element.addEventListener('input', this.onUpdated);
  }

  populateElement(value) { return this.element.value = value; }

  readValueFromElement() { return this.element.value.trim(); }
}

class NonEmptyTextOption extends Option {
  constructor(...args) {
    super(...Array.from(args || []));
    this.element.addEventListener('input', this.onUpdated);
  }

  populateElement(value) { return this.element.value = value; }

  // If the new value is not empty, then return it. Otherwise, restore the default value.
  readValueFromElement() {
    let value;
    if ((value = this.element.value.trim())) { return value; } return this.restoreToDefault();
  }
}

class CheckBoxOption extends Option {
  populateElement(value) { return this.element.checked = value; }

  readValueFromElement() { return this.element.checked; }
}

class ExclusionRulesOption extends Option {
  constructor(...args) {
    super(...Array.from(args || []));
    $('exclusionAddButton').addEventListener('click', (event) => this.addRule());
  }

  // Add a new rule, focus its pattern, scroll it into view, and return the newly-added element.  On the
  // options page, there is no current URL, so there is no initial pattern.  This is the default.  On the popup
  // page (see ExclusionRulesOnPopupOption), the pattern is pre-populated based on the current tab's URL.
  addRule(pattern) {
    if (pattern == null) { pattern = ''; }
    const element = this.appendRule({ pattern, passKeys: '' });
    this.getPattern(element).focus();
    const exclusionScrollBox = $('exclusionScrollBox');
    exclusionScrollBox.scrollTop = exclusionScrollBox.scrollHeight;
    this.onUpdated();
    return element;
  }

  populateElement(rules) {
    // For the case of restoring a backup, we first have to remove existing rules.
    const exclusionRules = $('exclusionRules');
    while (exclusionRules.rows[1]) { exclusionRules.deleteRow(1); }
    return Array.from(rules).map((rule) => this.appendRule(rule));
  }

  // Append a row for a new rule.  Return the newly-added element.
  appendRule(rule) {
    let element;
    const {
      content,
    } = document.querySelector('#exclusionRuleTemplate');
    const row = document.importNode(content, true);

    for (const field of ['pattern', 'passKeys']) {
      element = row.querySelector(`.${field}`);
      element.value = rule[field];
      for (const event of ['input', 'change']) {
        element.addEventListener(event, this.onUpdated);
      }
    }

    this.getRemoveButton(row).addEventListener('click', (event) => {
      rule = event.target.parentNode.parentNode;
      rule.parentNode.removeChild(rule);
      return this.onUpdated();
    });

    this.element.appendChild(row);
    return this.element.children[this.element.children.length - 1];
  }

  readValueFromElement() {
    const rules = Array.from(this.element.getElementsByClassName('exclusionRuleTemplateInstance')).map((element) => ({
      pattern: this.getPattern(element).value.trim(),
      passKeys: this.getPassKeys(element).value.trim(),
    }));
    return rules.filter((rule) => rule.pattern);
  }

  // Accessors for the three main sub-elements of an "exclusionRuleTemplateInstance".
  getPattern(element) { return element.querySelector('.pattern'); }

  getPassKeys(element) { return element.querySelector('.passKeys'); }

  getRemoveButton(element) { return element.querySelector('.exclusionRemoveButton'); }
}

// ExclusionRulesOnPopupOption is ExclusionRulesOption, extended with some UI tweeks suitable for use in the
// page popup.  This also differs from ExclusionRulesOption in that, on the page popup, there is always a URL
// (@url) associated with the current tab.
class ExclusionRulesOnPopupOption extends ExclusionRulesOption {
  constructor(url, ...args) {
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) { super(); }
      const thisFn = (() => this).toString();
      const thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
      eval(`${thisName} = this;`);
    }
    this.url = url;
    super(...Array.from(args || []));
  }

  addRule() {
    const element = super.addRule(this.generateDefaultPattern());
    this.activatePatternWatcher(element);
    // ExclusionRulesOption.addRule()/super() has focused the pattern.  Here, focus the passKeys instead;
    // because, in the popup, we already have a pattern, so the user is more likely to edit the passKeys.
    this.getPassKeys(element).focus();
    // Return element (for consistency with ExclusionRulesOption.addRule()).
    return element;
  }

  populateElement(rules) {
    let element;
    super.populateElement(rules);
    const elements = this.element.getElementsByClassName('exclusionRuleTemplateInstance');
    for (element of Array.from(elements)) { this.activatePatternWatcher(element); }

    let haveMatch = false;
    for (element of Array.from(elements)) {
      const pattern = this.getPattern(element).value.trim();
      if (this.url.search(bgExclusions.RegexpCache.get(pattern)) >= 0) {
        haveMatch = true;
        this.getPassKeys(element).focus();
      } else {
        element.style.display = 'none';
      }
    }
    if (!haveMatch) { return this.addRule(); }
  }

  // Provide visual feedback (make it red) when a pattern does not match the current tab's URL.
  activatePatternWatcher(element) {
    const patternElement = element.children[0].firstChild;
    return patternElement.addEventListener('keyup', () => {
      if (this.url.match(bgExclusions.RegexpCache.get(patternElement.value))) {
        return patternElement.title = (patternElement.style.color = '');
      }
      patternElement.style.color = 'red';
      return patternElement.title = 'Red text means that the pattern does not\nmatch the current URL.';
    });
  }

  // Generate a default exclusion-rule pattern from a URL.  This is then used to pre-populate the pattern on
  // the page popup.
  generateDefaultPattern() {
    if (/^https?:\/\/./.test(this.url)) {
      // The common use case is to disable Vimium at the domain level.
      // Generate "https?://www.example.com/*" from "http://www.example.com/path/to/page.html".
      // Note: IPV6 host addresses will contain "[" and "]" (which must be escaped).
      const hostname = this.url.split('/', 3).slice(1).join('/').replace('[', '\\[')
        .replace(']', '\\]');
      return `https?:/${hostname}/*`;
    } if (/^[a-z]{3,}:\/\/./.test(this.url)) {
      // Anything else which seems to be a URL.
      return `${this.url.split('/', 3).join('/')}/*`;
    }
    return `${this.url}*`;
  }
}

const Options = {
  exclusionRules: ExclusionRulesOption,
  filterLinkHints: CheckBoxOption,
  waitForEnterForFilteredHints: CheckBoxOption,
  hideHud: CheckBoxOption,
  keyMappings: TextOption,
  linkHintCharacters: NonEmptyTextOption,
  linkHintNumbers: NonEmptyTextOption,
  newTabUrl: NonEmptyTextOption,
  nextPatterns: NonEmptyTextOption,
  previousPatterns: NonEmptyTextOption,
  regexFindMode: CheckBoxOption,
  ignoreKeyboardLayout: CheckBoxOption,
  scrollStepSize: NumberOption,
  smoothScroll: CheckBoxOption,
  grabBackFocus: CheckBoxOption,
  searchEngines: TextOption,
  searchUrl: NonEmptyTextOption,
  userDefinedLinkHintCss: NonEmptyTextOption,
};

const initOptionsPage = function () {
  const onUpdated = function () {
    $('saveOptions').removeAttribute('disabled');
    return $('saveOptions').textContent = 'Save Changes';
  };

  // Display either "linkHintNumbers" or "linkHintCharacters", depending upon "filterLinkHints".
  const maintainLinkHintsView = function () {
    const hide = (el) => el.style.display = 'none';
    const show = (el) => el.style.display = 'table-row';
    if ($('filterLinkHints').checked) {
      hide($('linkHintCharactersContainer'));
      show($('linkHintNumbersContainer'));
      return show($('waitForEnterForFilteredHintsContainer'));
    }
    show($('linkHintCharactersContainer'));
    hide($('linkHintNumbersContainer'));
    return hide($('waitForEnterForFilteredHintsContainer'));
  };

  const maintainAdvancedOptions = function () {
    if (bgSettings.get('optionsPage_showAdvancedOptions')) {
      $('advancedOptions').style.display = 'table-row-group';
      return $('advancedOptionsButton').textContent = 'Hide Advanced Options';
    }
    $('advancedOptions').style.display = 'none';
    return $('advancedOptionsButton').textContent = 'Show Advanced Options';
  };
  maintainAdvancedOptions();

  const toggleAdvancedOptions = function (event) {
    bgSettings.set('optionsPage_showAdvancedOptions', !bgSettings.get('optionsPage_showAdvancedOptions'));
    maintainAdvancedOptions();
    $('advancedOptionsButton').blur();
    return event.preventDefault();
  };

  const activateHelpDialog = () => HelpDialog.toggle({ showAllCommandDetails: true });

  const saveOptions = function () {
    $('linkHintCharacters').value = $('linkHintCharacters').value.toLowerCase();
    Option.saveOptions();
    $('saveOptions').disabled = true;
    return $('saveOptions').textContent = 'Saved';
  };

  $('saveOptions').addEventListener('click', saveOptions);
  $('advancedOptionsButton').addEventListener('click', toggleAdvancedOptions);
  $('showCommands').addEventListener('click', activateHelpDialog);
  $('filterLinkHints').addEventListener('click', maintainLinkHintsView);

  for (const element of Array.from(document.getElementsByClassName('nonEmptyTextOption'))) {
    element.className += ' example info';
    element.textContent = 'Leave empty to reset this option.';
  }

  window.onbeforeunload = function () { if (!$('saveOptions').disabled) { return 'You have unsaved changes to options.'; } };

  document.addEventListener('keyup', (event) => {
    if (event.ctrlKey && (event.keyCode === 13)) {
      if (__guard__(typeof document !== 'undefined' && document !== null ? document.activeElement : undefined, (x) => x.blur)) { document.activeElement.blur(); }
      return saveOptions();
    }
  });

  // Populate options. The constructor adds each new object to "Option.all".
  for (const name of Object.keys(Options || {})) {
    const type = Options[name];
    new type(name, onUpdated);
  }

  return maintainLinkHintsView();
};

const initPopupPage = function () {
  chrome.tabs.query({ active: true, currentWindow: true }, (...args) => {
    const [tab] = Array.from(args[0]);
    let exclusions = null;
    document.getElementById('optionsLink').setAttribute('href', chrome.runtime.getURL('pages/options.html'));

    const tabPorts = chrome.extension.getBackgroundPage().portsForTab[tab.id];
    if (!tabPorts || !(Object.keys(tabPorts).length > 0)) {
      // The browser has disabled Vimium on this page. Place a message explaining this into the popup.
      document.body.innerHTML = `\
<div style="width: 400px; margin: 5px;">
  <p style="margin-bottom: 5px;">
    Vimium is not running on this page.
  </p>
  <p style="margin-bottom: 5px;">
    Your browser does not run web extensions like Vimium on certain pages,
    usually for security reasons.
  </p>
  <p>
    Unless your browser's developers change their policy, then unfortunately it is not possible to make Vimium (or any other
    web extension, for that matter) work on this page.
  </p>
</div>\
`;
      return;
    }

    // As the active URL, we choose the most recently registered URL from a frame in the tab, or the tab's own
    // URL.
    const url = chrome.extension.getBackgroundPage().urlForTab[tab.id] || tab.url;

    const updateState = function () {
      const rule = bgExclusions.getRule(url, exclusions.readValueFromElement());
      return $('state').innerHTML = `Vimium will ${
        rule && rule.passKeys
          ? `exclude <span class='code'>${rule.passKeys}</span>`
          : rule
            ? 'be disabled'
            : 'be enabled'}`;
    };

    const onUpdated = function () {
      $('helpText').innerHTML = 'Type <strong>Ctrl-Enter</strong> to save and close.';
      $('saveOptions').removeAttribute('disabled');
      $('saveOptions').textContent = 'Save Changes';
      if (exclusions) { return updateState(); }
    };

    const saveOptions = function () {
      Option.saveOptions();
      $('saveOptions').textContent = 'Saved';
      return $('saveOptions').disabled = true;
    };

    $('saveOptions').addEventListener('click', saveOptions);

    document.addEventListener('keyup', (event) => {
      if (event.ctrlKey && (event.keyCode === 13)) {
        saveOptions();
        return window.close();
      }
    });

    // Populate options. Just one, here.
    exclusions = new ExclusionRulesOnPopupOption(url, 'exclusionRules', onUpdated);

    updateState();
    return document.addEventListener('keyup', updateState);
  });

  // Install version number.
  const manifest = chrome.runtime.getManifest();
  return $('versionNumber').textContent = manifest.version;
};


//
// Initialization.
document.addEventListener('DOMContentLoaded', () => {
  DomUtils.injectUserCss(); // Manually inject custom user styles.
  const xhr = new XMLHttpRequest();
  xhr.open('GET', chrome.extension.getURL('pages/exclusions.html'), true);
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      $('exclusionScrollBox').innerHTML = xhr.responseText;
      switch (location.pathname) {
        case '/pages/options.html': return initOptionsPage();
        case '/pages/popup.html': return initPopupPage();
      }
    }
  };

  return xhr.send();
});

//
// Backup and restore. "?" is for the tests."
if (typeof DomUtils !== 'undefined' && DomUtils !== null) {
  DomUtils.documentReady(() => {
  // Only initialize backup/restore on the options page (not the popup).
    if (location.pathname !== '/pages/options.html') { return; }

    let restoreSettingsVersion = null;

    const populateBackupLinkUrl = function () {
      const backup = { settingsVersion: bgSettings.get('settingsVersion') };
      for (const option of Array.from(Option.all)) {
        backup[option.field] = option.readValueFromElement();
      }
      // Create the blob in the background page so it isn't garbage collected when the page closes in FF.
      const bgWin = chrome.extension.getBackgroundPage();
      const blob = new bgWin.Blob([JSON.stringify(backup, null, 2)]);
      return $('backupLink').href = bgWin.URL.createObjectURL(blob);
    };

    $('backupLink').addEventListener('mousedown', populateBackupLinkUrl, true);

    $('chooseFile').addEventListener('change', (event) => {
      if (document.activeElement != null) {
        document.activeElement.blur();
      }
      const {
        files,
      } = event.target;
      if (files.length === 1) {
        const file = files[0];
        const reader = new FileReader();
        reader.readAsText(file);
        return reader.onload = function (event) {
          let backup;
          try {
            backup = JSON.parse(reader.result);
          } catch (error) {
            alert('Failed to parse Vimium backup.');
            return;
          }

          if ('settingsVersion' in backup) { restoreSettingsVersion = backup.settingsVersion; }
          return (() => {
            const result = [];
            for (const option of Array.from(Option.all)) {
              if (option.field in backup) {
                option.populateElement(backup[option.field]);
                result.push(option.onUpdated());
              } else {
                result.push(undefined);
              }
            }
            return result;
          })();
        };
      }
    });

    return Option.onSave(() => {
    // If we're restoring a backup, then restore the backed up settingsVersion.
      if (restoreSettingsVersion != null) {
        bgSettings.set('settingsVersion', restoreSettingsVersion);
        restoreSettingsVersion = null;
      }
      // Reset the restore-backup input.
      $('chooseFile').value = '';
      // We need to apply migrations in case we are restoring an old backup.
      return bgSettings.applyMigrations();
    });
  });
}

// Exported for tests.
const root = typeof exports !== 'undefined' && exports !== null ? exports : window;
extend(root, { Options, isVimiumOptionsPage: true });

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
