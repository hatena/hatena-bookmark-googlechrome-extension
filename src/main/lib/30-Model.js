var Model = {};

(function(Model) {
var Bookmark;

const schema = {
    version: 1,
    stores: [ {
        name: "bookmarks",
        key: { keyPath: "url", autoIncrement: false },
        indices: [ { name: "date", path: "date", opts: { unique: false } } ]
    } ]
};

Model.initialize = function(force) {
    const deferred = new Deferred; // parallel に Promise との互換性がないためにラップする
    const idbm = Model.getDatabase();
    (force ? idbm.destroy() : Promise.resolve()).then(function() {
        return idbm.initialize(schema)
    }).then(() => {
        Model.idbm = idbm;
        deferred.call();
    });
    return deferred;
}

Model.getDatabase = function() {
    return UserManager.user.database;
}

class _Bookmark {
    static get storeName () { return "bookmarks" }

    static findByUrl(url) {
        const d = new Deferred;
        Model.idbm.get("bookmarks", url).then(bookmark => {
            d.call(bookmark && new Bookmark(bookmark));
        });
        return d;
    }

    static findFirst() {
        const d = new Deferred;
        Model.idbm.search(
            "bookmarks",
            undefined,
            { indexName: "date", direction: "prev", limit: 1 }
        ).then(bookmarks => {
            d.call(bookmarks[0] && new Bookmark(bookmarks[0]));
        });
        return d;
    }

    static splitSearchWord(word) {
        return (word || '').toUpperCase().replace(/\s+$/, "").split(/\s+/);
    }

    static search(word, options = {}) {
        var words = this.splitSearchWord(word);
        const d = new Deferred;
        Model.idbm.search(_Bookmark.storeName, null, {
            // order は date 一択
            indexName: 'date',
            // いままでのインターフェースに無理矢理合わせる
            direction: (options.order || '').match('desc') ? 'prev' : 'next',
            filter: function(cursor) {
                const val = cursor.value;
                for (const word of words) {
                    if (!(
                        val.url.toUpperCase().match(word) ||
                        val.title.toUpperCase().match(word) ||
                        val.comment.toUpperCase().match(word)
                    )) { return false; }
                }
                return true;
            },
            limit: options.limit || 20,
            offset: options.offset || 0
        }).then(bookmarks => {
            d.call(bookmarks.map(bookmark => new Bookmark(bookmark)));
        });
        return d;
    }

    static parse(str) {
        var re = /\[([^\[\]]+)\]/g;
        var match;
        var tags = [];
        var lastIndex = 0;
        while ((match = re.exec(str))) {
            lastIndex += match[0].length;
            if (lastIndex == re.lastIndex) {
                var tag = match[1];
                if (!tags.some(function(t) {
                    return tag == t;
                })) {
                    tags.push(match[1]);
                }
            }
        }
        var comment = str.substring(lastIndex) || '';

        return [tags, comment];
    }

    static parseTags(str) {
        var tmp = _Bookmark.parse(str);
        return tmp[0];
    }

    static putAll(bookmarks) {
        return Model.idbm.putAll(_Bookmark.storeName, bookmarks);
    }

    constructor(args) {
        this._data = {};
        if (args) {
            Object.keys(args).forEach(key => { this[key] = args[key] });
        }
    }

    save() {
        const deferred = new Deferred;
        Model.idbm.put(_Bookmark.storeName, this._data).then(() => {
            deferred.call(this)
        }, console.log);
        return deferred;
    }

    saveWithTransaction() {
        return this.save();
    }

    destroy() {
        const deferred = new Deferred;
        Model.idbm.delete(_Bookmark.storeName, this.url).then(() => {
            deferred.call(this)
        }, console.log);
        return deferred;
    }

    get(key) { return this._data[key]; }

    set(key, val) { this._data[key] = val; }

    // accessors

    get url()    { return this._data.url }
    set url(val) { this._data.url = val }
    get title()    { return this._data.title }
    set title(val) { this._data.title = val }
    get comment()    { return this._data.comment }
    set comment(val) { this._data.comment = val }
    get date() {
        const val = this._data.date;
        if (typeof val == 'undefined') {
            return;
        } else {
            return new Date(val * 1000);
        }
    }
    set date(val) {
        if (typeof val === 'number') {
            this._data.date = val;
        } else {
            this._data.date = val.getTime() / 1000;
        }
    }
    get dateFullYMD() {
        var d = this.date;
        return sprintf('%04d%02d%02d%02d%02d%02d', d.getFullYear(), (d.getMonth()+1), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds());
    }
    get dateYMDHM() {
        var d = this.date;
        return sprintf('%04d/%02d/%02d %02d:%02d', d.getFullYear(), (d.getMonth()+1), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds());
    }
    get dateYMD() {
        var d = this.date;
        return sprintf('%04d/%02d/%02d', d.getFullYear(), (d.getMonth()+1), d.getDate());
    }
    get tags() {
        return Bookmark.parseTags(this.comment);
    }
    get body() {
        var tmp = Bookmark.parse(this.comment);
        return tmp[1];
    }
}
Bookmark = Model.Bookmark = _Bookmark;

})(Model);

var M = function(name) {
    return Model[name];
}

