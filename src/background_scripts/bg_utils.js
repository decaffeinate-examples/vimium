/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS203: Remove `|| {}` from converted for-own loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const root = typeof exports !== 'undefined' && exports !== null ? exports : window;

// TabRecency associates a logical timestamp with each tab id.  These are used to provide an initial
// recency-based ordering in the tabs vomnibar (which allows jumping quickly between recently-visited tabs).
class TabRecency {
  static initClass() {
    this.prototype.timestamp = 1;
    this.prototype.current = -1;
    this.prototype.cache = {};
    this.prototype.lastVisited = null;
    this.prototype.lastVisitedTime = null;
    this.prototype.timeDelta = 500;
     // Milliseconds.
  }

  constructor() {
    chrome.tabs.onActivated.addListener(activeInfo => this.register(activeInfo.tabId));
    chrome.tabs.onRemoved.addListener(tabId => this.deregister(tabId));

    chrome.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
      this.deregister(removedTabId);
      return this.register(addedTabId);
    });

    if (chrome.windows != null) {
      chrome.windows.onFocusChanged.addListener(wnd => {
      if (wnd !== chrome.windows.WINDOW_ID_NONE) {
        return chrome.tabs.query({windowId: wnd, active: true}, tabs => {
          if (tabs[0]) { return this.register(tabs[0].id); }
      });
      }
  });
    }
  }

  register(tabId) {
    const currentTime = new Date();
    // Register tabId if it has been visited for at least @timeDelta ms.  Tabs which are visited only for a
    // very-short time (e.g. those passed through with `5J`) aren't registered as visited at all.
    if ((this.lastVisitedTime != null) && (this.timeDelta <= (currentTime - this.lastVisitedTime))) {
      this.cache[this.lastVisited] = ++this.timestamp;
    }

    this.current = (this.lastVisited = tabId);
    return this.lastVisitedTime = currentTime;
  }

  deregister(tabId) {
    if (tabId === this.lastVisited) {
      // Ensure we don't register this tab, since it's going away.
      this.lastVisited = (this.lastVisitedTime = null);
    }
    return delete this.cache[tabId];
  }

  // Recently-visited tabs get a higher score (except the current tab, which gets a low score).
  recencyScore(tabId) {
    if (!this.cache[tabId]) { this.cache[tabId] = 1; }
    if (tabId === this.current) { return 0.0; } else { return this.cache[tabId] / this.timestamp; }
  }

  // Returns a list of tab Ids sorted by recency, most recent tab first.
  getTabsByRecency() {
    let tId;
    const tabIds = ((() => {
      const result = [];
      for (tId of Object.keys(this.cache || {})) {
        result.push(tId);
      }
      return result;
    })());
    tabIds.sort((a,b) => this.cache[b] - this.cache[a]);
    return tabIds.map(tId => parseInt(tId));
  }
}
TabRecency.initClass();

var BgUtils = {
  tabRecency: new TabRecency(),

  // Log messages to the extension's logging page, but only if that page is open.
  log: (function() {
    const loggingPageUrl = chrome.runtime.getURL("pages/logging.html");
    if (loggingPageUrl != null) { console.log(`Vimium logging URL:\n  ${loggingPageUrl}`); } // Do not output URL for tests.
    // For development, it's sometimes useful to automatically launch the logging page on reload.
    if (localStorage.autoLaunchLoggingPage) { chrome.windows.create({url: loggingPageUrl, focused: false}); }
    return (message, sender = null) => (() => {
      const result = [];
      for (let viewWindow of Array.from(chrome.extension.getViews({type: "tab"}))) {
        if (viewWindow.location.pathname === "/pages/logging.html") {
          // Don't log messages from the logging page itself.  We do this check late because most of the time
          // it's not needed.
          if ((sender != null ? sender.url : undefined) !== loggingPageUrl) {
            const date = new Date;
            let [hours, minutes, seconds, milliseconds] =
              Array.from([date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds()]);
            if (minutes < 10) { minutes = "0" + minutes; }
            if (seconds < 10) { seconds = "0" + seconds; }
            if (milliseconds < 10) { milliseconds = "00" + milliseconds; }
            if (milliseconds < 100) { milliseconds = "0" + milliseconds; }
            const dateString = `${hours}:${minutes}:${seconds}.${milliseconds}`;
            const logElement = viewWindow.document.getElementById("log-text");
            logElement.value += `${dateString}: ${message}\n`;
            result.push(logElement.scrollTop = 2000000000);
          } else {
            result.push(undefined);
          }
        } else {
          result.push(undefined);
        }
      }
      return result;
    })();
  })(),

  // Remove comments and leading/trailing whitespace from a list of lines, and merge lines where the last
  // character on the preceding line is "\".
  parseLines(text) {
    return (() => {
      const result = [];
      for (let line of Array.from(text.replace(/\\\n/g, "").split("\n").map(line => line.trim()))) {
        if (line.length === 0) { continue; }
        if (Array.from('#"').includes(line[0])) { continue; }
        result.push(line);
      }
      return result;
    })();
  },

  escapedEntities: { '"': "&quots;", '&': "&amp;", "'": "&apos;", "<": "&lt;", ">": "&gt;"
},
  escapeAttribute(string) { return string.replace(/["&'<>]/g, char => BgUtils.escapedEntities[char]); }
};

// Utility for parsing and using the custom search-engine configuration.  We re-use the previous parse if the
// search-engine configuration is unchanged.
const SearchEngines = {
  previousSearchEngines: null,
  searchEngines: null,

  refresh(searchEngines) {
    if ((this.previousSearchEngines == null) || (searchEngines !== this.previousSearchEngines)) {
      this.previousSearchEngines = searchEngines;
      return this.searchEngines = new AsyncDataFetcher(function(callback) {
        const engines = {};
        for (let line of Array.from(BgUtils.parseLines(searchEngines))) {
          const tokens = line.split(/\s+/);
          if (2 <= tokens.length) {
            const keyword = tokens[0].split(":")[0];
            const searchUrl = tokens[1];
            const description = tokens.slice(2).join(" ") || `search (${keyword})`;
            if (Utils.hasFullUrlPrefix(searchUrl) || Utils.hasJavascriptPrefix(searchUrl)) {
              engines[keyword] = {keyword, searchUrl, description};
            }
          }
        }

        return callback(engines);
      });
    }
  },

  // Use the parsed search-engine configuration, possibly asynchronously.
  use(callback) {
    return this.searchEngines.use(callback);
  },

  // Both set (refresh) the search-engine configuration and use it at the same time.
  refreshAndUse(searchEngines, callback) {
    this.refresh(searchEngines);
    return this.use(callback);
  }
};

root.SearchEngines = SearchEngines;
root.BgUtils = BgUtils;
