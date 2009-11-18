
var Sync = $({});
jQuery.extend(Sync, {
    init: function Sync_init() {
        return Sync.sync();
    },
    _syncing: false,
    sync: function Sync_sync() {
        if (Sync._syncing) return;
        Sync._syncing = true;
        var url = URI.parse(Sync.getDataURL());
        url.param({_now: Timer.now});
        return $.get(url.toString()).next(Sync.dataSync).error(Sync.errorback);
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

        var text = res;
        if (!text.length) {
            Sync._complete();
            return;
        }

        try {
            var user = UserManager.user;
            if (user) {
                user.database.addByText(res);
                Sync._complete();
            } else {
                Sync.errorback('User not found');
            }
        } catch(e) {
            Sync.errorback(e);
        }
    },
    _complete: function() {
        Sync._syncing = false;
        Sync.trigger('complete');
    }
});


