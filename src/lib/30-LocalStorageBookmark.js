
/*
 * WebDatabase が使えなくなったので、
 * LocalStorage で Bookmark の取得や検索を代用する
 */

LocalStorageBookmark = function(username, storage) {
    this.username = username;
    this.storage = storage;
}

LocalStorageBookmark.SEP = "\u0002";

LocalStorageBookmark.prototype = {
    get bookmarkKey() {
        return 'bookmark-data-' + this.username;
    },
    get infoKey() {
        return 'bookmark-info-' + this.username;
    },
    get bookmarksRaw() {
        return this.storage[this.bookmarkKey];
    },
    get bookmarks() {
        return this.bookmarksRaw.split(LocalStorage.SEP);
    },
    get infosRaw() {
        return this.storage[this.infoKey];
    },
    get infos() {
        return this.infoRaw.split(LocalStorage.SEP);
    },
    get totalCount() {
        return this.bookmarks.length;
    },
    clear: function() {
        delete this.storage[this.bookmarkKey];
        delete this.storage[this.infoKey];
    },
    data: function() {
        return this.storage[this.key];
    },
    addByText: function(text) {
        var bookmarks = this.bookmarks;
        if (bookmarks &&  > 2) {
            //
        } else {
            var tmp = this.parse(text);
            this.storage[this.bookmarkKey] = text[0].join(LocalStorage.SEP);
            this.storage[this.infoKey] = text[1].join(LocalStorage.SEP);
        }
    },
    parse: function Sync_createDataStructure (text) {
        var infos = text.split("\n");
        var bookmarks = infos.splice(0, infos.length * 3/4);
        return [bookmarks, infos];
    },
    createSearcher: function() {
    },
}




