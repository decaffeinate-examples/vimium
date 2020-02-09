/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
class NormalMode extends KeyHandlerMode {
  constructor(options) {
    {
      // Hack: trick Babel/TypeScript into allowing this before super.
      if (false) { super(); }
      let thisFn = (() => { return this; }).toString();
      let thisName = thisFn.match(/return (?:_assertThisInitialized\()*(\w+)\)*;/)[1];
      eval(`${thisName} = this;`);
    }
    if (options == null) { options = {}; }
    const defaults = {
      name: "normal",
      indicator: false, // There is normally no mode indicator in normal mode.
      commandHandler: this.commandHandler.bind(this)
    };

    super(extend(defaults, options));

    chrome.storage.local.get("normalModeKeyStateMapping", items => {
      return this.setKeyMapping(items.normalModeKeyStateMapping);
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if ((area === "local") && (changes.normalModeKeyStateMapping != null ? changes.normalModeKeyStateMapping.newValue : undefined)) {
        return this.setKeyMapping(changes.normalModeKeyStateMapping.newValue);
      }
    });
  }

  commandHandler({command: registryEntry, count}) {
    count *= registryEntry.options.count != null ? registryEntry.options.count : 1;
    if (registryEntry.noRepeat) { count = 1; }

    if ((registryEntry.repeatLimit != null) && (registryEntry.repeatLimit < count)) {
      if (!confirm(`\
You have asked Vimium to perform ${count} repetitions of the command: ${registryEntry.description}.\n
Are you sure you want to continue?`
      )) { return; }
    }

    if (registryEntry.topFrame) {
      // We never return to a UI-component frame (e.g. the help dialog), it might have lost the focus.
      const sourceFrameId = window.isVimiumUIComponent ? 0 : frameId;
      return chrome.runtime.sendMessage({
        handler: "sendMessageToFrames", message: {name: "runInTopFrame", sourceFrameId, registryEntry}});
    } else if (registryEntry.background) {
      return chrome.runtime.sendMessage({handler: "runBackgroundCommand", registryEntry, count});
    } else {
      return NormalModeCommands[registryEntry.command](count, {registryEntry});
    }
  }
}

const enterNormalMode = count => new NormalMode({
  indicator: "Normal mode (pass keys disabled)",
  exitOnEscape: true,
  singleton: "enterNormalMode",
  count
});

