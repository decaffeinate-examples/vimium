/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const Clipboard = {
  _createTextArea(tagName) {
    if (tagName == null) { tagName = "textarea"; }
    const textArea = document.createElement(tagName);
    textArea.style.position = "absolute";
    textArea.style.left = "-100%";
    textArea.contentEditable = "true";
    return textArea;
  },

  // http://groups.google.com/group/chromium-extensions/browse_thread/thread/49027e7f3b04f68/f6ab2457dee5bf55
  copy({data}) {
    const textArea = this._createTextArea();
    textArea.value = data.replace(/\xa0/g, " ");

    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("Copy");
    return document.body.removeChild(textArea);
  },

  paste() {
    const textArea = this._createTextArea("div"); // Use a <div> so Firefox pastes rich text.
    document.body.appendChild(textArea);
    textArea.focus();
    document.execCommand("Paste");
    const value = textArea.innerText;
    document.body.removeChild(textArea);
    return value.replace(/\xa0/g, " ");
  }
};


const root = typeof exports !== 'undefined' && exports !== null ? exports : (window.root != null ? window.root : (window.root = {}));
root.Clipboard = Clipboard;
if (typeof exports === 'undefined' || exports === null) { extend(window, root); }
