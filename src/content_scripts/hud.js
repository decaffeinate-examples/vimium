/* eslint-disable
    consistent-return,
    func-names,
    max-len,
    no-multi-assign,
    no-nested-ternary,
    no-param-reassign,
    no-return-assign,
    no-undef,
    no-underscore-dangle,
    no-use-before-define,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
//
// A heads-up-display (HUD) for showing Vimium page operations.
// Note: you cannot interact with the HUD until document.body is available.
//
const HUD = {
  tween: null,
  hudUI: null,
  findMode: null,
  abandon() { return (this.hudUI != null ? this.hudUI.hide(false) : undefined); },

  pasteListener: null, // Set by @pasteFromClipboard to handle the value returned by pasteResponse

  // This HUD is styled to precisely mimick the chrome HUD on Mac. Use the "has_popup_and_link_hud.html"
  // test harness to tweak these styles to match Chrome's. One limitation of our HUD display is that
  // it doesn't sit on top of horizontal scrollbars like Chrome's HUD does.

  init() {
    if (this.hudUI == null) { this.hudUI = new UIComponent('pages/hud.html', 'vimiumHUDFrame', ({ data }) => (typeof this[data.name] === 'function' ? this[data.name](data) : undefined)); }
    return this.tween != null ? this.tween : (this.tween = new Tween('iframe.vimiumHUDFrame.vimiumUIComponentVisible', this.hudUI.shadowDOM));
  },

  showForDuration(text, duration) {
    this.show(text);
    return this._showForDurationTimerId = setTimeout((() => this.hide()), duration);
  },

  show(text) {
    return DomUtils.documentComplete(() => {
      this.init();
      clearTimeout(this._showForDurationTimerId);
      this.hudUI.activate({ name: 'show', text });
      return this.tween.fade(1.0, 150);
    });
  },

  showFindMode(findMode = null) {
    this.findMode = findMode;
    return DomUtils.documentComplete(() => {
      this.init();
      this.hudUI.toggleIframeElementClasses('vimiumUIComponentHidden', 'vimiumUIComponentVisible');
      this.hudUI.activate({ name: 'showFindMode' });
      return this.tween.fade(1.0, 150);
    });
  },

  search(data) {
    // NOTE(mrmr1993): On Firefox, window.find moves the window focus away from the HUD. We use postFindFocus
    // to put it back, so the user can continue typing.
    this.findMode.findInPlace(data.query, { postFindFocus: this.hudUI.iframeElement.contentWindow });

    // Show the number of matches in the HUD UI.
    const matchCount = FindMode.query.parsedQuery.length > 0 ? FindMode.query.matchCount : 0;
    const showMatchText = FindMode.query.rawQuery.length > 0;
    return this.hudUI.postMessage({ name: 'updateMatchesCount', matchCount, showMatchText });
  },

  // Hide the HUD.
  // If :immediate is falsy, then the HUD is faded out smoothly (otherwise it is hidden immediately).
  // If :updateIndicator is truthy, then we also refresh the mode indicator.  The only time we don't update the
  // mode indicator, is when hide() is called for the mode indicator itself.
  hide(immediate, updateIndicator) {
    if (immediate == null) { immediate = false; }
    if (updateIndicator == null) { updateIndicator = true; }
    if ((this.hudUI != null) && (this.tween != null)) {
      clearTimeout(this._showForDurationTimerId);
      this.tween.stop();
      if (immediate) {
        if (updateIndicator) { return Mode.setIndicator(); } return this.hudUI.hide();
      }
      return this.tween.fade(0, 150, () => this.hide(true, updateIndicator));
    }
  },

  // These parameters describe the reason find mode is exiting, and come from the HUD UI component.
  hideFindMode({ exitEventIsEnter, exitEventIsEscape }) {
    let postExit;
    this.findMode.checkReturnToViewPort();

    // An element won't receive a focus event if the search landed on it while we were in the HUD iframe. To
    // end up with the correct modes active, we create a focus/blur event manually after refocusing this
    // window.
    window.focus();

    const focusNode = DomUtils.getSelectionFocusElement();
    if (document.activeElement != null) {
      document.activeElement.blur();
    }
    __guardMethod__(focusNode, 'focus', (o) => o.focus());

    if (exitEventIsEnter) {
      FindMode.handleEnter();
      if (FindMode.query.hasResults) {
        postExit = () => new PostFindMode();
      }
    } else if (exitEventIsEscape) {
      // We don't want FindMode to handle the click events that FindMode.handleEscape can generate, so we
      // wait until the mode is closed before running it.
      postExit = FindMode.handleEscape;
    }

    this.findMode.exit();
    return (typeof postExit === 'function' ? postExit() : undefined);
  },

  // These commands manage copying and pasting from the clipboard in the HUD frame.
  // NOTE(mrmr1993): We need this to copy and paste on Firefox:
  // * an element can't be focused in the background page, so copying/pasting doesn't work
  // * we don't want to disrupt the focus in the page, in case the page is listening for focus/blur events.
  // * the HUD shouldn't be active for this frame while any of the copy/paste commands are running.
  copyToClipboard(text) {
    return DomUtils.documentComplete(() => {
      this.init();
      // Chrome 74 only acknowledges text selection when a frame has been visible. See more in #3277 .
      this.hudUI.toggleIframeElementClasses('vimiumUIComponentHidden', 'vimiumUIComponentVisible');
      return this.hudUI.postMessage({ name: 'copyToClipboard', data: text });
    });
  },

  pasteFromClipboard(pasteListener) {
    this.pasteListener = pasteListener;
    return DomUtils.documentComplete(() => {
      this.init();
      // Show the HUD frame, so Firefox will actually perform the paste.
      this.hudUI.toggleIframeElementClasses('vimiumUIComponentHidden', 'vimiumUIComponentVisible');
      this.tween.fade(0, 0);
      return this.hudUI.postMessage({ name: 'pasteFromClipboard' });
    });
  },

  pasteResponse({ data }) {
    // Hide the HUD frame again.
    this.hudUI.toggleIframeElementClasses('vimiumUIComponentVisible', 'vimiumUIComponentHidden');
    this.unfocusIfFocused();
    return this.pasteListener(data);
  },

  unfocusIfFocused() {
    // On Firefox, if an <iframe> disappears when it's focused, then it will keep "focused",
    // which means keyboard events will always be dispatched to the HUD iframe
    if (this.hudUI != null ? this.hudUI.showing : undefined) {
      this.hudUI.iframeElement.blur();
      return window.focus();
    }
  },
};

class Tween {
  static initClass() {
    this.prototype.opacity = 0;
    this.prototype.intervalId = -1;
    this.prototype.styleElement = null;
  }

  constructor(cssSelector, insertionPoint) {
    this.cssSelector = cssSelector;
    if (insertionPoint == null) { insertionPoint = document.documentElement; }
    this.styleElement = DomUtils.createElement('style');

    if (!this.styleElement.style) {
      // We're in an XML document, so we shouldn't inject any elements. See the comment in UIComponent.
      Tween.prototype.fade = (Tween.prototype.stop = (Tween.prototype.updateStyle = function () {}));
      return;
    }

    this.styleElement.type = 'text/css';
    this.styleElement.innerHTML = '';
    insertionPoint.appendChild(this.styleElement);
  }

  fade(toAlpha, duration, onComplete) {
    clearInterval(this.intervalId);
    const startTime = (new Date()).getTime();
    const fromAlpha = this.opacity;
    const alphaStep = toAlpha - fromAlpha;

    const performStep = () => {
      const elapsed = (new Date()).getTime() - startTime;
      if (elapsed >= duration) {
        clearInterval(this.intervalId);
        this.updateStyle(toAlpha);
        return (typeof onComplete === 'function' ? onComplete() : undefined);
      }
      const value = ((elapsed / duration) * alphaStep) + fromAlpha;
      return this.updateStyle(value);
    };

    this.updateStyle(this.opacity);
    return this.intervalId = setInterval(performStep, 50);
  }

  stop() { return clearInterval(this.intervalId); }

  updateStyle(opacity) {
    this.opacity = opacity;
    return this.styleElement.innerHTML = `\
${this.cssSelector} {
  opacity: ${this.opacity};
}\
`;
  }
}
Tween.initClass();

const root = typeof exports !== 'undefined' && exports !== null ? exports : (window.root != null ? window.root : (window.root = {}));
root.HUD = HUD;
if (typeof exports === 'undefined' || exports === null) { extend(window, root); }

function __guardMethod__(obj, methodName, transform) {
  if (typeof obj !== 'undefined' && obj !== null && typeof obj[methodName] === 'function') {
    return transform(obj, methodName);
  }
  return undefined;
}
