
var Sync = $({});
jQuery.extend(Sync, {
    init: function Sync_init() {
        Model.initialize(false).next(Sync.sync);
    },
    _syncing: false,
    sync: function Sync_sync() {
        if (Sync._syncing) return;
        Sync._syncing = true;
        var url = URI.parse(Sync.getDataURL());
        url.param({_now: Timer.now});
        M('Bookmark').findFirst({order: 'date desc'}).next(function(b) {
            if (b)
                url.param({timestamp: b.dateFullYMD});
        }).next(function() {
            $.get(url.toString()).next(Sync.dataSync).error(Sync.errorback);
        }).error(Sync.errorback);
    },
    getDataURL: function() {
        return UserManager.user.dataURL;
    },
    errorback: function(e) {
        p('Sync Error: ', e);
        Sync._syncing = false;
        Sync.trigger('fail', [e]);
    },
    dataSync: function Sync_dataSync(res) {
        Sync.trigger('progress', {value: 0});
        var Bookmark = M('Bookmark');

        var text = res;
        if (!text.length) {
            Sync._complete();
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
        var now = Timer.now;
        p('start');
        var len = infos.length;
        Bookmark.database.transaction(function() {
            for (var i = len - 1;  i >= 0; i--) {
                var bi = i * 3;
                var timestamp = infos[i].split("\t", 2)[1];
                var title = bookmarks[bi];
                var comment = bookmarks[bi+1];
                var url = bookmarks[bi+2];
                if (!timestamp) { continue; };
                var b = new Bookmark;
                b.title = title;
                b.comment = (comment || '').replace(commentRe, '');
                b.url = url;
                b.set('date', Utils.strToDate(timestamp) / 1000);
                if (url) {
                    try {
                        b.save().error(function(e) {
                            console.error('error: ' + [e.toString(), url, title, comment, timestamp].toString());
                        });
                    } catch(e) {
                    }
                } else {
                }
                if (i && (i % items == 0)) {
                    console.log('' + i + title);
                }
                /*
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
        }).next(function () {
            Sync._complete();
            p('complete:', infos.length);
            p('time: ' + (Timer.now - now));
        }).error(Sync.errorback);
    },
    _complete: function() {
        Sync._syncing = false;
        Sync.trigger('complete');
    },
    createDataStructure: function Sync_createDataStructure (text) {
        var infos = text.split("\n");
        var bookmarks = infos.splice(0, infos.length * 3/4);
        return [bookmarks, infos];
    },
});

