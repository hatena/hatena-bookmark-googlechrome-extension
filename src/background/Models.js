
(function(Model) {
var Bookmark, Tag;

Model.initialize = function() {
     // return parallel([Bookmark.initialize()]).next(Bookmark.destroyAll());
     // return Bookmark.initialize();//.next(Bookmark.destroyAll());
     return parallel([
         Bookmark.dropTable().next(Bookmark.initialize),
         Tag.dropTable().next(Tag.initialize)
     ]);//.next(Bookmark.destroyAll());
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

Bookmark.__defineGetter__('database', Model.getDatabase);

Bookmark.afterTrigger('createTable', function() {
    return Model.getDatabase().execute([
        'CREATE INDEX "bookmarks_date" ON "bookmarks" ("date" DESC)',
        'CREATE INDEX "bookmarks_date" ON "bookmarks" ("date" ASC)'
    ]).error(function() { return true });
});

$.extend(Bookmark, {
    SEP: "\x00",
    beforeSave: function(b) {
        b.search = ("" + b.get('comment') + Bookmark.SEP + b.get('title') + Bookmark.SEP + b.get('url')).toUpperCase();
    },
    afterSave: function(b) {
        b.updateTags();
    },
    parseTags: function(str) {
        var tmp = Bookmark.parse(str);
        return tmp[0];
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

$.extend(Bookmark.prototype, {
    updateTags: function() {
        if (this.id) {
            return Tag.destroyByBookmark(this).next(Tag.createByBookmark(this));
        }
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

Tag.__defineGetter__('database', Model.getDatabase);

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
                return t.save().next(function() {
                });
            }
        } else {
            throw new Error('bid');
        }
    },
});

})(Model);

var M = function(name) {
    return Model[name];
}

