
var URI = function(schema, host, port, path, search, hash) {
    if (this instanceof URI) {
        this.init.apply(this, arguments);
    } else {
       var i = function () {};
       i.prototype = URI.prototype;
       var o = new i;
       URI.apply(o, arguments);
       return o;
    }
}

URI.URI_REGEXP = new RegExp('^([^:/]+)://([^:/]+)(?::(\\d{1,5}))?(/[^?#]*?)(\\?[^#]*)?(#.*)?$');

URI.parse = function(url) {
    var m = url.match(URI.URI_REGEXP);
    if (!m) throw new Error('invalid uri: ' + url);
    m.shift();
    return URI.apply(null, m);
}

URI.pathQuery = function(path) {
    return URI.parse('none://none' + path);
}

URI.parseQuery = function(query) {
     var res = {};
     query.split('&').forEach(function(q) {
         var kv = q.split('=',2);
         res[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
     });
     return res;
}

URI.prototype = {
    init: function(schema, host, port, path, search, hash) {
        this.schema = schema || '';
        this.host = host || '';
        this.port = port || '';
        this.path = path || '';
        this.search = search || '';
        this.hash = hash || '';
    },
    get pathQuery() {
        return this.path + this.search;
    },
    get encodeURI() {
        return encodeURIComponent(this.href);
    },
    param: function(obj, arg) {
        var pair = this._getSearchHash();
        if ((typeof obj === 'string' || obj instanceof String) && typeof arg == 'undefined') {
            return pair[obj];
        } else {
            if (typeof arg != 'undefined') {
                var key = obj;
                obj = {};
                obj[key] = arg;
            }

            var updated = false;
            for (var key in obj) {
                if (obj[key] === null || typeof obj[key] == 'undefined') {
                    delete pair[key];
                } else {
                    pair[key] = obj[key];
                }
                updated = true;
            }
            if (updated) {
                var res = [];
                for (var key in pair) {
                    res.push([encodeURIComponent(key), encodeURIComponent(pair[key])].join('='));
                }
                if (res.length) {
                    this.search = '?' + res.join('&');
                } else {
                    this.search = '';
                }
            }
        }
    },
    _getSearchHash: function() {
        if (this.search.indexOf('?') != 0) {
            return {};
        } else {
            var query = this.search.substring(1);
            return URI.parseQuery(query);
        }
    },
    get entryURL() {
        var url = [
            this.host,
            (this.port ? ':' + this.port : ''),
            this.path,
            this.search,
            this.hash.replace(/#/, '%23')
        ].join('');
        if (this.isHTTPS) url = 's/' + url;
        return B_ORIGIN + 'entry/' + url;
    },
    get isHTTPS() {
        return this.schema == 'https';
    },
    get href() {
        return [
            this.schema, '://',
            this.host,
            (this.port ? ':' + this.port : ''),
            this.path,
            this.search,
            this.hash
        ].join('');
    },
    toString: function() {
        return this.href;
    }
}

/*
User.SaveRequester = $({});
User.SaveRequester.prototype = {
    save: function() {
        }
}
*/
