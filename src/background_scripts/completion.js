/* eslint-disable
    class-methods-use-this,
    consistent-return,
    func-names,
    implicit-arrow-linebreak,
    max-classes-per-file,
    max-len,
    no-cond-assign,
    no-console,
    no-continue,
    no-loop-func,
    no-multi-assign,
    no-nested-ternary,
    no-param-reassign,
    no-plusplus,
    no-restricted-syntax,
    no-return-assign,
    no-script-url,
    no-shadow,
    no-undef,
    no-unused-vars,
    no-use-before-define,
    no-useless-escape,
    no-var,
    operator-linebreak,
    prefer-const,
    prefer-rest-params,
    vars-on-top,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS203: Remove `|| {}` from converted for-own loops
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// This file contains the definition of the completers used for the Vomnibox's suggestion UI. A completer will
// take a query (whatever the user typed into the Vomnibox) and return a list of Suggestions, e.g. bookmarks,
// domains, URLs from history.
//
// The Vomnibox frontend script makes a "filterCompleter" request to the background page, which in turn calls
// filter() on each these completers.
//
// A completer is a class which has three functions:
//  - filter(query, onComplete): "query" will be whatever the user typed into the Vomnibox.
//  - refresh(): (optional) refreshes the completer's data source (e.g. refetches the list of bookmarks).
//  - cancel(): (optional) cancels any pending, cancelable action.
class Suggestion {
  static initClass() {
    this.prototype.showRelevancy = false;

    // Patterns to strip from URLs; of the form [ [ filter, replacements ], [ filter, replacements ], ... ]
    //   - filter is a regexp string; a URL must match this regexp first.
    //   - replacements (itself a list) is a list of regexp objects, each of which is removed from URLs matching
    //     the filter.
    //
    // Note. This includes site-specific patterns for very-popular sites with URLs which don't work well in the
    // vomnibar.
    //
    this.prototype.stripPatterns = [
      // Google search specific replacements; this replaces query parameters which are known to not be helpful.
      // There's some additional information here: http://www.teknoids.net/content/google-search-parameters-2012
      ['^https?://www\\.google\\.(com|ca|com\\.au|co\\.uk|ie)/.*[&?]q=',
        'ei gws_rd url ved usg sa usg sig2 bih biw cd aqs ie sourceid es_sm'
          .split(/\s+/).map((param) => new RegExp(`\&${param}=[^&]+`))],

      // On Google maps, we get a new history entry for every pan and zoom event.
      ['^https?://www\\.google\\.(com|ca|com\\.au|co\\.uk|ie)/maps/place/.*/@',
        [new RegExp('/@.*')]],

      // General replacements; replaces leading and trailing fluff.
      ['.', ['^https?://', '\\W+$'].map((re) => new RegExp(re))],
    ];
    // Set this to true to render relevancy when debugging the ranking scores.
  }

  constructor(options) {
    // Required options.
    this.options = options;
    this.queryTerms = null;
    this.type = null;
    this.url = null;
    this.relevancyFunction = null;
    // Other options.
    this.title = '';
    // Extra data which will be available to the relevancy function.
    this.relevancyData = null;
    // If @autoSelect is truthy, then this suggestion is automatically pre-selected in the vomnibar.  This only
    // affects the suggestion in slot 0 in the vomnibar.
    this.autoSelect = false;
    // If @highlightTerms is true, then we highlight matched terms in the title and URL.  Otherwise we don't.
    this.highlightTerms = true;
    // @insertText is text to insert into the vomnibar input when the suggestion is selected.
    this.insertText = null;
    // @deDuplicate controls whether this suggestion is a candidate for deduplication.
    this.deDuplicate = true;

    // Other options set by individual completers include:
    // - tabId (TabCompleter)
    // - isSearchSuggestion, customSearchMode (SearchEngineCompleter)

    extend(this, this.options);
  }

  computeRelevancy() {
    // We assume that, once the relevancy has been set, it won't change.  Completers must set either @relevancy
    // or @relevancyFunction.
    return this.relevancy != null ? this.relevancy : (this.relevancy = this.relevancyFunction(this));
  }

  generateHtml(request) {
    if (this.html) { return this.html; }
    const relevancyHtml = this.showRelevancy ? `<span class='relevancy'>${this.computeRelevancy()}</span>` : '';
    const insertTextClass = this.insertText ? 'vomnibarInsertText' : 'vomnibarNoInsertText';
    const insertTextIndicator = '&#8618;'; // A right hooked arrow.
    if (this.insertText && request.isCustomSearch) { this.title = this.insertText; }
    // NOTE(philc): We're using these vimium-specific class names so we don't collide with the page's CSS.
    const favIcon = (this.type === 'tab') && !Utils.isFirefox()
      ? `<img class="vimiumReset vomnibarIcon" src="chrome://favicon/size/16@1x/${BgUtils.escapeAttribute(this.url)}" />`
      : '';
    return this.html = request.isCustomSearch
      ? `\
<div class="vimiumReset vomnibarTopHalf">
   <span class="vimiumReset vomnibarSource ${insertTextClass}">${insertTextIndicator}</span><span class="vimiumReset vomnibarSource">${this.type}</span>
   <span class="vimiumReset vomnibarTitle">${this.highlightQueryTerms(Utils.escapeHtml(this.title))}</span>
   ${relevancyHtml}
 </div>\
`
      : `\
<div class="vimiumReset vomnibarTopHalf">
   <span class="vimiumReset vomnibarSource ${insertTextClass}">${insertTextIndicator}</span><span class="vimiumReset vomnibarSource">${this.type}</span>
   <span class="vimiumReset vomnibarTitle">${this.highlightQueryTerms(Utils.escapeHtml(this.title))}</span>
 </div>
 <div class="vimiumReset vomnibarBottomHalf">
  <span class="vimiumReset vomnibarSource vomnibarNoInsertText">${insertTextIndicator}</span>${favIcon}<span class="vimiumReset vomnibarUrl">${this.highlightUrlTerms(Utils.escapeHtml(this.shortenUrl()))}</span>
  ${relevancyHtml}
</div>\
`;
  }

  // Use neat trick to snatch a domain (http://stackoverflow.com/a/8498668).
  getUrlRoot(url) {
    const a = document.createElement('a');
    a.href = url;
    return `${a.protocol}//${a.hostname}`;
  }

  getHostname(url) {
    const a = document.createElement('a');
    a.href = url;
    return a.hostname;
  }

  stripTrailingSlash(url) {
    if (url[url.length - 1] === '/') { url = url.substring(url, url.length - 1); }
    return url;
  }

  // Push the ranges within `string` which match `term` onto `ranges`.
  pushMatchingRanges(string, term, ranges) {
    let textPosition = 0;
    // Split `string` into a (flat) list of pairs:
    //   - for i=0,2,4,6,...
    //     - splits[i] is unmatched text
    //     - splits[i+1] is the following matched text (matching `term`)
    //       (except for the final element, for which there is no following matched text).
    // Example:
    //   - string = "Abacab"
    //   - term = "a"
    //   - splits = [ "", "A",    "b", "a",    "c", "a",    b" ]
    //                UM   M       UM   M       UM   M      UM      (M=Matched, UM=Unmatched)
    const splits = string.split(RegexpCache.get(term, '(', ')'));
    return (() => {
      const result = [];
      for (let index = 0, end = splits.length - 2; index <= end; index += 2) {
        const unmatchedText = splits[index];
        const matchedText = splits[index + 1];
        // Add the indices spanning `matchedText` to `ranges`.
        textPosition += unmatchedText.length;
        ranges.push([textPosition, textPosition + matchedText.length]);
        result.push(textPosition += matchedText.length);
      }
      return result;
    })();
  }

  // Wraps each occurence of the query terms in the given string in a <span>.
  highlightQueryTerms(string) {
    if (!this.highlightTerms) { return string; }
    let ranges = [];
    const escapedTerms = this.queryTerms.map((term) => Utils.escapeHtml(term));
    for (const term of Array.from(escapedTerms)) {
      this.pushMatchingRanges(string, term, ranges);
    }

    if (ranges.length === 0) { return string; }

    ranges = this.mergeRanges(ranges.sort((a, b) => a[0] - b[0]));
    // Replace portions of the string from right to left.
    ranges = ranges.sort((a, b) => b[0] - a[0]);
    for (const [start, end] of Array.from(ranges)) {
      string = `${string.substring(0, start)
      }<span class='vomnibarMatch'>${string.substring(start, end)}</span>${
        string.substring(end)}`;
    }
    return string;
  }

  highlightUrlTerms(string) {
    if (this.highlightTermsExcludeUrl) { return string; } return this.highlightQueryTerms(string);
  }

  // Merges the given list of ranges such that any overlapping regions are combined. E.g.
  //   mergeRanges([0, 4], [3, 6]) => [0, 6].  A range is [startIndex, endIndex].
  mergeRanges(ranges) {
    let previous = ranges.shift();
    const mergedRanges = [previous];
    ranges.forEach((range) => {
      if (previous[1] >= range[0]) {
        return previous[1] = Math.max(range[1], previous[1]);
      }
      mergedRanges.push(range);
      return previous = range;
    });
    return mergedRanges;
  }

  // Simplify a suggestion's URL (by removing those parts which aren't useful for display or comparison).
  shortenUrl() {
    if (this.shortUrl != null) { return this.shortUrl; }
    // We get easier-to-read shortened URLs if we URI-decode them.
    let url = (Utils.decodeURIByParts(this.url) || this.url).toLowerCase();
    for (const [filter, replacements] of Array.from(this.stripPatterns)) {
      if (new RegExp(filter).test(url)) {
        for (const replace of Array.from(replacements)) {
          url = url.replace(replace, '');
        }
      }
    }
    return this.shortUrl = url;
  }

  // Boost a relevancy score by a factor (in the range (0,1.0)), while keeping the score in the range [0,1].
  // This makes greater adjustments to scores near the middle of the range (so, very poor relevancy scores
  // remain very poor).
  static boostRelevancyScore(factor, score) {
    return score + (score < 0.5 ? score * factor : (1.0 - score) * factor);
  }
}
Suggestion.initClass();

