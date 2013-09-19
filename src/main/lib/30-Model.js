
(function(Model) {
var Bookmark, Tag;

Model.initialize = function(force) {
    // return parallel([Bookmark.initialize()]).next(Bookmark.destroyAll());
    // return Bookmark.initialize();//.next(Bookmark.destroyAll());
    if (force) {
        return Deferred.parallel([
            Bookmark.dropTable(force).next(Bookmark.initialize).error(Bookmark.initialize),
            Tag.dropTable(force).next(Tag.initialize).error(Tag.initialize)
        ]);//.next(Bookmark.destroyAll());
    } else {
        return Deferred.parallel([
            Bookmark.isTableCreated().next(function(bool) {
                if (!bool) {
                    return Bookmark.initialize();
                } else {
                    return Deferred.next();
                }
            }),
            Tag.isTableCreated().next(function(bool) {
                if (!bool) {
                    return Tag.initialize();
                } else {
                    return Deferred.next();
                }
            })
       ]);
    }
}

Model.getDatabase = function() {
    return UserManager.user.database;
}

Bookmark = Model.Bookmark = Model({
    table: 'bookmarks',
    primaryKeys: ['id'],
    fields: {
        'id'    : 'INTEGER PRIMARY KEY',
        url     : 'TEXT UNIQUE NOT NULL',
        title   : 'TEXT',
        comment : 'TEXT',
        search  : 'TEXT COLLATE NOCASE',
        date    : 'INTEGER NOT NULL'
    }
});

Bookmark.proxyColumns({
    date: {
        getter: function(val) {
            if (typeof val == 'undefined') {
                return;
            } else {
                return new Date(val * 1000);
            }
        },
        setter: function(val) {
            return val.getTime() / 1000;
        }
    }
});

Bookmark.__defineGetter__('database', function() { return Model.getDatabase() });

Bookmark.afterTrigger('createTable', function() {
    return Model.getDatabase().execute([
        'CREATE INDEX "bookmarks_date" ON "bookmarks" ("date" DESC)',
        'CREATE INDEX "bookmarks_date" ON "bookmarks" ("date" ASC)'
    ]).error(function() { return true });
});

$.extend(Bookmark, {
    SEP: "\u0002",
    beforeSave: function(b) {
        // chrome webdatabase 5M 制限のため、search テーブルを使わない
        // b.search = ("" + b.get('comment') + Bookmark.SEP + b.get('title') + Bookmark.SEP + b.get('url')).toUpperCase();
    },
    afterSave: function(b) {
        b.updateTags();
    },
    findByUrl: function(url) {
        return Bookmark.findFirst({where: {url: url}});
    },
    parseTags: function(str) {
        var tmp = Bookmark.parse(str);
        return tmp[0];
    },
    splitSearchWord: function(word){
        return (word || '').toUpperCase().replace(/\s+$/, "").split(/\s+/);
    },
    search: function(word, options) {
        var words = this.splitSearchWord(word);
        if (!options) options = {};
        options = $.extend({
            order: 'date',
            limit: 20,
            offset: 0
        }, options);

        var where = [], bind =  [];
        words.forEach(function(w) {
            where.push('( url LIKE ? OR title LIKE ? OR comment LIKE ? )');
            bind.push('%' + w + '%'); bind.push('%' + w + '%'); bind.push('%' + w + '%');
        });
        var select = Bookmark.select('*', [where.join(' AND '), bind], options);
        /*
        var searches = words.map(function(w) { return {'like': '%' + w + '%'} });
        var select = Bookmark.select('*', {search: searches}, options);
        // XXX
        select[0] = select[0].replace(/ \? OR search/g, ' ? AND search');
        */

        var klass = Bookmark;
        var d = klass.execute(select);
        return d.next(function(res) {
            return klass.resultSet(res, options.resultType);
        });
        return Bookmark.execute(select);
    },
    parse: function(str) {
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
    },
});

$.extendWithAccessorProperties(Bookmark.prototype, {
    updateTags: function() {
        if (this.id) {
            return Tag.destroyByBookmark(this).next(Tag.createByBookmark(this));
        }
    },
    get dateFullYMD() {
        var d = this.date;
        return sprintf('%04d%02d%02d%02d%02d%02d', d.getFullYear(), (d.getMonth()+1), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds());
    },
    get dateYMDHM() {
        var d = this.date;
        return sprintf('%04d/%02d/%02d %02d:%02d', d.getFullYear(), (d.getMonth()+1), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds());
    },
    get dateYMD() {
        var d = this.date;
        return sprintf('%04d/%02d/%02d', d.getFullYear(), (d.getMonth()+1), d.getDate());
    },
    get tags() {
        return Bookmark.parseTags(this.comment);
    },
    get body() {
        var tmp = Bookmark.parse(this.comment);
        return tmp[1];
    },
});

Tag = Model.Tag = Model({
    table: 'tags',
    primaryKeys: ['id'],
    fields: {
        'id'    : 'INTEGER PRIMARY KEY',
        bookmark_id  : 'INTEGER NOT NULL',
        name         : 'TEXT COLLATE NOCASE',
    }
});

Tag.__defineGetter__('database', function() { return Model.getDatabase() });

$.extend(Tag, {
    destroyByBookmark: function(b) {
        if (b && b.id) {
            return Tag.destroy({ bookmark_id: b.id });
        } else {
            throw new Error('bid');
        }
    },
    createByBookmark: function(b) {
        if (b && b.id) {
            var tags = b.tags;
            for (var i = 0;  i < tags.length; i++) {
                var tag = tags[i];
                var t = new Tag({
                    bookmark_id: b.id,
                    name: tag
                });
                t.save().next();
            }
        } else {
            throw new Error('bid');
        }
    },
    getNameCountHash: function() {
        return Tag.find({
            fields: [{'count(name)': 'c'}, 'name'],
            group: 'name',
            resultType: 'RAW'
        }).next(function(res) {
            var tags = {}, rows = res.rows;
            var len = rows.length;
            for (var i = 0;  i < len; i++) {
                tags[rows.item(i).name] = rows.item(i).c;
            }
            return tags;
        });
    }
});

})(Deferred.WebDatabase.Model);

var M = function(name) {
    return Deferred.WebDatabase.Model[name];
}

