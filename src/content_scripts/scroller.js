/* eslint-disable
    consistent-return,
    func-names,
    max-len,
    no-cond-assign,
    no-multi-assign,
    no-nested-ternary,
    no-param-reassign,
    no-plusplus,
    no-restricted-syntax,
    no-return-assign,
    no-shadow,
    no-undef,
    no-underscore-dangle,
    no-unused-vars,
    no-use-before-define,
    no-var,
    vars-on-top,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS104: Avoid inline assignments
 * DS204: Change includes calls to have a more natural evaluation order
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
//
// activatedElement is different from document.activeElement -- the latter seems to be reserved mostly for
// input elements. This mechanism allows us to decide whether to scroll a div or to scroll the whole document.
//
let activatedElement = null;

// Previously, the main scrolling element was document.body.  If the "experimental web platform features" flag
// is enabled, then we need to use document.scrollingElement instead.  There's an explanation in #2168:
// https://github.com/philc/vimium/pull/2168#issuecomment-236488091

const getScrollingElement = function () {
  let left; let
    left1;
  return (left = (left1 = getSpecialScrollingElement()) != null ? left1 : document.scrollingElement) != null ? left : document.body;
};

// Return 0, -1 or 1: the sign of the argument.
// NOTE(smblott; 2014/12/17) We would like to use Math.sign().  However, according to this site
// (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/sign) Math.sign() was
// only introduced in Chrome 38.  This caused problems in R1.48 for users with old Chrome installations.  We
// can replace this with Math.sign() at some point.
const getSign = function (val) {
  if (!val) {
    return 0;
  }
  if (val < 0) { return -1; } return 1;
};

const scrollProperties = {
  x: {
    axisName: 'scrollLeft',
    max: 'scrollWidth',
    viewSize: 'clientWidth',
  },
  y: {
    axisName: 'scrollTop',
    max: 'scrollHeight',
    viewSize: 'clientHeight',
  },
};

// Translate a scroll request into a number (which will be interpreted by `scrollBy` as a relative amount, or
// by `scrollTo` as an absolute amount).  :direction must be "x" or "y". :amount may be either a number (in
// which case it is simply returned) or a string.  If :amount is a string, then it is either "max" (meaning the
// height or width of element), or "viewSize".  In both cases, we look up and return the requested amount,
// either in `element` or in `window`, as appropriate.
const getDimension = function (el, direction, amount) {
  if (Utils.isString(amount)) {
    const name = amount;
    // the clientSizes of the body are the dimensions of the entire page, but the viewport should only be the
    // part visible through the window
    if ((name === 'viewSize') && (el === getScrollingElement())) {
      // TODO(smblott) Should we not be returning the width/height of element, here?
      if (direction === 'x') { return window.innerWidth; } return window.innerHeight;
    }
    return el[scrollProperties[direction][name]];
  }
  return amount;
};

// Perform a scroll. Return true if we successfully scrolled by any amount, and false otherwise.
const performScroll = function (element, direction, amount) {
  const {
    axisName,
  } = scrollProperties[direction];
  const before = element[axisName];
  if (typeof element.scrollBy === 'function') {
    const scrollArg = { behavior: 'instant' };
    scrollArg[direction === 'x' ? 'left' : 'top'] = amount;
    element.scrollBy(scrollArg);
  } else {
    element[axisName] += amount;
  }
  return element[axisName] !== before;
};

// Test whether `element` should be scrolled. E.g. hidden elements should not be scrolled.
const shouldScroll = function (element, direction) {
  let needle;
  const computedStyle = window.getComputedStyle(element);
  // Elements with `overflow: hidden` must not be scrolled.
  if (computedStyle.getPropertyValue(`overflow-${direction}`) === 'hidden') { return false; }
  // Elements which are not visible should not be scrolled.
  if ((needle = computedStyle.getPropertyValue('visibility'), ['hidden', 'collapse'].includes(needle))) { return false; }
  if (computedStyle.getPropertyValue('display') === 'none') { return false; }
  return true;
};

// Test whether element does actually scroll in the direction required when asked to do so.  Due to chrome bug
// 110149, scrollHeight and clientHeight cannot be used to reliably determine whether an element will scroll.
// Instead, we scroll the element by 1 or -1 and see if it moved (then put it back).  :factor is the factor by
// which :scrollBy and :scrollTo will later scale the scroll amount. :factor can be negative, so we need it
// here in order to decide whether we should test a forward scroll or a backward scroll.
// Bug last verified in Chrome 38.0.2125.104.
const doesScroll = function (element, direction, amount, factor) {
  // amount is treated as a relative amount, which is correct for relative scrolls. For absolute scrolls (only
  // gg, G, and friends), amount can be either a string ("max" or "viewSize") or zero. In the former case,
  // we're definitely scrolling forwards, so any positive value will do for delta.  In the latter, we're
  // definitely scrolling backwards, so a delta of -1 will do.  For absolute scrolls, factor is always 1.
  let delta = (factor * getDimension(element, direction, amount)) || -1;
  delta = getSign(delta); // 1 or -1
  return performScroll(element, direction, delta) && performScroll(element, direction, -delta);
};

const isScrollableElement = function (element, direction, amount, factor) {
  if (direction == null) { direction = 'y'; }
  if (amount == null) { amount = 1; }
  if (factor == null) { factor = 1; }
  return doesScroll(element, direction, amount, factor) && shouldScroll(element, direction);
};

// From element and its parents, find the first which we should scroll and which does scroll.
const findScrollableElement = function (element, direction, amount, factor) {
  while ((element !== getScrollingElement()) && !isScrollableElement(element, direction, amount, factor)) {
    var left;
    element = (left = DomUtils.getContainingElement(element)) != null ? left : getScrollingElement();
  }
  return element;
};

// On some pages, the scrolling element is not actually scrollable.  Here, we search the document for the
// largest visible element which does scroll vertically. This is used to initialize activatedElement. See
// #1358.
var firstScrollableElement = function (element = null) {
  let child;
  if (!element) {
    const scrollingElement = getScrollingElement();
    if (doesScroll(scrollingElement, 'y', 1, 1) || doesScroll(scrollingElement, 'y', -1, 1)) {
      return scrollingElement;
    }
    element = document.body != null ? document.body : getScrollingElement();
  }

  if (doesScroll(element, 'y', 1, 1) || doesScroll(element, 'y', -1, 1)) {
    return element;
  }
  let children = ((() => {
    const result = [];
    for (child of Array.from(element.children)) {
      result.push({ element: child, rect: DomUtils.getVisibleClientRect(child) });
    }
    return result;
  })());
  children = children.filter((child) => child.rect); // Filter out non-visible elements.
  children.map((child) => child.area = child.rect.width * child.rect.height);
  for (child of Array.from(children.sort((a, b) => b.area - a.area))) { // Largest to smallest by visible area.
    var ele;
    if (ele = firstScrollableElement(child.element)) { return ele; }
  }
  return null;
};

const checkVisibility = function (element) {
  // If the activated element has been scrolled completely offscreen, then subsequent changes in its scroll
  // position will not provide any more visual feedback to the user. Therefore, we deactivate it so that
  // subsequent scrolls affect the parent element.
  const rect = activatedElement.getBoundingClientRect();
  if ((rect.bottom < 0) || (rect.top > window.innerHeight) || (rect.right < 0) || (rect.left > window.innerWidth)) {
    return activatedElement = element;
  }
};

// How scrolling is handled by CoreScroller.
//   - For jump scrolling, the entire scroll happens immediately.
//   - For smooth scrolling with distinct key presses, a separate animator is initiated for each key press.
//     Therefore, several animators may be active at the same time.  This ensures that two quick taps on `j`
//     scroll to the same position as two slower taps.
//   - For smooth scrolling with keyboard repeat (continuous scrolling), the most recently-activated animator
//     continues scrolling at least until its keyup event is received.  We never initiate a new animator on
//     keyboard repeat.

// CoreScroller contains the core function (scroll) and logic for relative scrolls.  All scrolls are ultimately
// translated to relative scrolls.  CoreScroller is not exported.
const CoreScroller = {
  init() {
    this.time = 0;
    this.lastEvent = (this.keyIsDown = null);
    return this.installCanceEventListener();
  },

  // This installs listeners for events which should cancel smooth scrolling.
  installCanceEventListener() {
    // NOTE(smblott) With extreme keyboard configurations, Chrome sometimes does not get a keyup event for
    // every keydown, in which case tapping "j" scrolls indefinitely.  This appears to be a Chrome/OS/XOrg bug
    // of some kind.  See #1549.
    return handlerStack.push({
      _name: 'scroller/track-key-status',
      keydown: (event) => handlerStack.alwaysContinueBubbling(() => {
        this.keyIsDown = true;
        if (!event.repeat) { this.time += 1; }
        return this.lastEvent = event;
      }),
      keyup: (event) => handlerStack.alwaysContinueBubbling(() => {
        this.keyIsDown = false;
        return this.time += 1;
      }),
      blur: (event) => handlerStack.alwaysContinueBubbling(() => {
        if (event.target === window) { return this.time += 1; }
      }),
    });
  },

  // Return true if CoreScroller would not initiate a new scroll right now.
  wouldNotInitiateScroll() { return (this.lastEvent != null ? this.lastEvent.repeat : undefined) && Settings.get('smoothScroll'); },

  // Calibration fudge factors for continuous scrolling.  The calibration value starts at 1.0.  We then
  // increase it (until it exceeds @maxCalibration) if we guess that the scroll is too slow, or decrease it
  // (until it is less than @minCalibration) if we guess that the scroll is too fast.  The cutoff point for
  // which guess we make is @calibrationBoundary. We require: 0 < @minCalibration <= 1 <= @maxCalibration.
  minCalibration: 0.5, // Controls how much we're willing to slow scrolls down; smaller means more slow down.
  maxCalibration: 1.6, // Controls how much we're willing to speed scrolls up; bigger means more speed up.
  calibrationBoundary: 150, // Boundary between scrolls which are considered too slow, or too fast.

  // Scroll element by a relative amount (a number) in some direction.
  scroll(element, direction, amount, continuous) {
    let left;
    if (continuous == null) { continuous = true; }
    if (!amount) { return; }

    if (!Settings.get('smoothScroll')) {
      // Jump scrolling.
      performScroll(element, direction, amount);
      checkVisibility(element);
      return;
    }

    // We don't activate new animators on keyboard repeats; rather, the most-recently activated animator
    // continues scrolling.
    if (this.lastEvent != null ? this.lastEvent.repeat : undefined) { return; }

    const activationTime = ++this.time;
    const myKeyIsStillDown = () => ((left = (this.time === activationTime) && this.keyIsDown) != null ? left : true);

    // Store amount's sign and make amount positive; the arithmetic is clearer when amount is positive.
    const sign = getSign(amount);
    amount = Math.abs(amount);

    // Initial intended scroll duration (in ms). We allow a bit longer for longer scrolls.
    const duration = Math.max(100, 20 * Math.log(amount));

    let totalDelta = 0;
    let totalElapsed = 0.0;
    let calibration = 1.0;
    let previousTimestamp = null;
    const cancelEventListener = this.installCanceEventListener();

    var animate = (timestamp) => {
      if (previousTimestamp == null) { previousTimestamp = timestamp; }
      if (timestamp === previousTimestamp) { return requestAnimationFrame(animate); }

      // The elapsed time is typically about 16ms.
      const elapsed = timestamp - previousTimestamp;
      totalElapsed += elapsed;
      previousTimestamp = timestamp;

      // The constants in the duration calculation, above, are chosen to provide reasonable scroll speeds for
      // distinct keypresses.  For continuous scrolls, some scrolls are too slow, and others too fast. Here, we
      // speed up the slower scrolls, and slow down the faster scrolls.
      if (myKeyIsStillDown() && (totalElapsed >= 75) && (this.minCalibration <= calibration && calibration <= this.maxCalibration)) {
        if ((1.05 * calibration * amount) < this.calibrationBoundary) { calibration *= 1.05; } // Speed up slow scrolls.
        if (this.calibrationBoundary < (0.95 * calibration * amount)) { calibration *= 0.95; } // Slow down fast scrolls.
      }

      // Calculate the initial delta, rounding up to ensure progress.  Then, adjust delta to account for the
      // current scroll state.
      let delta = Math.ceil(amount * (elapsed / duration) * calibration);
      delta = myKeyIsStillDown() ? delta : Math.max(0, Math.min(delta, amount - totalDelta));

      if (delta && performScroll(element, direction, sign * delta)) {
        totalDelta += delta;
        return requestAnimationFrame(animate);
      }
      // We're done.
      handlerStack.remove(cancelEventListener);
      return checkVisibility(element);
    };

    // If we've been asked not to be continuous, then we advance time, so the myKeyIsStillDown test always
    // fails.
    if (!continuous) { ++this.time; }

    // Start scrolling.
    return requestAnimationFrame(animate);
  },
};

// Scroller contains the two main scroll functions which are used by clients.
const Scroller = {
  init() {
    const handler = { _name: 'scroller/active-element' };
    // Only Chrome has a DOMActivate event. On Firefox, we must listen for click. See #3287.
    const eventName = Utils.isFirefox() ? 'click' : 'DOMActivate';
    handler[eventName] = (event) => handlerStack.alwaysContinueBubbling(() => {
      // If event.path is present, the true event taget (potentially inside a Shadow DOM inside
      // event.target) can be found as its first element.
      // NOTE(mrmr1993): event.path has been renamed to event.deepPath in the spec, but this change is not
      // yet implemented by Chrome.
      let left;
      return activatedElement = (left = (event.deepPath != null ? event.deepPath[0] : undefined) != null ? (event.deepPath != null ? event.deepPath[0] : undefined) : (event.path != null ? event.path[0] : undefined)) != null ? left : event.target;
    });
    handlerStack.push(handler);
    CoreScroller.init();
    return this.reset();
  },

  reset() {
    return activatedElement = null;
  },

  // scroll the active element in :direction by :amount * :factor.
  // :factor is needed because :amount can take on string values, which scrollBy converts to element dimensions.
  scrollBy(direction, amount, factor, continuous) {
    // if this is called before domReady, just use the window scroll function
    if (factor == null) { factor = 1; }
    if (continuous == null) { continuous = true; }
    if (!getScrollingElement() && amount instanceof Number) {
      if (direction === 'x') {
        window.scrollBy(amount, 0);
      } else {
        window.scrollBy(0, amount);
      }
      return;
    }

    if (!activatedElement) { activatedElement = (getScrollingElement() && firstScrollableElement()) || getScrollingElement(); }
    if (!activatedElement) { return; }

    // Avoid the expensive scroll calculation if it will not be used.  This reduces costs during smooth,
    // continuous scrolls, and is just an optimization.
    if (!CoreScroller.wouldNotInitiateScroll()) {
      const element = findScrollableElement(activatedElement, direction, amount, factor);
      const elementAmount = factor * getDimension(element, direction, amount);
      return CoreScroller.scroll(element, direction, elementAmount, continuous);
    }
  },

  scrollTo(direction, pos) {
    if (!activatedElement) { activatedElement = (getScrollingElement() && firstScrollableElement()) || getScrollingElement(); }
    if (!activatedElement) { return; }

    const element = findScrollableElement(activatedElement, direction, pos, 1);
    const amount = getDimension(element, direction, pos) - element[scrollProperties[direction].axisName];
    return CoreScroller.scroll(element, direction, amount);
  },

  // Is element scrollable and not the activated element?
  isScrollableElement(element) {
    if (!activatedElement) { activatedElement = (getScrollingElement() && firstScrollableElement()) || getScrollingElement(); }
    return (element !== activatedElement) && isScrollableElement(element);
  },

  // Scroll the top, bottom, left and right of element into view.  The is used by visual mode to ensure the
  // focus remains visible.
  scrollIntoView(element) {
    if (!activatedElement) { activatedElement = getScrollingElement() && firstScrollableElement(); }
    const rect = __guard__(element.getClientRects(), (x) => x[0]);
    if (rect != null) {
      // Scroll y axis.
      let amount;
      if (rect.bottom < 0) {
        amount = rect.bottom - Math.min(rect.height, window.innerHeight);
        element = findScrollableElement(element, 'y', amount, 1);
        CoreScroller.scroll(element, 'y', amount, false);
      } else if (window.innerHeight < rect.top) {
        amount = rect.top + Math.min(rect.height - window.innerHeight, 0);
        element = findScrollableElement(element, 'y', amount, 1);
        CoreScroller.scroll(element, 'y', amount, false);
      }

      // Scroll x axis.
      if (rect.right < 0) {
        amount = rect.right - Math.min(rect.width, window.innerWidth);
        element = findScrollableElement(element, 'x', amount, 1);
        return CoreScroller.scroll(element, 'x', amount, false);
      } if (window.innerWidth < rect.left) {
        amount = rect.left + Math.min(rect.width - window.innerWidth, 0);
        element = findScrollableElement(element, 'x', amount, 1);
        return CoreScroller.scroll(element, 'x', amount, false);
      }
    }
  },
};

var getSpecialScrollingElement = function () {
  const selector = specialScrollingElementMap[window.location.host];
  if (selector) {
    return document.querySelector(selector);
  }
};

var specialScrollingElementMap = {
  'twitter.com': 'div.permalink-container div.permalink[role=main]',
  'reddit.com': '#overlayScrollContainer',
  'new.reddit.com': '#overlayScrollContainer',
  'www.reddit.com': '#overlayScrollContainer',
};

const root = typeof exports !== 'undefined' && exports !== null ? exports : (window.root != null ? window.root : (window.root = {}));
root.Scroller = Scroller;
if (typeof exports === 'undefined' || exports === null) { extend(window, root); }

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
