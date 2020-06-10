
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
            if (b) {
                url.param({timestamp: b.dateFullYMD});
            }
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
    _parseData: function(text) {
        if (text.length === 0) { return [] }
        const infos     = text.split("\n");
        const bookmarks = infos.splice(0, infos.length * 3/4);
        const result    = [];
        const commentRe = new RegExp('\\s+$','');
        for (let i = 0; i < infos.length; i++) {
            const info = infos[i];
            if (info.length === 0) { break; }
            const [ count, timestamp ] = info.split("\t", 2);
            const title   = bookmarks[i * 3 ];
            const comment = bookmarks[i * 3 + 1].replace(commentRe, '');
            const url     = bookmarks[i * 3 + 2];
            result.push({
                title, comment, url, count,
                date: Utils.strToDate(timestamp) / 1000
            });
        }
        return result;
    },
    dataSync: function(text) {
        p('sync res' + text);
        Sync.trigger('progress', {value: 0});
        var bookmarks = Sync._parseData(text);
        if (bookmarks.length === 0) {
            Sync._complete();
            return;
        }
        Model.Bookmark.putAll(bookmarks).then(
            results => { Sync._complete(); },
            error => { console.log(error); }
        );
    },
    _complete: function() {
        Sync._syncing = false;
        Sync.trigger('complete');
    },
});

