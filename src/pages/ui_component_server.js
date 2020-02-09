/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

// Fetch the Vimium secret, register the port received from the parent window, and stop listening for messages
// on the window object. vimiumSecret is accessible only within the current instance of Vimium.  So a
// malicious host page trying to register its own port can do no better than guessing.
let registerPort;
window.addEventListener("message", (registerPort = event => chrome.storage.local.get("vimiumSecret", function({vimiumSecret: secret}) {
  if ((event.source !== window.parent) || (event.data !== secret)) { return; }
  UIComponentServer.portOpen(event.ports[0]);
  return window.removeEventListener("message", registerPort);
}))
);

var UIComponentServer = {
  ownerPagePort: null,
  handleMessage: null,

  portOpen(ownerPagePort) {
    this.ownerPagePort = ownerPagePort;
    this.ownerPagePort.onmessage = event => (typeof this.handleMessage === 'function' ? this.handleMessage(event) : undefined);
    return this.registerIsReady();
  },

  registerHandler(handleMessage) {
    this.handleMessage = handleMessage;
  },

  postMessage(message) { return (this.ownerPagePort != null ? this.ownerPagePort.postMessage(message) : undefined); },
  hide() { return this.postMessage("hide"); },

  // We require both that the DOM is ready and that the port has been opened before the UI component is ready.
  // These events can happen in either order.  We count them, and notify the content script when we've seen
  // both.
  registerIsReady: (function() {
    let uiComponentIsReadyCount =
      (() => {
      if (document.readyState === "loading") {
        window.addEventListener("DOMContentLoaded", () => UIComponentServer.registerIsReady());
        return 0;
      } else {
        return 1;
      }
    })();

    return function() {
      if (++uiComponentIsReadyCount === 2) {
        if (window.frameId != null) { this.postMessage({name: "setIframeFrameId", iframeFrameId: window.frameId}); }
        return this.postMessage("uiComponentIsReady");
      }
    };
  })()
};

const root = typeof exports !== 'undefined' && exports !== null ? exports : window;
root.UIComponentServer = UIComponentServer;
root.isVimiumUIComponent = true;