class BookmarkCompleter {
  static initClass() {
    this.prototype.folderSeparator = '/';
    this.prototype.currentSearch = null;
    // These bookmarks are loaded asynchronously when refresh() is called.
    this.prototype.bookmarks = null;

    // If these names occur as top-level bookmark names, then they are not included in the names of bookmark folders.
    this.prototype.ignoreTopLevel = {
      'Other Bookmarks': true,
      'Mobile Bookmarks': true,
      'Bookmarks Bar': true,
    };
  }

  filter({ queryTerms }, onComplete) {
    this.queryTerms = queryTerms;
    this.onComplete = onComplete;
    this.currentSearch = { queryTerms: this.queryTerms, onComplete: this.onComplete };
    if (this.bookmarks) { return this.performSearch(); }
  }

  onBookmarksLoaded() { if (this.currentSearch) { return this.performSearch(); } }

  performSearch() {
    // If the folder separator character the first character in any query term, then we'll use the bookmark's full path as its title.
    // Otherwise, we'll just use the its regular title.
    const usePathAndTitle = this.currentSearch.queryTerms.reduce(((prev, term) => prev || (term.indexOf(this.folderSeparator) === 0)), false);
    const results = this.currentSearch.queryTerms.length > 0
      ? this.bookmarks.filter((bookmark) => {
        const suggestionTitle = usePathAndTitle ? bookmark.pathAndTitle : bookmark.title;
        if (bookmark.hasJavascriptPrefix == null) { bookmark.hasJavascriptPrefix = Utils.hasJavascriptPrefix(bookmark.url); }
        if (bookmark.hasJavascriptPrefix) { if (bookmark.shortUrl == null) { bookmark.shortUrl = 'javascript:...'; } }
        const suggestionUrl = bookmark.shortUrl != null ? bookmark.shortUrl : bookmark.url;
        return RankingUtils.matches(this.currentSearch.queryTerms, suggestionUrl, suggestionTitle);
      })
      : [];
    const suggestions = results.map((bookmark) => new Suggestion({
      queryTerms: this.currentSearch.queryTerms,
      type: 'bookmark',
      url: bookmark.url,
      title: usePathAndTitle ? bookmark.pathAndTitle : bookmark.title,
      relevancyFunction: this.computeRelevancy,
      shortUrl: bookmark.shortUrl,
      deDuplicate: (bookmark.shortUrl == null),
    }));
    const {
      onComplete,
    } = this.currentSearch;
    this.currentSearch = null;
    return onComplete(suggestions);
  }

