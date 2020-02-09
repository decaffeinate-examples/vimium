/* eslint-disable
    func-names,
    import/no-unresolved,
    max-len,
    no-console,
    no-undef,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const system = require('system');
const fs = require('fs');
const path = require('path');
const page = require('webpage').create();

page.settings.userAgent = 'phantom';

// ensure that the elements we test the link hints on are actually visible
page.viewportSize = {
  width: 900,
  height: 600,
};

page.onConsoleMessage = (msg) => console.log(msg);

page.onError = function (msg, trace) {
  console.log(msg);
  return trace.forEach((item) => console.log('  ', item.file, ':', item.line));
};

page.onResourceError = (resourceError) => console.log(resourceError.errorString);

const testfile = `${path.dirname(system.args[0])}/dom_tests.html`;
page.open(testfile, (status) => {
  if (status !== 'success') {
    console.log('Unable to load tests.');
    phantom.exit(1);
  }

  const runTests = function () {
    const testsFailed = page.evaluate(() => {
      Tests.run();
      return Tests.testsFailed;
    });

    if (system.args[1] === '--coverage') {
      const data = page.evaluate(() => JSON.stringify(_$jscoverage));
      fs.write(`${dirname}dom_tests_coverage.json`, data, 'w');
    }

    if (testsFailed > 0) {
      return phantom.exit(1);
    }
    return phantom.exit(0);
  };

  // We add a short delay to allow asynchronous initialization (that is, initialization which happens on
  // "nextTick") to complete.
  return setTimeout(runTests, 10);
});
