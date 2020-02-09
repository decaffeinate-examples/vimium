/* eslint-disable
    new-cap,
    no-restricted-syntax,
    no-return-assign,
    no-undef,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

const cleanUpRegexp = (re) => re.toString()
  .replace(/^\//, '')
  .replace(/\/$/, '')
  .replace(/\\\//g, '/');

DomUtils.documentReady(() => {
  const html = [];
  for (let engine of Array.from(CompletionEngines.slice(0, CompletionEngines.length - 1))) {
    engine = new engine();
    html.push(`<h4>${engine.constructor.name}</h4>\n`);
    html.push('<div class="engine">');
    if (engine.example.explanation) {
      html.push(`<p>${engine.example.explanation}</p>`);
    }
    if (engine.example.searchUrl && engine.example.keyword) {
      if (!engine.example.description) { engine.example.description = engine.constructor.name; }
      html.push('<p>');
      html.push('Example:');
      html.push('<pre>');
      html.push(`${engine.example.keyword}: ${engine.example.searchUrl} ${engine.example.description}`);
      html.push('</pre>');
      html.push('</p>');
    }
    if (engine.regexps) {
      html.push('<p>');
      html.push(`Regular expression${engine.regexps.length > 1 ? 's' : ''}:`);
      html.push('<pre>');
      for (const re of Array.from(engine.regexps)) { html.push(`${cleanUpRegexp(re)}\n`); }
      html.push('</pre>');
      html.push('</p>');
    }
    html.push('</div>');
  }

  return document.getElementById('engineList').innerHTML = html.join('');
});