  refresh() {
    this.bookmarks = null;
    return chrome.bookmarks.getTree((bookmarks) => {
      this.bookmarks = this.traverseBookmarks(bookmarks).filter((bookmark) => bookmark.url != null);
      return this.onBookmarksLoaded();
    });
  }

  // Traverses the bookmark hierarchy, and returns a flattened list of all bookmarks.
  traverseBookmarks(bookmarks) {
    const results = [];
    bookmarks.forEach((folder) => this.traverseBookmarksRecursive(folder, results));
    return results;
  }

  // Recursive helper for `traverseBookmarks`.
  traverseBookmarksRecursive(bookmark, results, parent) {
    if (parent == null) { parent = { pathAndTitle: '' }; }
    bookmark.pathAndTitle = bookmark.title && !((parent.pathAndTitle === '') && this.ignoreTopLevel[bookmark.title])
      ? parent.pathAndTitle + this.folderSeparator + bookmark.title
      : parent.pathAndTitle;
    results.push(bookmark);
    if (bookmark.children) { return bookmark.children.forEach((child) => this.traverseBookmarksRecursive(child, results, bookmark)); }
  }

  computeRelevancy(suggestion) {
    return RankingUtils.wordRelevancy(suggestion.queryTerms, suggestion.shortUrl != null ? suggestion.shortUrl : suggestion.url, suggestion.title);
  }
}
BookmarkCompleter.initClass();

class HistoryCompleter {
  filter({ queryTerms, seenTabToOpenCompletionList }, onComplete) {
    if ((queryTerms.length === 0) && !seenTabToOpenCompletionList) {
      onComplete([]);
      // Prime the history cache so that it will (hopefully) be available on the user's next keystroke.
      return Utils.nextTick(() => HistoryCache.use(() => {}));
    }
    return HistoryCache.use((history) => {
      const results = queryTerms.length > 0
        ? history.filter((entry) => RankingUtils.matches(queryTerms, entry.url, entry.title))
        :
      // The user has typed <Tab> to open the entire history (sorted by recency).
        history;
      return onComplete(results.map((entry) => new Suggestion({
        queryTerms,
        type: 'history',
        url: entry.url,
        title: entry.title,
        relevancyFunction: this.computeRelevancy,
        relevancyData: entry,
      })));
    });
  }

  computeRelevancy(suggestion) {
    const historyEntry = suggestion.relevancyData;
    const recencyScore = RankingUtils.recencyScore(historyEntry.lastVisitTime);
    // If there are no query terms, then relevancy is based on recency alone.
    if (suggestion.queryTerms.length === 0) { return recencyScore; }
    const wordRelevancy = RankingUtils.wordRelevancy(suggestion.queryTerms, suggestion.url, suggestion.title);
    // Average out the word score and the recency. Recency has the ability to pull the score up, but not down.
    return (wordRelevancy + Math.max(recencyScore, wordRelevancy)) / 2;
  }
}

// The domain completer is designed to match a single-word query which looks like it is a domain. This supports
// the user experience where they quickly type a partial domain, hit tab -> enter, and expect to arrive there.
class DomainCompleter {
  static initClass() {
    // A map of domain -> { entry: <historyEntry>, referenceCount: <count> }
    //  - `entry` is the most recently accessed page in the History within this domain.
    //  - `referenceCount` is a count of the number of History entries within this domain.
    //     If `referenceCount` goes to zero, the domain entry can and should be deleted.
    this.prototype.domains = null;
  }