var NormalModeCommands = {
  // Scrolling.
  scrollToBottom() {
    Marks.setPreviousPosition();
    return Scroller.scrollTo("y", "max");
  },
  scrollToTop(count) {
    Marks.setPreviousPosition();
    return Scroller.scrollTo("y", (count - 1) * Settings.get("scrollStepSize"));
  },
  scrollToLeft() { return Scroller.scrollTo("x", 0); },
  scrollToRight() { return Scroller.scrollTo("x", "max"); },
  scrollUp(count) { return Scroller.scrollBy("y", -1 * Settings.get("scrollStepSize") * count); },
  scrollDown(count) { return Scroller.scrollBy("y", Settings.get("scrollStepSize") * count); },
  scrollPageUp(count) { return Scroller.scrollBy("y", "viewSize", (-1/2) * count); },
  scrollPageDown(count) { return Scroller.scrollBy("y", "viewSize", (1/2) * count); },
  scrollFullPageUp(count) { return Scroller.scrollBy("y", "viewSize", -1 * count); },
  scrollFullPageDown(count) { return Scroller.scrollBy("y", "viewSize", 1 * count); },
  scrollLeft(count) { return Scroller.scrollBy("x", -1 * Settings.get("scrollStepSize") * count); },
  scrollRight(count) { return Scroller.scrollBy("x", Settings.get("scrollStepSize") * count); },

  // Tab navigation: back, forward.
  goBack(count) { return history.go(-count); },
  goForward(count) { return history.go(count); },

  // Url manipulation.
  goUp(count) {
    let url = window.location.href;
    if (url[url.length - 1] === "/") {
      url = url.substring(0, url.length - 1);
    }

    let urlsplit = url.split("/");
    // make sure we haven't hit the base domain yet
    if (urlsplit.length > 3) {
      urlsplit = urlsplit.slice(0, Math.max(3, urlsplit.length - count));
      return window.location.href = urlsplit.join('/');
    }
  },

  goToRoot() {
    return window.location.href = window.location.origin;
  },

  toggleViewSource() {
    return chrome.runtime.sendMessage({ handler: "getCurrentTabUrl" }, function(url) {
      if (url.substr(0, 12) === "view-source:") {
        url = url.substr(12, url.length - 12);
      } else {
        url = "view-source:" + url;
      }
      return chrome.runtime.sendMessage({handler: "openUrlInNewTab", url});
  });
  },

  copyCurrentUrl() {
    return chrome.runtime.sendMessage({ handler: "getCurrentTabUrl" }, function(url) {
      HUD.copyToClipboard(url);
      if (28 < url.length) { url = url.slice(0, 26) + "...."; }
      return HUD.showForDuration(`Yanked ${url}`, 2000);
    });
  },

  openCopiedUrlInNewTab(count) {
    return HUD.pasteFromClipboard(url => chrome.runtime.sendMessage({ handler: "openUrlInNewTab", url, count }));
  },

  openCopiedUrlInCurrentTab() {
    return HUD.pasteFromClipboard(url => chrome.runtime.sendMessage({ handler: "openUrlInCurrentTab", url }));
  },

  // Mode changes.
  enterInsertMode() {
    // If a focusable element receives the focus, then we exit and leave the permanently-installed insert-mode
    // instance to take over.
    return new InsertMode({global: true, exitOnFocus: true});
  },

  enterVisualMode() {
    return new VisualMode({userLaunchedMode: true});
  },

  enterVisualLineMode() {
    return new VisualLineMode({userLaunchedMode: true});
  },

  enterFindMode() {
    Marks.setPreviousPosition();
    return new FindMode();
  },

  // Find.
  performFind(count) { return (() => {
    const result = [];
    for (let i = 0, end = count; i < end; i++) {
      result.push(FindMode.findNext(false));
    }
    return result;
  })(); },
  performBackwardsFind(count) { return (() => {
    const result = [];
    for (let i = 0, end = count; i < end; i++) {
      result.push(FindMode.findNext(true));
    }
    return result;
  })(); },

  // Misc.
  mainFrame() { return focusThisFrame({highlight: true, forceFocusThisFrame: true}); },
  showHelp(sourceFrameId) { return HelpDialog.toggle({sourceFrameId, showAllCommandDetails: false}); },

  passNextKey(count, options) {
    if (options.registryEntry.options.normal) {
      return enterNormalMode(count);
    } else {
      return new PassNextKeyMode(count);
    }
  },

  goPrevious() {
    const previousPatterns = Settings.get("previousPatterns") || "";
    const previousStrings = previousPatterns.split(",").filter( s => s.trim().length);
    return findAndFollowRel("prev") || findAndFollowLink(previousStrings);
  },

  goNext() {
    const nextPatterns = Settings.get("nextPatterns") || "";
    const nextStrings = nextPatterns.split(",").filter( s => s.trim().length);
    return findAndFollowRel("next") || findAndFollowLink(nextStrings);
  },

  focusInput(count) {
    // Focus the first input element on the page, and create overlays to highlight all the input elements, with
    // the currently-focused element highlighted specially. Tabbing will shift focus to the next input element.
    // Pressing any other key will remove the overlays and the special tab behavior.
    const resultSet = DomUtils.evaluateXPath(textInputXPath, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
    const visibleInputs =
      (() => {
      const result = [];
      for (let i = 0, end = resultSet.snapshotLength; i < end; i++) {
        const element = resultSet.snapshotItem(i);
        if (!DomUtils.getVisibleClientRect(element, true)) { continue; }
        result.push({ element, index: i, rect: Rect.copy(element.getBoundingClientRect()) });
      }
      return result;
    })();

    visibleInputs.sort(function({element: element1, index: i1}, {element: element2, index: i2}) {
      // Put elements with a lower positive tabIndex first, keeping elements in DOM order.
      if (element1.tabIndex > 0) {
        if (element2.tabIndex > 0) {
          const tabDifference = element1.tabIndex - element2.tabIndex;
          if (tabDifference !== 0) {
            return tabDifference;
          } else {
            return i1 - i2;
          }
        } else {
          return -1;
        }
      } else if (element2.tabIndex > 0) {
        return 1;
      } else {
        return i1 - i2;
      }
    });

    if (visibleInputs.length === 0) {
      HUD.showForDuration("There are no inputs to focus.", 1000);
      return;
    }

    // This is a hack to improve usability on the Vimium options page.  We prime the recently-focused input
    // to be the key-mappings input.  Arguably, this is the input that the user is most likely to use.
    const recentlyFocusedElement = lastFocusedInput();

    const selectedInputIndex =
      (() => {
      if (count === 1) {
        // As the starting index, we pick that of the most recently focused input element (or 0).
        const elements = visibleInputs.map(visibleInput => visibleInput.element);
        return Math.max(0, elements.indexOf(recentlyFocusedElement));
      } else {
        return Math.min(count, visibleInputs.length) - 1;
      }
    })();

    const hints = (() => {
      const result1 = [];
      for (let tuple of Array.from(visibleInputs)) {
        const hint = DomUtils.createElement("div");
        hint.className = "vimiumReset internalVimiumInputHint vimiumInputHint";

        // minus 1 for the border
        hint.style.left = (tuple.rect.left - 1) + window.scrollX + "px";
        hint.style.top = (tuple.rect.top - 1) + window.scrollY  + "px";
        hint.style.width = tuple.rect.width + "px";
        hint.style.height = tuple.rect.height + "px";

        result1.push(hint);
      }
      return result1;
    })();

    return new FocusSelector(hints, visibleInputs, selectedInputIndex);
  }
};

if (typeof LinkHints !== 'undefined' && LinkHints !== null) {
  extend(NormalModeCommands, {
    "LinkHints.activateMode": LinkHints.activateMode.bind(LinkHints),
    "LinkHints.activateModeToOpenInNewTab": LinkHints.activateModeToOpenInNewTab.bind(LinkHints),
    "LinkHints.activateModeToOpenInNewForegroundTab": LinkHints.activateModeToOpenInNewForegroundTab.bind(LinkHints),
    "LinkHints.activateModeWithQueue": LinkHints.activateModeWithQueue.bind(LinkHints),
    "LinkHints.activateModeToOpenIncognito": LinkHints.activateModeToOpenIncognito.bind(LinkHints),
    "LinkHints.activateModeToDownloadLink": LinkHints.activateModeToDownloadLink.bind(LinkHints),
    "LinkHints.activateModeToCopyLinkUrl": LinkHints.activateModeToCopyLinkUrl.bind(LinkHints)
  }
  );
}

if (typeof Vomnibar !== 'undefined' && Vomnibar !== null) {
  extend(NormalModeCommands, {
    "Vomnibar.activate": Vomnibar.activate.bind(Vomnibar),
    "Vomnibar.activateInNewTab": Vomnibar.activateInNewTab.bind(Vomnibar),
    "Vomnibar.activateTabSelection": Vomnibar.activateTabSelection.bind(Vomnibar),
    "Vomnibar.activateBookmarks": Vomnibar.activateBookmarks.bind(Vomnibar),
    "Vomnibar.activateBookmarksInNewTab": Vomnibar.activateBookmarksInNewTab.bind(Vomnibar),
    "Vomnibar.activateEditUrl": Vomnibar.activateEditUrl.bind(Vomnibar),
    "Vomnibar.activateEditUrlInNewTab": Vomnibar.activateEditUrlInNewTab.bind(Vomnibar)
  }
  );
}

if (typeof Marks !== 'undefined' && Marks !== null) {
  extend(NormalModeCommands, {
    "Marks.activateCreateMode": Marks.activateCreateMode.bind(Marks),
    "Marks.activateGotoMode": Marks.activateGotoMode.bind(Marks)
  }
  );
}

// The types in <input type="..."> that we consider for focusInput command. Right now this is recalculated in
// each content script. Alternatively we could calculate it once in the background page and use a request to
// fetch it each time.
// Should we include the HTML5 date pickers here?

// The corresponding XPath for such elements.
var textInputXPath = (function() {
  const textInputTypes = [ "text", "search", "email", "url", "number", "password", "date", "tel" ];
  const inputElements = ["input[" +
    "(" + textInputTypes.map(type => '@type="' + type + '"').join(" or ") + "or not(@type))" +
    " and not(@disabled or @readonly)]",
    "textarea", "*[@contenteditable='' or translate(@contenteditable, 'TRUE', 'true')='true']"];
  return (typeof DomUtils !== 'undefined' && DomUtils !== null ? DomUtils.makeXPath(inputElements) : undefined);
})();

// used by the findAndFollow* functions.
const followLink = function(linkElement) {
  if (linkElement.nodeName.toLowerCase() === "link") {
    return window.location.href = linkElement.href;
  } else {
    // if we can click on it, don't simply set location.href: some next/prev links are meant to trigger AJAX
    // calls, like the 'more' button on GitHub's newsfeed.
    linkElement.scrollIntoView();
    return DomUtils.simulateClick(linkElement);
  }
};

//
// Find and follow a link which matches any one of a list of strings. If there are multiple such links, they
// are prioritized for shortness, by their position in :linkStrings, how far down the page they are located,
// and finally by whether the match is exact. Practically speaking, this means we favor 'next page' over 'the
// next big thing', and 'more' over 'nextcompany', even if 'next' occurs before 'more' in :linkStrings.
//
var findAndFollowLink = function(linkStrings) {
  let link, linkString;
  const linksXPath = DomUtils.makeXPath(["a", "*[@onclick or @role='link' or contains(@class, 'button')]"]);
  const links = DomUtils.evaluateXPath(linksXPath, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
  let candidateLinks = [];

  // at the end of this loop, candidateLinks will contain all visible links that match our patterns
  // links lower in the page are more likely to be the ones we want, so we loop through the snapshot backwards
  for (let i = links.snapshotLength - 1; i >= 0; i--) {
    link = links.snapshotItem(i);

    // ensure link is visible (we don't mind if it is scrolled offscreen)
    const boundingClientRect = link.getBoundingClientRect();
    if ((boundingClientRect.width === 0) || (boundingClientRect.height === 0)) {
      continue;
    }
    const computedStyle = window.getComputedStyle(link, null);
    if ((computedStyle.getPropertyValue("visibility") !== "visible") ||
        (computedStyle.getPropertyValue("display") === "none")) {
      continue;
    }

    let linkMatches = false;
    for (linkString of Array.from(linkStrings)) {
      if ((link.innerText.toLowerCase().indexOf(linkString) !== -1) ||
          (0 <= __guardMethod__(link.value, 'indexOf', o => o.indexOf(linkString)))) {
        linkMatches = true;
        break;
      }
    }
    if (!linkMatches) { continue; }

    candidateLinks.push(link);
  }

  if (candidateLinks.length === 0) { return; }

  for (link of Array.from(candidateLinks)) {
    link.wordCount = link.innerText.trim().split(/\s+/).length;
  }

  // We can use this trick to ensure that Array.sort is stable. We need this property to retain the reverse
  // in-page order of the links.

  candidateLinks.forEach((a, i) => a.originalIndex = i);

  // favor shorter links, and ignore those that are more than one word longer than the shortest link
  candidateLinks =
    candidateLinks
      .sort(function(a, b) {
        if (a.wordCount === b.wordCount) { return a.originalIndex - b.originalIndex; } else { return a.wordCount - b.wordCount; }
      })
      .filter(a => a.wordCount <= (candidateLinks[0].wordCount + 1));

  for (linkString of Array.from(linkStrings)) {
    const exactWordRegex =
      /\b/.test(linkString[0]) || /\b/.test(linkString[linkString.length - 1]) ?
        new RegExp("\\b" + linkString + "\\b", "i")
      :
        new RegExp(linkString, "i");
    for (let candidateLink of Array.from(candidateLinks)) {
      if (exactWordRegex.test(candidateLink.innerText) ||
          (candidateLink.value && exactWordRegex.test(candidateLink.value))) {
        followLink(candidateLink);
        return true;
      }
    }
  }
  return false;
};

var findAndFollowRel = function(value) {
  const relTags = ["link", "a", "area"];
  for (let tag of Array.from(relTags)) {
    const elements = document.getElementsByTagName(tag);
    for (let element of Array.from(elements)) {
      if (element.hasAttribute("rel") && (element.rel.toLowerCase() === value)) {
        followLink(element);
        return true;
      }
    }
  }
};

class FocusSelector extends Mode {
  constructor(hints, visibleInputs, selectedInputIndex) {
    super({
      name: "focus-selector",
      exitOnClick: true,
      keydown: event => {
        if (event.key === "Tab") {
          hints[selectedInputIndex].classList.remove('internalVimiumSelectedInputHint');
          selectedInputIndex += hints.length + (event.shiftKey ? -1 : 1);
          selectedInputIndex %= hints.length;
          hints[selectedInputIndex].classList.add('internalVimiumSelectedInputHint');
          DomUtils.simulateSelect(visibleInputs[selectedInputIndex].element);
          return this.suppressEvent;
        } else if (event.key !== "Shift") {
          this.exit();
          // Give the new mode the opportunity to handle the event.
          return this.restartBubbling;
        }
      }
    });

    this.hintContainingDiv = DomUtils.addElementList(hints, {
      id: "vimiumInputMarkerContainer",
      className: "vimiumReset"
    }
    );

    DomUtils.simulateSelect(visibleInputs[selectedInputIndex].element);
    if (visibleInputs.length === 1) {
      this.exit();
      return;
    } else {
      hints[selectedInputIndex].classList.add('internalVimiumSelectedInputHint');
    }
  }

  exit() {
    super.exit();
    DomUtils.removeElement(this.hintContainingDiv);
    if (document.activeElement && DomUtils.isEditable(document.activeElement)) {
      return new InsertMode({
        singleton: "post-find-mode/focus-input",
        targetElement: document.activeElement,
        indicator: false
      });
    }
  }
}

const root = typeof exports !== 'undefined' && exports !== null ? exports : (window.root != null ? window.root : (window.root = {}));
root.NormalMode = NormalMode;
root.NormalModeCommands = NormalModeCommands;
if (typeof exports === 'undefined' || exports === null) { extend(window, root); }

function __guardMethod__(obj, methodName, transform) {
  if (typeof obj !== 'undefined' && obj !== null && typeof obj[methodName] === 'function') {
    return transform(obj, methodName);
  } else {
    return undefined;
  }
}