/* eslint-disable
    consistent-return,
    func-names,
    max-len,
    no-cond-assign,
    no-continue,
    no-empty,
    no-mixed-spaces-and-tabs,
    no-multi-assign,
    no-nested-ternary,
    no-param-reassign,
    no-restricted-globals,
    no-restricted-syntax,
    no-return-assign,
    no-script-url,
    no-shadow,
    no-tabs,
    no-undef,
    no-var,
    radix,
    vars-on-top,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS104: Avoid inline assignments
 * DS204: Change includes calls to have a more natural evaluation order
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
var DomUtils = {
  //
  // Runs :callback if the DOM has loaded, otherwise runs it on load
  //
  documentReady: (function () {
    let [isReady, callbacks] = Array.from([document.readyState !== 'loading', []]);
    if (!isReady) {
      let onDOMContentLoaded;
      window.addEventListener('DOMContentLoaded', (onDOMContentLoaded = forTrusted(() => {
        window.removeEventListener('DOMContentLoaded', onDOMContentLoaded, true);
        isReady = true;
        for (const callback of Array.from(callbacks)) { callback(); }
        return callbacks = null;
      })), true);
    }

    return function (callback) { if (isReady) { return callback(); } return callbacks.push(callback); };
  }()),

  documentComplete: (function () {
    let [isComplete, callbacks] = Array.from([document.readyState === 'complete', []]);
    if (!isComplete) {
      let onLoad;
      window.addEventListener('load', (onLoad = forTrusted((event) => {
        // The target is ensured to be on document. See https://w3c.github.io/uievents/#event-type-load
        if (event.target !== document) { return; }
        window.removeEventListener('load', onLoad, true);
        isComplete = true;
        for (const callback of Array.from(callbacks)) { callback(); }
        return callbacks = null;
      })), true);
    }

    return function (callback) { if (isComplete) { return callback(); } return callbacks.push(callback); };
  }()),

  createElement(tagName) {
    const element = document.createElement(tagName);
    if (element instanceof HTMLElement) {
      // The document namespace provides (X)HTML elements, so we can use them directly.
      this.createElement = (tagName) => document.createElement(tagName);
      return element;
    }
    // The document namespace doesn't give (X)HTML elements, so we create them with the correct namespace
    // manually.
    this.createElement = (tagName) => document.createElementNS('http://www.w3.org/1999/xhtml', tagName);
    return this.createElement(tagName);
  },

  //
  // Adds a list of elements to a page.
  // Note that adding these nodes all at once (via the parent div) is significantly faster than one-by-one.
  //
  addElementList(els, overlayOptions) {
    const parent = this.createElement('div');
    if (overlayOptions.id != null) { parent.id = overlayOptions.id; }
    if (overlayOptions.className != null) { parent.className = overlayOptions.className; }
    for (const el of Array.from(els)) { parent.appendChild(el); }

    document.documentElement.appendChild(parent);
    return parent;
  },

  //
  // Remove an element from its DOM tree.
  //
  removeElement(el) { return el.parentNode.removeChild(el); },

  //
  // Test whether the current frame is the top/main frame.
  //
  isTopFrame() {
    return window.top === window.self;
  },

  //
  // Takes an array of XPath selectors, adds the necessary namespaces (currently only XHTML), and applies them
  // to the document root. The namespaceResolver in evaluateXPath should be kept in sync with the namespaces
  // here.
  //
  makeXPath(elementArray) {
    const xpath = [];
    for (const element of Array.from(elementArray)) {
      xpath.push(`.//${element}`, `.//xhtml:${element}`);
    }
    return xpath.join(' | ');
  },

  // Evaluates an XPath on the whole document, or on the contents of the fullscreen element if an element is
  // fullscreen.
  evaluateXPath(xpath, resultType) {
    const contextNode = document.webkitIsFullScreen ? document.webkitFullscreenElement : document.documentElement;
    const namespaceResolver = function (namespace) {
      if (namespace === 'xhtml') { return 'http://www.w3.org/1999/xhtml'; } return null;
    };
    return document.evaluate(xpath, contextNode, namespaceResolver, resultType, null);
  },

  //
  // Returns the first visible clientRect of an element if it exists. Otherwise it returns null.
  //
  // WARNING: If testChildren = true then the rects of visible (eg. floated) children may be returned instead.
  // This is used for LinkHints and focusInput, **BUT IS UNSUITABLE FOR MOST OTHER PURPOSES**.
  //
  getVisibleClientRect(element, testChildren) {
    // Note: this call will be expensive if we modify the DOM in between calls.
    let clientRect;
    if (testChildren == null) { testChildren = false; }
    const clientRects = ((() => {
      const result = [];
      for (clientRect of Array.from(element.getClientRects())) {
        result.push(Rect.copy(clientRect));
      }
      return result;
    })());

    // Inline elements with font-size: 0px; will declare a height of zero, even if a child with non-zero
    // font-size contains text.
    var isInlineZeroHeight = function () {
      const elementComputedStyle = window.getComputedStyle(element, null);
      const isInlineZeroFontSize = (elementComputedStyle.getPropertyValue('display').indexOf('inline') === 0)
        && (elementComputedStyle.getPropertyValue('font-size') === '0px');
      // Override the function to return this value for the rest of this context.
      isInlineZeroHeight = () => isInlineZeroFontSize;
      return isInlineZeroFontSize;
    };

    for (clientRect of Array.from(clientRects)) {
      // If the link has zero dimensions, it may be wrapping visible but floated elements. Check for this.
      var computedStyle;
      if (((clientRect.width === 0) || (clientRect.height === 0)) && testChildren) {
        for (const child of Array.from(element.children)) {
          var needle;
          computedStyle = window.getComputedStyle(child, null);
          // Ignore child elements which are not floated and not absolutely positioned for parent elements
          // with zero width/height, as long as the case described at isInlineZeroHeight does not apply.
          // NOTE(mrmr1993): This ignores floated/absolutely positioned descendants nested within inline
          // children.
          if ((computedStyle.getPropertyValue('float') === 'none')
            && !((needle = computedStyle.getPropertyValue('position'), ['absolute', 'fixed'].includes(needle)))
            && !((clientRect.height === 0) && isInlineZeroHeight()
              && (computedStyle.getPropertyValue('display').indexOf('inline') === 0))) { continue; }
          const childClientRect = this.getVisibleClientRect(child, true);
          if ((childClientRect === null) || (childClientRect.width < 3) || (childClientRect.height < 3)) { continue; }
          return childClientRect;
        }
      } else {
        clientRect = this.cropRectToVisible(clientRect);

        if ((clientRect === null) || (clientRect.width < 3) || (clientRect.height < 3)) { continue; }

        // eliminate invisible elements (see test_harnesses/visibility_test.html)
        computedStyle = window.getComputedStyle(element, null);
        if (computedStyle.getPropertyValue('visibility') !== 'visible') { continue; }

        return clientRect;
      }
    }

    return null;
  },

  //
  // Bounds the rect by the current viewport dimensions. If the rect is offscreen or has a height or width < 3
  // then null is returned instead of a rect.
  //
  cropRectToVisible(rect) {
    const boundedRect = Rect.create(
      Math.max(rect.left, 0),
      Math.max(rect.top, 0),
      rect.right,
      rect.bottom,
    );
    if ((boundedRect.top >= (window.innerHeight - 4)) || (boundedRect.left >= (window.innerWidth - 4))) {
      return null;
    }
    return boundedRect;
  },

  //
  // Get the client rects for the <area> elements in a <map> based on the position of the <img> element using
  // the map. Returns an array of rects.
  //
  getClientRectsForAreas(imgClientRect, areas) {
    const rects = [];
    for (const area of Array.from(areas)) {
      var x1; var x2; var y1; var
        y2;
      const coords = area.coords.split(',').map((coord) => parseInt(coord, 10));
      const shape = area.shape.toLowerCase();
      if (['rect', 'rectangle'].includes(shape)) { // "rectangle" is an IE non-standard.
        [x1, y1, x2, y2] = Array.from(coords);
      } else if (['circle', 'circ'].includes(shape)) { // "circ" is an IE non-standard.
        const [x, y, r] = Array.from(coords);
        const diff = r / Math.sqrt(2); // Gives us an inner square
        x1 = x - diff;
        x2 = x + diff;
        y1 = y - diff;
        y2 = y + diff;
      } else if (shape === 'default') {
        [x1, y1, x2, y2] = Array.from([0, 0, imgClientRect.width, imgClientRect.height]);
      } else {
        // Just consider the rectangle surrounding the first two points in a polygon. It's possible to do
        // something more sophisticated, but likely not worth the effort.
        [x1, y1, x2, y2] = Array.from(coords);
      }

      let rect = Rect.translate((Rect.create(x1, y1, x2, y2)), imgClientRect.left, imgClientRect.top);
      rect = this.cropRectToVisible(rect);

      if (rect && !isNaN(rect.top)) { rects.push({ element: area, rect }); }
    }
    return rects;
  },

  //
  // Selectable means that we should use the simulateSelect method to activate the element instead of a click.
  //
  // The html5 input types that should use simulateSelect are:
  //   ["date", "datetime", "datetime-local", "email", "month", "number", "password", "range", "search",
  //    "tel", "text", "time", "url", "week"]
  // An unknown type will be treated the same as "text", in the same way that the browser does.
  //
  isSelectable(element) {
    if (!(element instanceof Element)) { return false; }
    const unselectableTypes = ['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'reset', 'submit'];
    return ((element.nodeName.toLowerCase() === 'input') && (unselectableTypes.indexOf(element.type) === -1))
        || (element.nodeName.toLowerCase() === 'textarea') || element.isContentEditable;
  },

  // Input or text elements are considered focusable and able to receieve their own keyboard events, and will
  // enter insert mode if focused. Also note that the "contentEditable" attribute can be set on any element
  // which makes it a rich text editor, like the notes on jjot.com.
  isEditable(element) {
    return (this.isSelectable(element)) || ((element.nodeName != null ? element.nodeName.toLowerCase() : undefined) === 'select');
  },

  // Embedded elements like Flash and quicktime players can obtain focus.
  isEmbed(element) {
    let needle;
    return (needle = element.nodeName != null ? element.nodeName.toLowerCase() : undefined, ['embed', 'object'].includes(needle));
  },

  isFocusable(element) {
    return element && (this.isEditable(element) || this.isEmbed(element));
  },

  isDOMDescendant(parent, child) {
    let node = child;
    while (node !== null) {
      if (node === parent) { return true; }
      node = node.parentNode;
    }
    return false;
  },

  // True if element is editable and contains the active selection range.
  isSelected(element) {
    const selection = document.getSelection();
    if (element.isContentEditable) {
      const node = selection.anchorNode;
      return node && this.isDOMDescendant(element, node);
    }
    if ((DomUtils.getSelectionType(selection) === 'Range') && selection.isCollapsed) {
	      // The selection is inside the Shadow DOM of a node. We can check the node it registers as being
	      // before, since this represents the node whose Shadow DOM it's inside.
      const containerNode = selection.anchorNode.childNodes[selection.anchorOffset];
      return element === containerNode; // True if the selection is inside the Shadow DOM of our element.
    }
    return false;
  },

  simulateSelect(element) {
    // If element is already active, then we don't move the selection.  However, we also won't get a new focus
    // event.  So, instead we pretend (to any active modes which care, e.g. PostFindMode) that element has been
    // clicked.
    if ((element === document.activeElement) && DomUtils.isEditable(document.activeElement)) {
      return handlerStack.bubbleEvent('click', { target: element });
    }
    element.focus();
    if (element.tagName.toLowerCase() !== 'textarea') {
      // If the cursor is at the start of the (non-textarea) element's contents, send it to the end. Motivation:
      // * the end is a more useful place to focus than the start,
      // * this way preserves the last used position (except when it's at the beginning), so the user can
      //   'resume where they left off'.
      // NOTE(mrmr1993): Some elements throw an error when we try to access their selection properties, so
      // wrap this with a try.
      try {
        if ((element.selectionStart === 0) && (element.selectionEnd === 0)) {
          return element.setSelectionRange(element.value.length, element.value.length);
        }
      } catch (error) {}
    }
  },

  simulateClick(element, modifiers) {
    if (modifiers == null) { modifiers = {}; }
    const eventSequence = ['mouseover', 'mousedown', 'mouseup', 'click'];
    return (() => {
      const result = [];
      for (const event of Array.from(eventSequence)) {
        const defaultActionShouldTrigger = Utils.isFirefox() && (Object.keys(modifiers).length === 0) && (event === 'click')
              && (element.target === '_blank') && element.href
              && !element.hasAttribute('onclick') && !element.hasAttribute('_vimium-has-onclick-listener')
        // Simulating a click on a target "_blank" element triggers the Firefox popup blocker.
        // Note(smblott) This will be incorrect if there is a click listener on the element.
          ? true
          : this.simulateMouseEvent(event, element, modifiers);
        if ((event === 'click') && defaultActionShouldTrigger && Utils.isFirefox()) {
          // Firefox doesn't (currently) trigger the default action for modified keys.
          if ((Object.keys(modifiers).length > 0) || (element.target === '_blank')) {
            DomUtils.simulateClickDefaultAction(element, modifiers);
          }
        }
        result.push(defaultActionShouldTrigger);
      }
      return result;
    })();
  }, // return the values returned by each @simulateMouseEvent call.

  simulateMouseEvent: (function () {
    let lastHoveredElement;
    return function (event, element, modifiers) {
      if (modifiers == null) { modifiers = {}; }
      if (event === 'mouseout') {
        if (element == null) { element = lastHoveredElement; } // Allow unhovering the last hovered element by passing undefined.
        lastHoveredElement = undefined;
        if (element == null) { return; }
      } else if (event === 'mouseover') {
        // Simulate moving the mouse off the previous element first, as if we were a real mouse.
        this.simulateMouseEvent('mouseout', undefined, modifiers);
        lastHoveredElement = element;
      }

      const mouseEvent = document.createEvent('MouseEvents');
      mouseEvent.initMouseEvent(event, true, true, window, 1, 0, 0, 0, 0, modifiers.ctrlKey, modifiers.altKey,
        modifiers.shiftKey, modifiers.metaKey, 0, null);
      // Debugging note: Firefox will not execute the element's default action if we dispatch this click event,
      // but Webkit will. Dispatching a click on an input box does not seem to focus it; we do that separately
      return element.dispatchEvent(mouseEvent);
    };
  }()),

  simulateClickDefaultAction(element, modifiers) {
    let newTabModifier;
    if (modifiers == null) { modifiers = {}; }
    if (((element.tagName != null ? element.tagName.toLowerCase() : undefined) !== 'a') || !element.href) { return; }

    const {
      ctrlKey, shiftKey, metaKey, altKey,
    } = modifiers;

    // Mac uses a different new tab modifier (meta vs. ctrl).
    if (KeyboardUtils.platform === 'Mac') {
      newTabModifier = (metaKey === true) && (ctrlKey === false);
    } else {
      newTabModifier = (metaKey === false) && (ctrlKey === true);
    }

    if (newTabModifier) {
      // Open in new tab. Shift determines whether the tab is focused when created. Alt is ignored.
      chrome.runtime.sendMessage({
        handler: 'openUrlInNewTab',
        url: element.href,
        active:
        shiftKey === true,
      });
    } else if ((shiftKey === true) && (metaKey === false) && (ctrlKey === false) && (altKey === false)) {
      // Open in new window.
      chrome.runtime.sendMessage({ handler: 'openUrlInNewWindow', url: element.href });
    } else if (element.target === '_blank') {
      chrome.runtime.sendMessage({ handler: 'openUrlInNewTab', url: element.href, active: true });
    }
  },

  addFlashRect(rect) {
    const flashEl = this.createElement('div');
    flashEl.classList.add('vimiumReset');
    flashEl.classList.add('vimiumFlash');
    flashEl.style.left = `${rect.left}px`;
    flashEl.style.top = `${rect.top}px`;
    flashEl.style.width = `${rect.width}px`;
    flashEl.style.height = `${rect.height}px`;
    document.documentElement.appendChild(flashEl);
    return flashEl;
  },

  // momentarily flash a rectangular border to give user some visual feedback
  flashRect(rect) {
    const flashEl = this.addFlashRect(rect);
    return setTimeout((() => DomUtils.removeElement(flashEl)), 400);
  },

  getViewportTopLeft() {
    const box = document.documentElement;
    const style = getComputedStyle(box);
    const rect = box.getBoundingClientRect();
    if ((style.position === 'static') && !/content|paint|strict/.test(style.contain || '')) {
      // The margin is included in the client rect, so we need to subtract it back out.
      const marginTop = parseInt(style.marginTop);
      const marginLeft = parseInt(style.marginLeft);
      return { top: -rect.top + marginTop, left: -rect.left + marginLeft };
    }
    let clientLeft; let
      clientTop;
    if (Utils.isFirefox()) {
      // These are always 0 for documentElement on Firefox, so we derive them from CSS border.
      clientTop = parseInt(style.borderTopWidth);
      clientLeft = parseInt(style.borderLeftWidth);
    } else {
      ({ clientTop, clientLeft } = box);
    }
    return { top: -rect.top - clientTop, left: -rect.left - clientLeft };
  },


  suppressPropagation(event) {
    return event.stopImmediatePropagation();
  },

  suppressEvent(event) {
    event.preventDefault();
    return this.suppressPropagation(event);
  },

  consumeKeyup: (function () {
    let handlerId = null;

    return function (event, callback = null, suppressPropagation) {
      if (!event.repeat) {
        if (handlerId != null) { handlerStack.remove(handlerId); }
        const {
          code,
        } = event;
        handlerId = handlerStack.push({
          _name: 'dom_utils/consumeKeyup',
          keyup(event) {
            if (event.code !== code) { return handlerStack.continueBubbling; }
            this.remove();
            if (suppressPropagation) {
              DomUtils.suppressPropagation(event);
            } else {
              DomUtils.suppressEvent(event);
            }
            return handlerStack.continueBubbling;
          },
          // We cannot track keyup events if we lose the focus.
          blur(event) {
            if (event.target === window) { this.remove(); }
            return handlerStack.continueBubbling;
          },
        });
      }
      if (typeof callback === 'function') {
        callback();
      }
      if (suppressPropagation) {
        DomUtils.suppressPropagation(event);
        return handlerStack.suppressPropagation;
      }
      DomUtils.suppressEvent(event);
      return handlerStack.suppressEvent;
    };
  }()),

  // Polyfill for selection.type (which is not available in Firefox).
  getSelectionType(selection) {
    if (selection == null) { selection = document.getSelection(); }
    return selection.type || (function () {
      if (selection.rangeCount === 0) {
        return 'None';
      } if (selection.isCollapsed) {
        return 'Caret';
      }
      return 'Range';
    }());
  },

  // Adapted from: http://roysharon.com/blog/37.
  // This finds the element containing the selection focus.
  getElementWithFocus(selection, backwards) {
    let t;
    let r = (t = selection.getRangeAt(0));
    if (DomUtils.getSelectionType(selection) === 'Range') {
      r = t.cloneRange();
      r.collapse(backwards);
    }
    t = r.startContainer;
    if (t.nodeType === 1) { t = t.childNodes[r.startOffset]; }
    let o = t;
    while (o && (o.nodeType !== 1)) { o = o.previousSibling; }
    t = o || (t != null ? t.parentNode : undefined);
    return t;
  },

  getSelectionFocusElement() {
    const sel = window.getSelection();
    let node = sel.focusNode;
    if ((node == null)) {
      return null;
    }
    if ((node === sel.anchorNode) && (sel.focusOffset === sel.anchorOffset)) {
      // The selection either *is* an element, or is inside an opaque element (eg. <input>).
      node = node.childNodes[sel.focusOffset];
    }
    if (node.nodeType !== Node.ELEMENT_NODE) { return node.parentElement; } return node;
  },

  // Get the element in the DOM hierachy that contains `element`.
  // If the element is rendered in a shadow DOM via a <content> element, the <content> element will be
  // returned, so the shadow DOM is traversed rather than passed over.
  getContainingElement(element) {
    return (typeof element.getDestinationInsertionPoints === 'function' ? element.getDestinationInsertionPoints()[0] : undefined) || element.parentElement;
  },

  // This tests whether a window is too small to be useful.
  windowIsTooSmall() {
    return (window.innerWidth < 3) || (window.innerHeight < 3);
  },

  // Inject user styles manually. This is only necessary for our chrome-extension:// pages and frames.
  injectUserCss() {
    return Settings.onLoaded(() => {
      const style = document.createElement('style');
      style.type = 'text/css';
      style.textContent = Settings.get('userDefinedLinkHintCss');
      return document.head.appendChild(style);
    });
  },

  // Inject user Javascript.
  injectUserScript(text) {
    if (text.slice(0, 11) === 'javascript:') {
      text = text.slice(11).trim();
      if (text.indexOf(' ') < 0) {
        try { text = decodeURIComponent(text); } catch (error) {}
      }
    }
    const script = document.createElement('script');
    script.textContent = text;
    return document.head.appendChild(script);
  },
};

const root = typeof exports !== 'undefined' && exports !== null ? exports : (window.root != null ? window.root : (window.root = {}));
root.DomUtils = DomUtils;
if (typeof exports === 'undefined' || exports === null) { extend(window, root); }