  filter({ queryTerms, query }, onComplete) {
    // Do not offer completions if the query is empty, or if the user has finished typing the first word.
    if ((queryTerms.length === 0) || /\S\s/.test(query)) { return onComplete([]); }
    if (this.domains) {
      return this.performSearch(queryTerms, onComplete);
    }
    return this.populateDomains(() => this.performSearch(queryTerms, onComplete));
  }

  performSearch(queryTerms, onComplete) {
    const query = queryTerms[0];
    let domains = ((() => {
      const result = [];
      for (const domain of Object.keys(this.domains || {})) {
        if (domain.indexOf(query) >= 0) {
          result.push(domain);
        }
      }
      return result;
    })());
    domains = this.sortDomainsByRelevancy(queryTerms, domains);
    return onComplete([
      new Suggestion({
        queryTerms,
        type: 'domain',
        url: (domains[0] != null ? domains[0][0] : undefined) != null ? (domains[0] != null ? domains[0][0] : undefined) : '', // This is the URL or an empty string, but not null.
        relevancy: 2.0,
      }),
    ].filter((s) => s.url.length > 0));
  }

  // Returns a list of domains of the form: [ [domain, relevancy], ... ]
  sortDomainsByRelevancy(queryTerms, domainCandidates) {
    const results = (() => {
      const result = [];
      for (const domain of Array.from(domainCandidates)) {
        const recencyScore = RankingUtils.recencyScore(this.domains[domain].entry.lastVisitTime || 0);
        const wordRelevancy = RankingUtils.wordRelevancy(queryTerms, domain, null);
        const score = (wordRelevancy + Math.max(recencyScore, wordRelevancy)) / 2;
        result.push([domain, score]);
      }
      return result;
    })();
    results.sort((a, b) => b[1] - a[1]);
    return results;
  }

  populateDomains(onComplete) {
    return HistoryCache.use((history) => {
      this.domains = {};
      history.forEach((entry) => this.onPageVisited(entry));
      chrome.history.onVisited.addListener(this.onPageVisited.bind(this));
      chrome.history.onVisitRemoved.addListener(this.onVisitRemoved.bind(this));
      return onComplete();
    });
  }

  onPageVisited(newPage) {
    const domain = this.parseDomainAndScheme(newPage.url);
    if (domain) {
      const slot = this.domains[domain] || (this.domains[domain] = { entry: newPage, referenceCount: 0 });
      // We want each entry in our domains hash to point to the most recent History entry for that domain.
      if (slot.entry.lastVisitTime < newPage.lastVisitTime) { slot.entry = newPage; }
      return slot.referenceCount += 1;
    }
  }

  onVisitRemoved(toRemove) {
    if (toRemove.allHistory) {
      return this.domains = {};
    }
    return toRemove.urls.forEach((url) => {
      const domain = this.parseDomainAndScheme(url);
      if (domain && this.domains[domain] && ((this.domains[domain].referenceCount -= 1) === 0)) {
        return delete this.domains[domain];
      }
    });
  }

  // Return something like "http://www.example.com" or false.
  parseDomainAndScheme(url) {
    return Utils.hasFullUrlPrefix(url) && !Utils.hasChromePrefix(url) && url.split('/', 3).join('/');
  }
}
DomainCompleter.initClass();

// Searches through all open tabs, matching on title and URL.
class TabCompleter {
  filter({ queryTerms }, onComplete) {
    // NOTE(philc): We search all tabs, not just those in the current window. I'm not sure if this is the
    // correct UX.
    return chrome.tabs.query({}, (tabs) => {
      const results = tabs.filter((tab) => RankingUtils.matches(queryTerms, tab.url, tab.title));
      const suggestions = results.map((tab) => new Suggestion({
        queryTerms,
        type: 'tab',
        url: tab.url,
        title: tab.title,
        relevancyFunction: this.computeRelevancy,
        tabId: tab.id,
        deDuplicate: false,
      }));
      return onComplete(suggestions);
    });
  }

  computeRelevancy(suggestion) {
    if (suggestion.queryTerms.length) {
      return RankingUtils.wordRelevancy(suggestion.queryTerms, suggestion.url, suggestion.title);
    }
    return BgUtils.tabRecency.recencyScore(suggestion.tabId);
  }
}

class SearchEngineCompleter {
  static initClass() {
    this.debug = false;
    this.prototype.previousSuggestions = null;
  }

  cancel() {
    return CompletionSearch.cancel();
  }

  // This looks up the custom search engine and, if one is found, notes it and removes its keyword from the
  // query terms.
  preprocessRequest(request) {
    return SearchEngines.use((engines) => {
      const { queryTerms, query } = request;
      for (const key of Object.keys(engines || {})) { extend(request, { searchEngines: engines, keywords: key }); }
      const keyword = queryTerms[0];
      // Note. For a keyword "w", we match "w search terms" and "w ", but not "w" on its own.
      if (keyword && engines[keyword] && ((queryTerms.length > 1) || /\S\s/.test(query))) {
        return extend(request, {
          queryTerms: queryTerms.slice(1),
          keyword,
          engine: engines[keyword],
          isCustomSearch: true,
        });
      }
    });
  }

