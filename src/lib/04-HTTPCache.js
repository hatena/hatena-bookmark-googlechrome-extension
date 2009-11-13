
var HTTPCache = function(key, options) {
    if (!options) options = {};
    this.options = options;
    this.cache = new ExpireCache('http-' + key, options.expire, options.seriarizer);
}

HTTPCache.prototype = {
    createURL: function HTTPCache_createURL (url) {
        if (this.options.encoder)
            url = this.options.encoder(url);
        return (this.options.baseURL || '') + url;
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
            $.get(this.createURL(url)).next(function(res) {
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
        cache.set(url, val);
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
    return encodeURIComponent((url || '').replace(/#/, '%23'));
}

HTTPCache.counter = new HTTPCache('counterCache', {
    expire: 60 * 15,
    baseURL: B_API_STATIC_HTTP + 'entry.count?url=',
    encoder: HTTPCache.encodeBookmarkURL,
});

HTTPCache.counter.isValid = function(url) {
    // XXX
    if (url.indexOf('https') == 0) {
        return false;
    } else {
        return true;
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
    baseURL: B_HTTP + 'entry/jsonlite/?url=',
    seriarizer: 'JSON',
    json: true,
    encoder: HTTPCache.encodeBookmarkURL,
});

HTTPCache.entry = new HTTPCache('entryCache', {
    expire: 60 * 15,
    baseURL: B_HTTP + 'my.entry?url=',
    seriarizer: 'JSON',
    json: true,
    encoder: HTTPCache.encodeBookmarkURL,
});

HTTPCache.clearCached = function(url) {
    HTTPCache.entry.clear(url);
    HTTPCache.counter.clear(url);
    HTTPCache.comment.clear(url);
}

