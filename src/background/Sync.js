
var Sync = $({});
jQuery.extend(Sync, {
    init: function Sync_init() {
        Model.initialize().next(Sync.sync);
    },
    _syncing: false,
    sync: function Sync_sync() {
        if (Sync._syncing) return;
        Sync._syncing = true;
        var url = UserManager.user.dataURL + '?_now=' + (new Date).getTime();
        var timestamp;
        console.log(222);
        M('Bookmark').findFirst({order: 'date desc'}).next(function(b) {
            if (b) url += '&' + b.get('date');
        }).next($K($.get(url))).next(Sync.dataSync).error(Sync.errorback);
    },
    errorback: function(e) {
        p('Sync Error: ', e);
        Sync._syncing = false;
        Sync.trigger('fail');
    },
    dataSync: function Sync_dataSync(res) {
        Sync.trigger('progress', {value: 0});
        var Bookmark = M('Bookmark');

        var text = res;
        if (!text.length) {
            Sync.trigger('complete');
            return;
        }

        var items = Config.get("sync.oneTimeItmes") || 200;
        var waitTime = Config.get("sync.syncWait") || 1000;

        var commentRe = new RegExp('\\s+$','');
        var tmp = Sync.createDataStructure(text);
        var bookmarks = tmp[0];
        var infos = tmp[1];
        delete tmp;
        p(sprintf('start: %d data', infos.length));
        var now = Date.now();
        p('start');
        var len = infos.length;
        for (var i = len - 1;  i >= 0; i--) {
            /*
            var bi = i * 3;
            var timestamp = infos[i].split("\t", 2)[1];
            var title = bookmarks[bi];
            var comment = bookmarks[bi+1];
            var url = bookmarks[bi+2];
            var b = new Bookmark;
            b.title = title;
            b.comment = comment.replace(commentRe, '');
            b.url = url;
            b.date = parseInt(timestamp);
            if (url) {
                try {
                    b.save();
                } catch(e) {
                    p('error: ' + [url, title, comment, timestamp].toString());
                }
            } else {
            }
            if (i && (i % items == 0)) {
                Sync.dispatch('progress', { value: (len-i)/len*100|0 });
                Sync.db.commitTransaction();
                if (i % (items * 10) == 0) {
                    // 大量に件数があるときに、しょっちゅう BookmarksUpdated を発行すると重くなるため
                    $(document).trigger("BookmarksUpdated");
                }
                // async.wait(waitTime);
                Sync.db.beginTransaction();
                p('wait: ' + (Date.now() - now));
            }
            */
        }
        Sync.trigger('complete');
        $(document).trigger('BookmarksUpdated');

        p(infos.length);
        p('time: ' + (Date.now() - now));
    },
    createDataStructure: function Sync_createDataStructure (text) {
        var infos = text.split("\n");
        var bookmarks = infos.splice(0, infos.length * 3/4);
        return [bookmarks, infos];
    },
/*
    init: function Sync_init () {
        var b = model('Bookmark');
        var db = b.db;
        if (!db.tableExists('bookmarks')) {
            hBookmark.Model.resetAll();
        } else {
            hBookmark.Model.migrate();
        }
        Sync.sync();
    },
    createDataStructure: function Sync_createDataStructure (text) {
        var infos = text.split("\n");
        var bookmarks = infos.splice(0, infos.length * 3/4);
        return [bookmarks, infos];
    },
    _syncing: false,
    sync: function Sync_sync () {
        if (Sync._syncing) return;
        Sync._syncing = true;

        try {
             var url = UserManager.user.dataURL;
             var b = model('Bookmark').findFirst({order: 'date desc'});

             Sync.dispatch('start');
             if (b && b.date) {
                 net.get(url, method(this, 'fetchCallback'), method(this, 'errorback'), true, {
                     timestamp: b.date,
                     _now: ((new Date())*1), // cache のため
                 });
             } else {
                 net.get(url, method(this, 'fetchCallback'), method(this, 'errorback'), true);
             }
        } catch(er) {
            p('sync error:' + er.toString());
            Sync.errorback();
        }
    },
    get nowSyncing() { Sync._syncing },
    errorback: function Sync_errorAll () {
        Sync._syncing = false;
        Sync.dispatch('fail');
    },
    get db() {
        return UserManager.user.database;
    },
    fetchCallback: function Sync_allCallback (req)  {
    try {
        Sync.dispatch('progress', {value: 0});
        if (!UserManager.user) {
            // XXX: データロード後にユーザが無い
            Sync.errorback();
            return;
        }

        var BOOKMARK = model('Bookmark');

        var text = req.responseText;
        if (!text.length) {
            Sync.dispatch('complete');
            return;
        }

        var items = Config.get("sync.oneTimeItmes") || 200;
        var waitTime = Config.get("sync.syncWait") || 1000;

        var commentRe = new RegExp('\\s+$','');
        var tmp = Sync.createDataStructure(text);
        var bookmarks = tmp[0];
        var infos = tmp[1];
        delete tmp;
        p(sprintf('start: %d data', infos.length));
        var now = Date.now();
        p('start');
        Sync.db.beginTransaction();
        var len = infos.length;
        for (var i = len - 1;  i >= 0; i--) {
            var bi = i * 3;
            var timestamp = infos[i].split("\t", 2)[1];
            var title = bookmarks[bi];
            var comment = bookmarks[bi+1];
            var url = bookmarks[bi+2];
            var b = new BOOKMARK;
            b.title = title;
            b.comment = comment.replace(commentRe, '');
            b.url = url;
            b.date = parseInt(timestamp);
            if (url) {
                try {
                    b.save();
                } catch(e) {
                    p('error: ' + [url, title, comment, timestamp].toString());
                }
            } else {
            }
            if (i && (i % items == 0)) {
                Sync.dispatch('progress', { value: (len-i)/len*100|0 });
                Sync.db.commitTransaction();
                if (i % (items * 10) == 0) {
                    // 大量に件数があるときに、しょっちゅう BookmarksUpdated を発行すると重くなるため
                    $(document).trigger("BookmarksUpdated");
                }
                // async.wait(waitTime);
                Sync.db.beginTransaction();
                p('wait: ' + (Date.now() - now));
            }
        }
        BOOKMARK.db.commitTransaction();
        Sync.dispatch('complete');
        $(document).dispatch("BookmarksUpdated");

        p(infos.length);
        p('time: ' + (Date.now() - now));
    } catch(er) {
        Sync.errorback();
    }
    }
    */
});

Sync.bind('complete', function() {
    Sync._syncing = false;
});

UserManager.bind('UserChange', function() {
    p('get change');
    if (UserManager.user) Sync.init();
});