  refresh(port) {
    this.previousSuggestions = {};
    return SearchEngines.refreshAndUse(Settings.get('searchEngines'), (engines) => // Let the front-end vomnibar know the search-engine keywords.  It needs to know them so that, when the
    // query goes from "w" to "w ", the vomnibar can synchronously launch the next filter() request (which
    // avoids an ugly delay/flicker).
      port.postMessage({
        handler: 'keywords',
        keywords: ((() => {
          const result = [];
          for (const key of Object.keys(engines || {})) {
            result.push(key);
          }
          return result;
        })()),
      }));
  }

  filter(request, onComplete) {
    let suggestion;
    const { queryTerms, query, engine } = request;
    if (!engine) { return onComplete([]); }

    const { keyword, searchUrl, description } = engine;
    extend(request, searchUrl, { customSearchMode: true });

    if (this.previousSuggestions[searchUrl] == null) { this.previousSuggestions[searchUrl] = []; }
    const haveCompletionEngine = CompletionSearch.haveCompletionEngine(searchUrl);

    // This filter is applied to all of the suggestions from all of the completers, after they have been
    // aggregated by the MultiCompleter.
    const filter = (suggestions) => // We only keep suggestions which either *were* generated by this search engine, or *could have
    // been* generated by this search engine (and match the current query).
      (() => {
        const result = [];
        for (suggestion of Array.from(suggestions)) {
          if (suggestion.isSearchSuggestion || suggestion.isCustomSearch) {
            result.push(suggestion);
          } else {
            const terms = Utils.extractQuery(searchUrl, suggestion.url);
            if (!terms || !RankingUtils.matches(queryTerms, terms)) { continue; }
            suggestion.url = Utils.createSearchUrl(terms, searchUrl);
            result.push(suggestion);
          }
        }
        return result;
      })();

    // If a previous suggestion still matches the query, then we keep it (even if the completion engine may not
    // return it for the current query).  This allows the user to pick suggestions that they've previously seen
    // by typing fragments of their text, without regard to whether the completion engine can continue to
    // complete the actual text of the query.
    const previousSuggestions = queryTerms.length === 0
      ? []
      : (() => {
        const result = [];
        for (const _ of Object.keys(this.previousSuggestions[searchUrl] || {})) {
          suggestion = this.previousSuggestions[searchUrl][_];
          if (!RankingUtils.matches(queryTerms, suggestion.title)) { continue; }
          // Reset various fields, they may not be correct wrt. the current query.
          extend(suggestion, { relevancy: null, html: null, queryTerms });
          suggestion.relevancy = null;
          result.push(suggestion);
        }
        return result;
      })();

    const primarySuggestion = new Suggestion({
      queryTerms,
      type: description,
      url: Utils.createSearchUrl(queryTerms, searchUrl),
      title: queryTerms.join(' '),
      searchUrl,
      relevancy: 2.0,
      autoSelect: true,
      highlightTerms: false,
      isSearchSuggestion: true,
      isPrimarySuggestion: true,
    });

    if (queryTerms.length === 0) { return onComplete([primarySuggestion], { filter }); }

    const mkSuggestion = (() => {
      let count = 0;
      return (suggestion) => {
        const url = Utils.createSearchUrl(suggestion, searchUrl);
        return this.previousSuggestions[searchUrl][url] = new Suggestion({
          queryTerms,
          type: description,
          url,
          title: suggestion,
          searchUrl,
          insertText: suggestion,
          highlightTerms: false,
          highlightTermsExcludeUrl: true,
          isCustomSearch: true,
          relevancy: ++count === 1 ? 1.0 : null,
          relevancyFunction: this.computeRelevancy,
        });
      };
    })();

    const cachedSuggestions = haveCompletionEngine ? CompletionSearch.complete(searchUrl, queryTerms) : null;

    const suggestions = previousSuggestions;
    suggestions.push(primarySuggestion);

    if ((queryTerms.length === 0) || (cachedSuggestions != null) || !haveCompletionEngine) {
      // There is no prospect of adding further completions, so we're done.
      if (cachedSuggestions != null) { suggestions.push(...Array.from(cachedSuggestions.map(mkSuggestion) || [])); }
      return onComplete(suggestions, { filter, continuation: null });
    }
    // Post the initial suggestions, but then deliver any further completions asynchronously, as a
    // continuation.
    return onComplete(suggestions, {
      filter,
      continuation: (onComplete) => CompletionSearch.complete(searchUrl, queryTerms, (suggestions) => {
        if (suggestions == null) { suggestions = []; }
        if (SearchEngineCompleter.debug) { console.log('fetched suggestions:', suggestions.length, query); }
        return onComplete(suggestions.map(mkSuggestion));
      }),
    });
  }

  computeRelevancy({ relevancyData, queryTerms, title }) {
    // Tweaks:
    // - Calibration: we boost relevancy scores to try to achieve an appropriate balance between relevancy
    //   scores here, and those provided by other completers.
    // - Relevancy depends only on the title (which is the search terms), and not on the URL.
    return Suggestion.boostRelevancyScore(0.5,
      0.7 * RankingUtils.wordRelevancy(queryTerms, title, title));
  }

