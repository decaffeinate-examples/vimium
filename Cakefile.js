/* eslint-disable
    camelcase,
    consistent-return,
    func-names,
    global-require,
    import/no-dynamic-require,
    import/no-unresolved,
    max-len,
    no-console,
    no-param-reassign,
    no-restricted-syntax,
    no-return-assign,
    no-undef,
    no-underscore-dangle,
    no-unused-vars,
    no-var,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS203: Remove `|| {}` from converted for-own loops
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const util = require('util');
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');

const spawn = function (procName, optArray, silent, sync) {
  let proc;
  if (silent == null) { silent = false; }
  if (sync == null) { sync = false; }
  if (process.platform === 'win32') {
    // if win32, prefix arguments with "/c {original command}"
    // e.g. "coffee -c c:\git\vimium" becomes "cmd.exe /c coffee -c c:\git\vimium"
    optArray.unshift('/c', procName);
    procName = 'cmd.exe';
  }
  if (sync) {
    proc = child_process.spawnSync(procName, optArray, {
      stdio: [undefined, process.stdout, process.stderr],
    });
  } else {
    proc = child_process.spawn(procName, optArray);
    if (!silent) {
      proc.stdout.on('data', (data) => process.stdout.write(data));
      proc.stderr.on('data', (data) => process.stderr.write(data));
    }
  }
  return proc;
};

const optArrayFromDict = function (opts) {
  const result = [];
  for (const key of Object.keys(opts || {})) {
    const value = opts[key];
    if (value instanceof Array) {
      for (const v of Array.from(value)) { result.push(`--${key}=${v}`); }
    } else {
      result.push(`--${key}=${value}`);
    }
  }
  return result;
};

// visitor will get passed the file path as a parameter
var visitDirectory = (directory, visitor) => fs.readdirSync(directory).forEach((filename) => {
  const filepath = path.join(directory, filename);
  if ((fs.statSync(filepath)).isDirectory()) {
    return visitDirectory(filepath, visitor);
  }

  if (!(fs.statSync(filepath)).isFile()) { return; }
  return visitor(filepath);
});

task('build', 'compile all coffeescript files to javascript', () => {
  const coffee = spawn('coffee', ['-c', __dirname]);
  return coffee.on('exit', (returnCode) => process.exit(returnCode));
});

task('clean', 'removes any js files which were compiled from coffeescript', () => visitDirectory(__dirname, (filepath) => {
  let coffeeFile;
  if ((path.extname(filepath)) !== '.js') { return; }

  const directory = path.dirname(filepath);

  // Check if there exists a corresponding .coffee file
  try {
    coffeeFile = fs.statSync(path.join(directory, `${path.basename(filepath, '.js')}.coffee`));
  } catch (_) {
    return;
  }

  if (coffeeFile.isFile()) { return fs.unlinkSync(filepath); }
}));

task('autobuild', 'continually rebuild coffeescript files using coffee --watch', () => {
  let coffee;
  return coffee = spawn('coffee', ['-cw', __dirname]);
});

task('package', 'Builds a zip file for submission to the Chrome store. The output is in dist/', () => {
  const vimium_version = JSON.parse(fs.readFileSync('manifest.json').toString()).version;

  invoke('build');

  spawn('rm', ['-rf', 'dist/vimium'], false, true);
  spawn('mkdir', ['-p', 'dist/vimium'], false, true);

  const blacklist = ['.*', '*.coffee', '*.md', 'reference', 'test_harnesses', 'tests', 'dist', 'git_hooks',
    'CREDITS', 'node_modules', 'MIT-LICENSE.txt', 'Cakefile'];
  const rsyncOptions = [].concat.apply(
    ['-r', '.', 'dist/vimium'],
    blacklist.map((item) => ['--exclude', `${item}`]),
  );

  spawn('rsync', rsyncOptions, false, true);

  const distManifest = 'dist/vimium/manifest.json';
  const manifest = JSON.parse(fs.readFileSync(distManifest).toString());

  // Build the Chrome Store package; this does not require the clipboardWrite permission.
  manifest.permissions = (Array.from(manifest.permissions).filter((permission) => permission !== 'clipboardWrite'));
  fs.writeFileSync(distManifest, JSON.stringify(manifest, null, 2));
  spawn('zip', ['-r', `dist/vimium-chrome-store-${vimium_version}.zip`, 'dist/vimium'], false, true);

  // Build the Chrome Store dev package.
  manifest.name = 'Vimium Canary';
  manifest.description = 'This is the development branch of Vimium (it is beta software).';
  fs.writeFileSync(distManifest, JSON.stringify(manifest, null, 2));
  spawn('zip', ['-r', `dist/vimium-canary-${vimium_version}.zip`, 'dist/vimium'], false, true);

  // Build Firefox release.
  return spawn('zip', `-r -FS dist/vimium-ff-${vimium_version}.zip background_scripts Cakefile content_scripts CONTRIBUTING.md CREDITS icons lib \
manifest.json MIT-LICENSE.txt pages README.md -x *.coffee -x Cakefile -x CREDITS -x *.md`.split(/\s+/), false, true);
});

// This builds a CRX that's distributable outside of the Chrome web store. Is this used by folks who fork
// Vimium and want to distribute their fork?
task('package-custom-crx', 'build .crx file', () => {
  // To get crxmake, use `sudo gem install crxmake`.
  invoke('build');

  // ugly hack to modify our manifest file on-the-fly
  const origManifestText = fs.readFileSync('manifest.json');
  const manifest = JSON.parse(origManifestText);
  // Update manifest fields that you would like to override here.  If
  // distributing your CRX outside the Chrome webstore in a fork, please follow
  // the instructions available at
  // https://developer.chrome.com/extensions/autoupdate.
  // manifest.update_url = "http://philc.github.com/vimium/updates.xml"
  fs.writeFileSync('manifest.json', JSON.stringify(manifest));

  const pem = process.env.VIMIUM_CRX_PEM != null ? process.env.VIMIUM_CRX_PEM : 'vimium.pem';
  const target = 'vimium-latest.crx';

  console.log('Building crx file...');
  console.log(`  using pem-file: ${pem}`);
  console.log(`  target: ${target}`);

  const crxmake = spawn('crxmake', optArrayFromDict({
    'pack-extension': '.',
    'pack-extension-key': pem,
    'extension-output': target,
    'ignore-file': '(^\\.|\\.(coffee|crx|pem|un~)$)',
    'ignore-dir': '^(\\.|test)',
  }));

  return crxmake.on('exit', () => fs.writeFileSync('manifest.json', origManifestText));
});

const runUnitTests = function (projectDir, testNameFilter) {
  if (projectDir == null) { projectDir = '.'; }
  console.log('Running unit tests...');
  const basedir = path.join(projectDir, '/tests/unit_tests/');
  let test_files = fs.readdirSync(basedir).filter((filename) => filename.indexOf('_test.js') > 0);
  test_files = test_files.map((filename) => basedir + filename);
  test_files.forEach((file) => require((file[0] === '/' ? '' : './') + file));
  Tests.run(testNameFilter);
  return Tests.testsFailed;
};

option('', '--filter-tests [string]', 'filter tests by matching string');
task('test', 'run all tests', (options) => {
  const unitTestsFailed = runUnitTests('.', options['filter-tests']);

  console.log('Running DOM tests...');
  const phantom = spawn('phantomjs', ['./tests/dom_tests/phantom_runner.js']);
  return phantom.on('exit', (returnCode) => {
    if ((returnCode > 0) || (unitTestsFailed > 0)) {
      return process.exit(1);
    }
    return process.exit(0);
  });
});

task('coverage', 'generate coverage report', () => {
  const { Utils } = require('./lib/utils');
  const temp = require('temp');
  const tmpDir = temp.mkdirSync(null);
  const jscoverage = spawn('jscoverage', ['.', tmpDir].concat(optArrayFromDict({
    exclude: ['.git', 'node_modules'],
    'no-instrument': 'tests',
  })));

  return jscoverage.on('exit', (returnCode) => {
    if (returnCode !== 0) { process.exit(1); }

    console.log('Running DOM tests...');
    const phantom = spawn('phantomjs', [path.join(tmpDir, 'tests/dom_tests/phantom_runner.js'), '--coverage']);
    return phantom.on('exit', () => {
      // merge the coverage counts from the DOM tests with those from the unit tests
      global._$jscoverage = JSON.parse(fs.readFileSync(path.join(tmpDir,
        'tests/dom_tests/dom_tests_coverage.json')));
      runUnitTests(tmpDir);

      // marshal the counts into a form that the JSCoverage front-end expects
      const result = {};
      for (const fname of Object.keys(_$jscoverage || {})) {
        const coverage = _$jscoverage[fname];
        result[fname] = {
          coverage,
          source: (Utils.escapeHtml(fs.readFileSync(fname, 'utf-8'))).split('\n'),
        };
      }

      return fs.writeFileSync('jscoverage.json', JSON.stringify(result));
    });
  });
});
