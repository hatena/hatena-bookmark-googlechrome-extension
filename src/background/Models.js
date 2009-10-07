
(function(Model) {

Model.initialize = function() {
    p(Bookmark);
    // parallel([
    //     Bookmark.initialize
    // ]);
}

var Bookmark = Model.Bookmark = Model({
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

/*
$.extend({
    SEP: "\x00",
    beforeSave: function(b) {
        b.date = ("" + b.get('comment') + Bookmark.SEP + b.get('title') + Bookmark.SEP + b.get('url')).toUpperCase();
    },
    get database () {
        return Model.getDatabase();
    }
}, Bookmark);
*/


})(Model);


var M = function(name) {
    return Model[name];
}