  postProcessSuggestions(request, suggestions) {
    let engine;
    if (!request.searchEngines) { return; }
    const engines = ((() => {
      const result = [];
      for (const _ of Object.keys(request.searchEngines || {})) {
        engine = request.searchEngines[_];
        result.push(engine);
      }
      return result;
    })());
    engines.sort((a, b) => b.searchUrl.length - a.searchUrl.length);
    engines.push({ keyword: null, description: 'search history', searchUrl: Settings.get('searchUrl') });
    return (() => {
      const result1 = [];
      for (var suggestion of Array.from(suggestions)) {
        if (!suggestion.isSearchSuggestion && !suggestion.insertText) {
          result1.push((() => {
            const result2 = [];
            for (engine of Array.from(engines)) {
              if (suggestion.insertText = Utils.extractQuery(engine.searchUrl, suggestion.url)) {
                // suggestion.customSearchMode informs the vomnibar that, if the users edits the text from this
                // suggestion, then custom search-engine mode should be activated.
                suggestion.customSearchMode = engine.keyword;
                if (!suggestion.title) { suggestion.title = suggestion.insertText; }
                break;
              } else {
                result2.push(undefined);
              }
            }
            return result2;
          })());
        } else {
          result1.push(undefined);
        }
      }
      return result1;
    })();
  }
}
SearchEngineCompleter.initClass();

// A completer which calls filter() on many completers, aggregates the results, ranks them, and returns the top
// 10. All queries from the vomnibar come through a multi completer.
class MultiCompleter {
  static initClass() {
    this.prototype.maxResults = 10;
    this.prototype.filterInProgress = false;
    this.prototype.mostRecentQuery = null;
  }

  constructor(completers) {
    this.completers = completers;
  }

  refresh(port) { return Array.from(this.completers).map((completer) => (typeof completer.refresh === 'function' ? completer.refresh(port) : undefined)); }

  cancel(port) { return Array.from(this.completers).map((completer) => (typeof completer.cancel === 'function' ? completer.cancel(port) : undefined)); }

  filter(request, onComplete) {
    // Allow only one query to run at a time.
    if (this.filterInProgress) { return this.mostRecentQuery = arguments; }

    // Provide each completer with an opportunity to see (and possibly alter) the request before it is
    // launched.
    for (const completer of Array.from(this.completers)) {
      if (typeof completer.preprocessRequest === 'function') {
        completer.preprocessRequest(request);
      }
    }

    RegexpCache.clear();
    const { queryTerms } = request;

    [this.mostRecentQuery, this.filterInProgress] = Array.from([null, true]);
    let [suggestions, continuations, filters] = Array.from([[], [], []]);

    // Run each of the completers (asynchronously).
    let jobs = new JobRunner(this.completers.map((completer) => (callback) => completer.filter(request, (newSuggestions, param) => {
      if (newSuggestions == null) { newSuggestions = []; }
      if (param == null) { param = {}; }
      const { continuation, filter } = param;
      suggestions.push(...Array.from(newSuggestions || []));
      if (continuation != null) { continuations.push(continuation); }
      if (filter != null) { filters.push(filter); }
      return callback();
    })));

    // Once all completers have finished, process the results and post them, and run any continuations or a
    // pending query.
    return jobs.onReady(() => {
      let filter;
      for (filter of Array.from(filters)) { suggestions = filter(suggestions); }
      const shouldRunContinuations = (continuations.length > 0) && (this.mostRecentQuery == null);

      // Post results, unless there are none and we will be running a continuation.  This avoids
      // collapsing the vomnibar briefly before expanding it again, which looks ugly.
      if ((suggestions.length !== 0) || !shouldRunContinuations) {
        suggestions = this.prepareSuggestions(request, queryTerms, suggestions);
        onComplete({ results: suggestions });
      }

      // Run any continuations (asynchronously); for example, the search-engine completer
      // (SearchEngineCompleter) uses a continuation to fetch suggestions from completion engines
      // asynchronously.
      if (shouldRunContinuations) {
        jobs = new JobRunner(continuations.map((continuation) => (callback) => continuation((newSuggestions) => {
          suggestions.push(...Array.from(newSuggestions || []));
          return callback();
        })));

        jobs.onReady(() => {
          for (filter of Array.from(filters)) { suggestions = filter(suggestions); }
          suggestions = this.prepareSuggestions(request, queryTerms, suggestions);
          return onComplete({ results: suggestions });
        });
      }

      // Admit subsequent queries and launch any pending query.
      this.filterInProgress = false;
      if (this.mostRecentQuery) {
        return this.filter(...Array.from(this.mostRecentQuery || []));
      }
    });
  }

  prepareSuggestions(request, queryTerms, suggestions) {
    // Compute suggestion relevancies and sort.
    let suggestion;
    for (suggestion of Array.from(suggestions)) { suggestion.computeRelevancy(queryTerms); }
    suggestions.sort((a, b) => b.relevancy - a.relevancy);

    // Simplify URLs and remove duplicates (duplicate simplified URLs, that is).
    let count = 0;
    const seenUrls = {};
    suggestions = (() => {
      const result = [];
      for (suggestion of Array.from(suggestions)) {
        const url = suggestion.shortenUrl();
        if (suggestion.deDuplicate && seenUrls[url]) { continue; }
        if (count++ === this.maxResults) { break; }
        result.push(seenUrls[url] = suggestion);
      }
      return result;
    })();

    // Give each completer the opportunity to tweak the suggestions.
    for (const completer of Array.from(this.completers)) {
      if (typeof completer.postProcessSuggestions === 'function') {
        completer.postProcessSuggestions(request, suggestions);
      }
    }

    // Generate HTML for the remaining suggestions and return them.
    for (suggestion of Array.from(suggestions)) { suggestion.generateHtml(request); }
    return suggestions;
  }
}
MultiCompleter.initClass();

