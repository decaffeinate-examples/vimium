/* eslint-disable
    func-names,
    implicit-arrow-linebreak,
    max-len,
    no-param-reassign,
    no-restricted-syntax,
    no-return-assign,
    no-shadow,
    no-undef,
    no-unused-vars,
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

const Marks = {
  // This returns the key which is used for storing mark locations in chrome.storage.sync.
  getLocationKey(markName) { return `vimiumGlobalMark|${markName}`; },

  // Get the part of a URL we use for matching here (that is, everything up to the first anchor).
  getBaseUrl(url) { return url.split('#')[0]; },

  // Create a global mark.  We record vimiumSecret with the mark so that we can tell later, when the mark is
  // used, whether this is the original Vimium session or a subsequent session.  This affects whether or not
  // tabId can be considered valid.
  create(req, sender) {
    return chrome.storage.local.get('vimiumSecret', (items) => {
      const markInfo = {
        vimiumSecret: items.vimiumSecret,
        markName: req.markName,
        url: this.getBaseUrl(sender.tab.url),
        tabId: sender.tab.id,
        scrollX: req.scrollX,
        scrollY: req.scrollY,
      };

      if ((markInfo.scrollX != null) && (markInfo.scrollY != null)) {
        return this.saveMark(markInfo);
      }
      // The front-end frame hasn't provided the scroll position (because it's not the top frame within its
      // tab).  We need to ask the top frame what its scroll position is.
      return chrome.tabs.sendMessage(sender.tab.id, { name: 'getScrollPosition' }, (response) => this.saveMark(extend(markInfo, { scrollX: response.scrollX, scrollY: response.scrollY })));
    });
  },

  saveMark(markInfo) {
    const item = {};
    item[this.getLocationKey(markInfo.markName)] = markInfo;
    return Settings.storage.set(item);
  },

  // Goto a global mark.  We try to find the original tab.  If we can't find that, then we try to find another
  // tab with the original URL, and use that.  And if we can't find such an existing tab, then we create a new
  // one.  Whichever of those we do, we then set the scroll position to the original scroll position.
  goto(req, sender) {
    return chrome.storage.local.get('vimiumSecret', (items) => {
      const {
        vimiumSecret,
      } = items;
      const key = this.getLocationKey(req.markName);
      return Settings.storage.get(key, (items) => {
        const markInfo = items[key];
        if (markInfo.vimiumSecret !== vimiumSecret) {
          // This is a different Vimium instantiation, so markInfo.tabId is definitely out of date.
          return this.focusOrLaunch(markInfo, req);
        }
        // Check whether markInfo.tabId still exists.  According to here (https://developer.chrome.com/extensions/tabs),
        // tab Ids are unqiue within a Chrome session.  So, if we find a match, we can use it.
        return chrome.tabs.get(markInfo.tabId, (tab) => {
          if (!chrome.runtime.lastError && (tab != null ? tab.url : undefined) && (markInfo.url === this.getBaseUrl(tab.url))) {
            // The original tab still exists.
            return this.gotoPositionInTab(markInfo);
          }
          // The original tab no longer exists.
          return this.focusOrLaunch(markInfo, req);
        });
      });
    });
  },

  // Focus an existing tab and scroll to the given position within it.
  gotoPositionInTab({
    tabId, scrollX, scrollY, markName,
  }) {
    return chrome.tabs.update(tabId, { active: true }, () => chrome.tabs.sendMessage(tabId, { name: 'setScrollPosition', scrollX, scrollY }));
  },

  // The tab we're trying to find no longer exists.  We either find another tab with a matching URL and use it,
  // or we create a new tab.
  focusOrLaunch(markInfo, req) {
    // If we're not going to be scrolling to a particular position in the tab, then we choose all tabs with a
    // matching URL prefix.  Otherwise, we require an exact match (because it doesn't make sense to scroll
    // unless there's an exact URL match).
    const query = markInfo.scrollX === markInfo.scrollY && markInfo.scrollY === 0 ? `${markInfo.url}*` : markInfo.url;
    return chrome.tabs.query({ url: query }, (tabs) => {
      if (tabs.length > 0) {
        // We have at least one matching tab.  Pick one and go to it.
        return this.pickTab(tabs, (tab) => this.gotoPositionInTab(extend(markInfo, { tabId: tab.id })));
      }
      // There is no existing matching tab, we'll have to create one.
      return TabOperations.openUrlInNewTab((extend(req, { url: this.getBaseUrl(markInfo.url) })), (tab) =>
      // Note. tabLoadedHandlers is defined in "main.coffee".  The handler below will be called when the tab
      // is loaded, its DOM is ready and it registers with the background page.
        tabLoadedHandlers[tab.id] = () => this.gotoPositionInTab(extend(markInfo, { tabId: tab.id })));
    });
  },

  // Given a list of tabs candidate tabs, pick one.  Prefer tabs in the current window and tabs with shorter
  // (matching) URLs.
  pickTab(tabs, callback) {
    const tabPicker = function ({ id }) {
      // Prefer tabs in the current window, if there are any.
      let tab;
      const tabsInWindow = tabs.filter((tab) => tab.windowId === id);
      if (tabsInWindow.length > 0) { tabs = tabsInWindow; }
      // If more than one tab remains and the current tab is still a candidate, then don't pick the current
      // tab (because jumping to it does nothing).
      if (tabs.length > 1) {
        tabs = ((() => {
          const result = [];
          for (tab of Array.from(tabs)) {
            if (!tab.active) {
              result.push(tab);
            }
          }
          return result;
        })());
      }
      // Prefer shorter URLs.
      tabs.sort((a, b) => a.url.length - b.url.length);
      return callback(tabs[0]);
    };
    if (chrome.windows != null) {
      return chrome.windows.getCurrent(tabPicker);
    }
    return tabPicker({ id: undefined });
  },
};

const root = typeof exports !== 'undefined' && exports !== null ? exports : window;
root.Marks = Marks;
