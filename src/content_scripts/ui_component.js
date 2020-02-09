/* eslint-disable
    consistent-return,
    implicit-arrow-linebreak,
    max-len,
    no-cond-assign,
    no-nested-ternary,
    no-param-reassign,
    no-return-assign,
    no-shadow,
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
 * DS104: Avoid inline assignments
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
class UIComponent {
  static initClass() {
    this.prototype.iframeElement = null;
    this.prototype.iframePort = null;
    this.prototype.showing = false;
    this.prototype.iframeFrameId = null;
    this.prototype.options = null;
    this.prototype.shadowDOM = null;
  }

  toggleIframeElementClasses(removeClass, addClass) {
    this.iframeElement.classList.remove(removeClass);
    if (!this.iframeElement.classList.contains(addClass)) {
      this.iframeElement.classList.add(addClass);
      if (addClass === 'vimiumUIComponentVisible') {
        // Force the re-computation of styles, so Chrome sends a visibility change message to the child frame.
        // This is required to solve focusing issues since Chrome 74. See
        // https://github.com/philc/vimium/pull/3277#issuecomment-487363284
        return getComputedStyle(this.iframeElement).display;
      }
    }
  }

  constructor(iframeUrl, className, handleMessage) {
    this.handleMessage = handleMessage;
    DomUtils.documentReady(() => {
      let left; let
        left1;
      const styleSheet = DomUtils.createElement('style');
      styleSheet.type = 'text/css';
      // Default to everything hidden while the stylesheet loads.
      styleSheet.innerHTML = 'iframe {display: none;}';

      // Fetch "content_scripts/vimium.css" from chrome.storage.local; the background page caches it there.
      chrome.storage.local.get('vimiumCSSInChromeStorage', (items) => styleSheet.innerHTML = items.vimiumCSSInChromeStorage);

      this.iframeElement = DomUtils.createElement('iframe');
      extend(this.iframeElement, {
        className,
        seamless: 'seamless',
      });
      const shadowWrapper = DomUtils.createElement('div');
      // PhantomJS doesn't support createShadowRoot, so guard against its non-existance.
      this.shadowDOM = (left = (left1 = (typeof shadowWrapper.attachShadow === 'function' ? shadowWrapper.attachShadow({ mode: 'open' }) : undefined)) != null ? left1 : (typeof shadowWrapper.createShadowRoot === 'function' ? shadowWrapper.createShadowRoot() : undefined)) != null ? left : shadowWrapper;
      this.shadowDOM.appendChild(styleSheet);
      this.shadowDOM.appendChild(this.iframeElement);
      this.toggleIframeElementClasses('vimiumUIComponentVisible', 'vimiumUIComponentHidden');

      // Open a port and pass it to the iframe via window.postMessage.  We use an AsyncDataFetcher to handle
      // requests which arrive before the iframe (and its message handlers) have completed initialization.  See
      // #1679.
      this.iframePort = new AsyncDataFetcher((setIframePort) => {
        // We set the iframe source and append the new element here (as opposed to above) to avoid a potential
        // race condition vis-a-vis the "load" event (because this callback runs on "nextTick").
        this.iframeElement.src = chrome.runtime.getURL(iframeUrl);
        document.documentElement.appendChild(shadowWrapper);

        return this.iframeElement.addEventListener('load', () =>
          // Get vimiumSecret so the iframe can determine that our message isn't the page impersonating us.
          chrome.storage.local.get('vimiumSecret', ({ vimiumSecret }) => {
            const { port1, port2 } = new MessageChannel();
            this.iframeElement.contentWindow.postMessage(vimiumSecret, chrome.runtime.getURL(''), [port2]);
            return port1.onmessage = (event) => {
              switch (__guard__(event != null ? event.data : undefined, (x) => x.name) != null ? __guard__(event != null ? event.data : undefined, (x) => x.name) : (event != null ? event.data : undefined)) {
                case 'uiComponentIsReady':
                  // If any other frame receives the focus, then hide the UI component.
                  chrome.runtime.onMessage.addListener(({ name, focusFrameId }) => {
                    if ((name === 'frameFocused') && (this.options != null ? this.options.focus : undefined) && ![frameId, this.iframeFrameId].includes(focusFrameId)) {
                      this.hide(false);
                    }
                    return false;
                  }); // We will not be calling sendResponse.
                  // If this frame receives the focus, then hide the UI component.
                  window.addEventListener('focus', (forTrusted((event) => {
                    if ((event.target === window) && (this.options != null ? this.options.focus : undefined)) {
                      this.hide(false);
                    }
                    return true;
                  }) // Continue propagating the event.
                  ), true);
                  // Set the iframe's port, thereby rendering the UI component ready.
                  return setIframePort(port1);
                case 'setIframeFrameId': return this.iframeFrameId = event.data.iframeFrameId;
                case 'hide': return this.hide();
                default: return this.handleMessage(event);
              }
            };
          }));
      });
      if (Utils.isFirefox()) {
        return this.postMessage({ name: 'settings', isFirefox: true });
      }
    });
  }

  // Post a message (if provided), then call continuation (if provided).  We wait for documentReady() to ensure
  // that the @iframePort set (so that we can use @iframePort.use()).
  postMessage(message = null, continuation = null) {
    return (this.iframePort != null ? this.iframePort.use((port) => {
      if (message != null) { port.postMessage(message); }
      return (typeof continuation === 'function' ? continuation() : undefined);
    }) : undefined);
  }

  activate(options = null) {
    this.options = options;
    return this.postMessage(this.options, () => {
      this.toggleIframeElementClasses('vimiumUIComponentHidden', 'vimiumUIComponentVisible');
      if (this.options != null ? this.options.focus : undefined) { this.iframeElement.focus(); }
      return this.showing = true;
    });
  }

  hide(shouldRefocusOriginalFrame) {
    // We post a non-message (null) to ensure that hide() requests cannot overtake activate() requests.
    if (shouldRefocusOriginalFrame == null) { shouldRefocusOriginalFrame = true; }
    return this.postMessage(null, () => {
      if (this.showing) {
        this.showing = false;
        this.toggleIframeElementClasses('vimiumUIComponentVisible', 'vimiumUIComponentHidden');
        if (this.options != null ? this.options.focus : undefined) {
          this.iframeElement.blur();
          if (shouldRefocusOriginalFrame) {
            if ((this.options != null ? this.options.sourceFrameId : undefined) != null) {
              chrome.runtime.sendMessage({
                handler: 'sendMessageToFrames',
                message: { name: 'focusFrame', frameId: this.options.sourceFrameId, forceFocusThisFrame: true },
              });
            } else {
              Utils.nextTick(() => window.focus());
            }
          }
        }
        this.options = null;
        return this.postMessage('hidden');
      }
    });
  }
}
UIComponent.initClass(); // Inform the UI component that it is hidden.

const root = typeof exports !== 'undefined' && exports !== null ? exports : (window.root != null ? window.root : (window.root = {}));
root.UIComponent = UIComponent;
if (typeof exports === 'undefined' || exports === null) { extend(window, root); }

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