// Utilities which help us compute a relevancy score for a given item.
var RankingUtils = {
  // Whether the given things (usually URLs or titles) match any one of the query terms.
  // This is used to prune out irrelevant suggestions before we try to rank them, and for calculating word relevancy.
  // Every term must match at least one thing.
  matches(queryTerms, ...things) {
    for (const term of Array.from(queryTerms)) {
      const regexp = RegexpCache.get(term);
      let matchedTerm = false;
      for (const thing of Array.from(things)) {
        if (!matchedTerm) { matchedTerm = thing.match(regexp); }
      }
      if (!matchedTerm) { return false; }
    }
    return true;
  },

  // Weights used for scoring matches.
  matchWeights: {
    matchAnywhere: 1,
    matchStartOfWord: 1,
    matchWholeWord: 1,
    // The following must be the sum of the three weights above; it is used for normalization.
    maximumScore: 3,
    //
    // Calibration factor for balancing word relevancy and recency.
    recencyCalibrator: 2.0 / 3.0,
  },
  // The current value of 2.0/3.0 has the effect of:
  //   - favoring the contribution of recency when matches are not on word boundaries ( because 2.0/3.0 > (1)/3     )
  //   - favoring the contribution of word relevance when matches are on whole words  ( because 2.0/3.0 < (1+1+1)/3 )

  // Calculate a score for matching term against string.
  // The score is in the range [0, matchWeights.maximumScore], see above.
  // Returns: [ score, count ], where count is the number of matched characters in string.
  scoreTerm(term, string) {
    let score = 0;
    let count = 0;
    const nonMatching = string.split(RegexpCache.get(term));
    if (nonMatching.length > 1) {
      // Have match.
      score = RankingUtils.matchWeights.matchAnywhere;
      count = nonMatching.reduce(((p, c) => p - c.length), string.length);
      if (RegexpCache.get(term, '\\b').test(string)) {
        // Have match at start of word.
        score += RankingUtils.matchWeights.matchStartOfWord;
        if (RegexpCache.get(term, '\\b', '\\b').test(string)) {
          // Have match of whole word.
          score += RankingUtils.matchWeights.matchWholeWord;
        }
      }
    }
    return [score, count < string.length ? count : string.length];
  },

  // Returns a number between [0, 1] indicating how often the query terms appear in the url and title.
  wordRelevancy(queryTerms, url, title) {
    let titleCount; let
      titleScore;
    let urlScore = (titleScore = 0.0);
    let urlCount = (titleCount = 0);
    // Calculate initial scores.
    for (const term of Array.from(queryTerms)) {
      let [s, c] = Array.from(RankingUtils.scoreTerm(term, url));
      urlScore += s;
      urlCount += c;
      if (title) {
        [s, c] = Array.from(RankingUtils.scoreTerm(term, title));
        titleScore += s;
        titleCount += c;
      }
    }

    const maximumPossibleScore = RankingUtils.matchWeights.maximumScore * queryTerms.length;

    // Normalize scores.
    urlScore /= maximumPossibleScore;
    urlScore *= RankingUtils.normalizeDifference(urlCount, url.length);

    if (title) {
      titleScore /= maximumPossibleScore;
      titleScore *= RankingUtils.normalizeDifference(titleCount, title.length);
    } else {
      titleScore = urlScore;
    }

    // Prefer matches in the title over matches in the URL.
    // In other words, don't let a poor urlScore pull down the titleScore.
    // For example, urlScore can be unreasonably poor if the URL is very long.
    if (urlScore < titleScore) { urlScore = titleScore; }

    // Return the average.
    return (urlScore + titleScore) / 2;
  },

  // Untested alternative to the above:
  //   - Don't let a poor urlScore pull down a good titleScore, and don't let a poor titleScore pull down a
  //     good urlScore.
  //
  // return Math.max(urlScore, titleScore)

  // Returns a score between [0, 1] which indicates how recent the given timestamp is. Items which are over
  // a month old are counted as 0. This range is quadratic, so an item from one day ago has a much stronger
  // score than an item from two days ago.
  recencyScore(lastAccessedTime) {
    if (!this.oneMonthAgo) { this.oneMonthAgo = 1000 * 60 * 60 * 24 * 30; }
    const recency = Date.now() - lastAccessedTime;
    const recencyDifference = Math.max(0, this.oneMonthAgo - recency) / this.oneMonthAgo;

    // recencyScore is between [0, 1]. It is 1 when recenyDifference is 0. This quadratic equation will
    // incresingly discount older history entries.
    let recencyScore = recencyDifference * recencyDifference * recencyDifference;

    // Calibrate recencyScore vis-a-vis word-relevancy scores.
    return recencyScore *= RankingUtils.matchWeights.recencyCalibrator;
  },

  // Takes the difference of two numbers and returns a number between [0, 1] (the percentage difference).
  normalizeDifference(a, b) {
    const max = Math.max(a, b);
    return (max - Math.abs(a - b)) / max;
  },
};

