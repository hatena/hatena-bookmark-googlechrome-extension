
(function(Model) {
var Bookmark, Tag;

Model.initialize = function() {
     // return parallel([Bookmark.initialize()]).next(Bookmark.destroyAll());
     return Bookmark.initialize();//.next(Bookmark.destroyAll());
}

Bookmark = Model.Bookmark = Model({
    table: 'bookmarks',
    primaryKeys: ['id'],
    fields: {
        'id'    : 'INTEGER PRIMARY KEY',
        url     : 'TEXT UNIQUE NOT NULL',
        title   : 'TEXT',
        comment : 'TEXT',
        search  : 'TEXT',
        date    : 'INTEGER NOT NULL'
    }
});

Model.getDatabase = function() {
    return UserManager.user.database;
}

$.extend(Bookmark, {
    SEP: "\x00",
    beforeSave: function(b) {
        b.search = ("" + b.get('comment') + Bookmark.SEP + b.get('title') + Bookmark.SEP + b.get('url')).toUpperCase();
    },
});

Bookmark.__defineGetter__('database', Model.getDatabase);

})(Model);

var M = function(name) {
    return Model[name];
}

