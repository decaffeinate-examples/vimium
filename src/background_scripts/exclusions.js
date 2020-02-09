/* eslint-disable
    max-len,
    no-nested-ternary,
    no-param-reassign,
    no-restricted-syntax,
    no-return-assign,
    no-undef,
    no-unused-vars,
    no-var,
    operator-linebreak,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const RegexpCache = {
  cache: {},
  clear(cache) {
    if (cache == null) { cache = {}; }
    this.cache = cache;
  },
  get(pattern) {
    if (pattern in this.cache) {
      return this.cache[pattern];
    }
    return this.cache[pattern] =
        // We use try/catch to ensure that a broken regexp doesn't wholly cripple Vimium.
        (() => {
          try {
            return new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
          } catch (error) {
            BgUtils.log(`bad regexp in exclusion rule: ${pattern}`);
            return /^$/;
          }
        })();
  }, // Match the empty string.
};

// The Exclusions class manages the exclusion rule setting.  An exclusion is an object with two attributes:
// pattern and passKeys.  The exclusion rules are an array of such objects.

var Exclusions = {
  // Make RegexpCache, which is required on the page popup, accessible via the Exclusions object.
  RegexpCache,

  rules: Settings.get('exclusionRules'),

  // Merge the matching rules for URL, or null.  In the normal case, we use the configured @rules; hence, this
  // is the default.  However, when called from the page popup, we are testing what effect candidate new rules
  // would have on the current tab.  In this case, the candidate rules are provided by the caller.
  getRule(url, rules) {
    let rule;
    if (rules == null) {
      ({
        rules,
      } = this);
    }
    const matchingRules = ((() => {
      const result = [];
      for (rule of Array.from(rules)) {
        if (rule.pattern && (url.search(RegexpCache.get(rule.pattern)) >= 0)) {
          result.push(rule);
        }
      }
      return result;
    })());
    // An absolute exclusion rule (one with no passKeys) takes priority.
    for (rule of Array.from(matchingRules)) {
      if (!rule.passKeys) { return rule; }
    }
    // Strip whitespace from all matching passKeys strings, and join them together.
    const passKeys = ((() => {
      const result1 = [];
      for (rule of Array.from(matchingRules)) {
        result1.push(rule.passKeys.split(/\s+/).join(''));
      }
      return result1;
    })()).join('');
    if (matchingRules.length > 0) {
      return { passKeys: Utils.distinctCharacters(passKeys) };
    }
    return null;
  },

  isEnabledForUrl(url) {
    const rule = Exclusions.getRule(url);
    return {
      isEnabledForUrl: !rule || (rule.passKeys.length > 0),
      passKeys: (rule != null ? rule.passKeys : undefined) != null ? (rule != null ? rule.passKeys : undefined) : '',
    };
  },

  setRules(rules) {
    // Callers map a rule to null to have it deleted, and rules without a pattern are useless.
    this.rules = rules.filter((rule) => rule && rule.pattern);
    return Settings.set('exclusionRules', this.rules);
  },

  postUpdateHook(rules) {
    // NOTE(mrmr1993): In FF, the |rules| argument will be garbage collected when the exclusions popup is
    // closed. Do NOT store it/use it asynchronously.
    this.rules = Settings.get('exclusionRules');
    return RegexpCache.clear();
  },
};

// Register postUpdateHook for exclusionRules setting.
Settings.postUpdateHooks.exclusionRules = Exclusions.postUpdateHook.bind(Exclusions);

const root = typeof exports !== 'undefined' && exports !== null ? exports : window;
extend(root, { Exclusions });