// We cache regexps because we use them frequently when comparing a query to history entries and bookmarks,
// and we don't want to create fresh objects for every comparison.
var RegexpCache = {
  init() {
    this.initialized = true;
    return this.clear();
  },

  clear() { return this.cache = {}; },

  // Get rexexp for `string` from cache, creating it if necessary.
  // Regexp meta-characters in `string` are escaped.
  // Regexp is wrapped in `prefix`/`suffix`, which may contain meta-characters (these are not escaped).
  // With their default values, `prefix` and `suffix` have no effect.
  // Example:
  //   - string="go", prefix="\b", suffix=""
  //   - this returns regexp matching "google", but not "agog" (the "go" must occur at the start of a word)
  // TODO: `prefix` and `suffix` might be useful in richer word-relevancy scoring.
  get(string, prefix, suffix) {
    if (prefix == null) { prefix = ''; }
    if (suffix == null) { suffix = ''; }
    if (!this.initialized) { this.init(); }
    let regexpString = Utils.escapeRegexSpecialCharacters(string);
    // Avoid cost of constructing new strings if prefix/suffix are empty (which is expected to be a common case).
    if (prefix) { regexpString = prefix + regexpString; }
    if (suffix) { regexpString += suffix; }
    // Smartcase: Regexp is case insensitive, unless `string` contains a capital letter (testing `string`, not `regexpString`).
    return this.cache[regexpString] || (this.cache[regexpString] = new RegExp(regexpString, (Utils.hasUpperCase(string) ? '' : 'i')));
  },
};

// Provides cached access to Chrome's history. As the user browses to new pages, we add those pages to this
// history cache.
var HistoryCache = {
  size: 20000,
  history: null, // An array of History items returned from Chrome.

  reset() {
    this.history = null;
    return this.callbacks = null;
  },

  use(callback) {
    if (this.history != null) { return callback(this.history); } return this.fetchHistory(callback);
  },

  fetchHistory(callback) {
    if (this.callbacks) { return this.callbacks.push(callback); }
    this.callbacks = [callback];
    return chrome.history.search({ text: '', maxResults: this.size, startTime: 0 }, (history) => {
      // On Firefox, some history entries do not have titles.
      history.map((entry) => (entry.title != null ? entry.title : (entry.title = '')));
      history.sort(this.compareHistoryByUrl);
      this.history = history;
      chrome.history.onVisited.addListener(this.onPageVisited.bind(this));
      chrome.history.onVisitRemoved.addListener(this.onVisitRemoved.bind(this));
      for (callback of Array.from(this.callbacks)) { callback(this.history); }
      return this.callbacks = null;
    });
  },

  compareHistoryByUrl(a, b) {
    if (a.url === b.url) { return 0; }
    if (a.url > b.url) { return 1; }
    return -1;
  },

  // When a page we've seen before has been visited again, be sure to replace our History item so it has the
  // correct "lastVisitTime". That's crucial for ranking Vomnibar suggestions.
  onPageVisited(newPage) {
    // On Firefox, some history entries do not have titles.
    if (newPage.title == null) { newPage.title = ''; }
    const i = HistoryCache.binarySearch(newPage, this.history, this.compareHistoryByUrl);
    const pageWasFound = ((this.history[i] != null ? this.history[i].url : undefined) === newPage.url);
    if (pageWasFound) {
      return this.history[i] = newPage;
    }
    return this.history.splice(i, 0, newPage);
  },

  // When a page is removed from the chrome history, remove it from the vimium history too.
  onVisitRemoved(toRemove) {
    if (toRemove.allHistory) {
      return this.history = [];
    }
    return toRemove.urls.forEach((url) => {
      const i = HistoryCache.binarySearch({ url }, this.history, this.compareHistoryByUrl);
      if ((i < this.history.length) && (this.history[i].url === url)) {
        return this.history.splice(i, 1);
      }
    });
  },
};

// Returns the matching index or the closest matching index if the element is not found. That means you
// must check the element at the returned index to know whether the element was actually found.
// This method is used for quickly searching through our history cache.
HistoryCache.binarySearch = function (targetElement, array, compareFunction) {
  let element; let
    middle;
  let high = array.length - 1;
  let low = 0;

  while (low <= high) {
    middle = Math.floor((low + high) / 2);
    element = array[middle];
    const compareResult = compareFunction(element, targetElement);
    if (compareResult > 0) {
      high = middle - 1;
    } else if (compareResult < 0) {
      low = middle + 1;
    } else {
      return middle;
    }
  }
  // We didn't find the element. Return the position where it should be in this array.
  if (compareFunction(element, targetElement) < 0) { return middle + 1; } return middle;
};

const root = typeof exports !== 'undefined' && exports !== null ? exports : window;
root.Suggestion = Suggestion;
root.BookmarkCompleter = BookmarkCompleter;
root.MultiCompleter = MultiCompleter;
root.HistoryCompleter = HistoryCompleter;
root.DomainCompleter = DomainCompleter;
root.TabCompleter = TabCompleter;
root.SearchEngineCompleter = SearchEngineCompleter;
root.HistoryCache = HistoryCache;
root.RankingUtils = RankingUtils;
root.RegexpCache = RegexpCache;
