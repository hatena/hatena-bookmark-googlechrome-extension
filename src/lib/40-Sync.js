
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
        // M('Bookmark').findFirst({order: 'date desc'}).next(function(b) {
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
        p('sync res' + res);
        Sync.trigger('progress', {value: 0});
        var Bookmark = M('Bookmark');

        var text = res;
        if (!text.length) {
            Sync._complete();
            return;
        }

        var step = 500;
        var waitTime = 1000;

        var commentRe = new RegExp('\\s+$','');
        var tmp = Sync.createDataStructure(text);
        var bookmarks = tmp[0];
        var infos = tmp[1];
        delete tmp;
        p(sprintf('start: %d data', infos.length));

        if (infos.length <= 0) {
            Sync._complete();
            return;
        }

        var i = infos.length;

        i = Math.min(i, 100000); // WebDatabase の 50M 制約のため暫定

        var executer = function() {
            Bookmark.database.transaction(function() {
                for (var j = 0;  j < step; j++) {
                    if (i <= 0) break;
                    i--;
                    var bi = i * 3;
                    var timestamp = infos[i].split("\t", 2)[1];
                    var title = bookmarks[bi];
                    var comment = bookmarks[bi+1];
                    var url = bookmarks[bi+2];
                    if (timestamp) {
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
                    };
                }
                console.log('sync execute: index:' + i + ' ' + title);
            }).next(function() {
                if (i > 0) {
                    executer();
                } else {
                    Sync._complete();
                }
            }).error(Sync.errorback);
        }
        executer();
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

