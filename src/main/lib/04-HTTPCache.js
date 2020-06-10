
var HTTPCache = function(key, options) {
    if (!options) options = {};
    this.options = options;
    this.cache = new ExpireCache('http-' + key, options.expire, options.seriarizer);
}

HTTPCache.prototype = {
    createURL: function HTTPCache_createURL (url) {
        if (this.options.encoder)
            url = this.options.encoder(url);

        if (this.options.createURL) {
            return this.options.createURL(url);
        } else {
            return (this.options.baseURL || '') + url;
        }
    },
    isValid: function(url) {
        return true;
    },
    get: function HTTPCache_get(url) {
        if (!this.isValid(url)) {
            return Deferred.next($K(null));
        }

        var cache = this.cache;
        if (cache.has(url)) {
            var val = cache.get(url);
            return Deferred.next($K(val));
        } else {
            var self = this;
            var d = new Deferred();
            var dataType = ( this.options.json ? 'text' : void 0 );
            var reqUrl = this.createURL( url );
            $.ajax({ url: reqUrl, dataType: dataType, cache: false }).next(function(res) {
                d.call(self.setResCache(url, res));
            }).error(function() {
                cache.set(url, null);
                d.call(null);
            });
            return d;
        }
    },
    setResCache: function HTTPCache_setResCache(url, res) {
        var cache = this.cache;
        var val = res;
        if (this.options.json) {
            // ({foo: 'bar'}) な JSON 対策
            if (val.indexOf('(') == 0) {
                val = val.substring(1);
                val = val.substr(0, val.lastIndexOf(')'));
            }
            val = JSON.parse(val);
        }
        if (this.options.beforeSetFilter) {
            cache.set(url, this.options.beforeSetFilter(val));
        } else {
            cache.set(url, val);
        }
        p('http not using cache: ' + url);
        return cache.get(url);
    },
    clear: function HTTPCache_clear (url) {
        p('http cache clear: ' + url);
        return this.cache.clear(url);
    },
    clearAll: function HTTPCache_clearAll () {
        return this.cache.clearAll();
    },
    has: function HTTPCache_has (url) {
        return this.cache.has(url);
    }
}

HTTPCache.encodeBookmarkURL = function(url) {
    console.log(encodeURIComponent((url || '').replace(/#/, '%23')));
    return encodeURIComponent((url || '').replace(/#/, '%23'));
}

HTTPCache.counter = new HTTPCache('counterCache', {
    expire: 60 * 15,
    baseURL: B_API_ORIGIN + '/entry.count?url=',
    // encoder: HTTPCache.encodeBookmarkURL,
    encoder: encodeURIComponent,
});

HTTPCache.counter.isValid = function(url) {
    // XXX
    if(Config.get('background.bookmarkcounter.enabled')) {
        var blacklistText = Config.get('background.bookmarkcounter.blacklist');
        if(typeof blacklistText !== 'string') {
            return true;
        }
        var blacklist = blacklistText.split('\n');
        return !blacklist.some(function(regexpText) {
            if(!regexpText.length) {
                return false;
            }           
            var re = new RegExp(regexpText);
            return re.test(url);
        })
    } else {
        return false;
    }
};

/*
HTTPCache.counter.createFilter = function(ev) {
    let filters = eval( '(' + HTTPCache.counter.prefs.get('counterIgnoreList') + ')');
    HTTPCache.counter.setFilter(filters);
};

HTTPCache.counter.setFilter = function(filters) {
    HTTPCache.counter.filters = filters.map(function(v) new RegExp(v));
}

HTTPCache.counter.loadHandler = function(ev) {
    HTTPCache.counter.createFilter();
    HTTPCache.counter.prefs.createListener('counterIgnoreList', HTTPCache.counter.createFilter);
};
*/

HTTPCache.comment = new HTTPCache('commentCache', {
    expire: 60 * 30,
    baseURL: B_API_ORIGIN + '/entry/jsonlite/?url=',
    seriarizer: 'JSON',
    json: true,
    // encoder: HTTPCache.encodeBookmarkURL,
    encoder: encodeURIComponent,
});

HTTPCache.popularComment = new HTTPCache('popularCommentCache', {
    expire: 60 * 30,
    baseURL: B_API_ORIGIN + '/api/viewer.popular_bookmarks?url=',
    seriarizer: 'JSON',
    json: true,
    encoder: encodeURIComponent,
});

HTTPCache.entry = new HTTPCache('entryCache', {
    expire: 60 * 15,
    baseURL: B_API_ORIGIN + '/my.entry?url=',
    seriarizer: 'JSON',
    json: true,
    // encoder: HTTPCache.encodeBookmarkURL,
    encoder: encodeURIComponent,
});

HTTPCache.usertags = new HTTPCache('usertagsCache', {
    expire: 60 * 60 * 24,
    seriarizer: 'JSON',
    json: true,
    beforeSetFilter: function(val) {
        var tags = val.tags || [];
        var res = {
            tagsArray: [],
            tags: {},
            tagsKeys: [],
            tagsCountSortedKeys: [],
        }

        for (var tag in tags) {
            if (tags[tag].count) {
                res.tagsArray.push([tag, parseInt(tags[tag].count, 10), tags[tag].timestamp]);
                res.tags[tag] = tags[tag];
                res.tagsKeys.push(tag);
                res.tagsCountSortedKeys.push([tag, parseInt(tags[tag].count, 10)]);
            }
        }

        res.tagsCountSortedKeys.sort(function(a, b) {
            if (a[1] > b[1]) {
                return -1;
            } else if (a[1] < b[1]) {
                return 1;
            } else {
                return 0;
            }
        });

        var keySortFunc = function(a, b) {
            if (a.toUpperCase() > b.toUpperCase() ) {
                return 1;
            } else if (a.toUpperCase() < b.toUpperCase() ) {
                return -1;
            } else {
                return 0;
            }
        }

        res.tagsCountSortedKeys = res.tagsCountSortedKeys.map(function(e) { return e[0] });
        res.tagsCountSortedKeys.sort(keySortFunc);
        res.tagsKeys.sort(keySortFunc);
        return res;
    },
    createURL: function(name) {
        return sprintf('%s/%s/tags.json', B_API_ORIGIN, name);
    }
});

HTTPCache.clearCached = function(url) {
    HTTPCache.entry.clear(url);
    HTTPCache.counter.clear(url);
    HTTPCache.comment.clear(url);
}

