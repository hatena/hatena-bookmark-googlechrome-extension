/// reference: "../config.js"

var UserManager = $({});
UserManager.MY_NAME_URL = B_HTTP + 'my.name';

$.extend(UserManager, {
    loginWithRetry: function(wait) {
        UserManager.login();
        var current = UserManager.user;
        setTimeout(function() {
            // retry;
            if (!UserManager.user) UserManager.login();
        }, wait || 15 * 1000);
    },
    login: function() {
        $.ajax({ url: UserManager.MY_NAME_URL, dataType: "text", cache: false }).next(function(data) {
            UserManager.loginHandler(JSON.parse(data));
        }).error(UserManager.loginErrorHandler);
    },
    loginHandler: function(res) {
        p('loginHandler');
        UserManager.setUser(res);
    },
    loginErrorHandler: function UserManager_loginErrorHandler(res) {
        p('login error...', res);
        var j = JSON.parse(res.responseText);
        UserManager.setUser(j);
    },
    logout: function UserManager_clearUser () {
        UserManager.clearUser();
    },
    clearUser: function() {
        if (UserManager.user) {
            UserManager.user.clear();
            delete UserManager.user;
        }
    },
    setUser: function UserManager_setCurrentUser (res) {
        if (!res.login) return;
        var current = UserManager.user;
        if (current) {
            if (current.name == res.name) {
                $.extend(current.options, res);
                delete current._ignores;
                return current;
            }
            UserManager.clearUser();
        }
        var user = new User(res.name, res);
        UserManager.user = user;
        p('UserChange: ', user.name);
        UserManager.trigger('UserChange', [user]);
    }
});

var User = function(name, options) {
    this._name = name;
    this.view = new User.View(name);
    this.options = options || {};
};

User.View = function(name) {
    this.name = name;
}

User.View.prototype = {
    getProfileIcon: function(name, isLarge) {
        return sprintf('http://cdn1.www.st-hatena.com/users/%s/%s/profile%s.gif',
                       name.substring(0, 2), name, isLarge ? '' : '_s');
    },
    get icon() {
        return this.getProfileIcon(this.name);
    },
    get largeIcon() {
        return this.getProfileIcon(this.name, true);
    },
};

User.prototype = {
    get name() { return this._name },
    get plususer() { return this.options.plususer == 1 },
    get rks() { return this.options.rks },
    get private() { return this.options.private == 1 },
    get public() { return !this.private },
    get canUseTwitter() { return this.options.is_oauth_twitter == 1 },
    get postTwitterChecked() { return this.options.twitter_checked || 'inherit' },
    get canUseFacebook() { return this.options.is_oauth_facebook == 1 },
    get postFacebookChecked() { return this.options.facebook_checked || 'inherit' },
    get canUseEvernote() { return this.options.is_oauth_evernote == 1 },
    get postEvernoteChecked() { return this.options.evernote_checked || 'inherit' },
    get canUseMixiCheck() { return this.options.is_oauth_mixi_check == 1 },
    get postMixiCheckChecked() { return this.options.mixi_check_checked || 'inherit' },
    get maxCommentLength() { return this.options.max_comment_length || 100 },
    get ignores() {
        if (this.options.ignores_regex) {
            if (typeof this._ignores == 'undefined') {
                try {
                    this._ignores = new RegExp(this.options.ignores_regex);
                } catch(e) {
                    this._ignores = null;
                }
            }
            return this._ignores;
        }
        return null;
    },
    resetDatabase: function() {
        Model.initialize(true).next(function() {
            Sync.sync();
        });
    },
    hasBookmark: function user_hasBookmark(url) {
        return Model.Bookmark.findByUrl(url).next(function(res) {
            return (res ? true : false);
        });
    },
    link: function(path) {
        return B_HTTP + this.name + "/" + (path ? path + "?editer=" + BOOKMARK_EXT_CONFIG["editor_name"] : "");
    },
    get database() {
        return new Database('hatenabookmark-' + this.name, {
            estimatedSize: 50 * 1024 * 1024
        });
        /*
        return new Database('hatenabookmark2-' + this.name, '1.0', 'hatenabookmark-' + this.name, 1024 * 1024 * 50);
        */
    },
    get dataURL() { return sprintf(B_HTTP + '%s/search.data', this.name) },
    // get dataURL() { return sprintf(B_HTTP + 'secondlife/search.data', this.name) },
    // getProfileIcon: function user_getProfileIcon(isLarge) {
    //     return UserUtils.getProfileIcon(this.name, isLarge);
    // },

    deleteBookmark: function(url) {
        var data = {
            url: url,
            rks: this.rks,
        };
        var endpoint = this.link('api.delete_bookmark.json');
        var self = this;

        Deferred.retry(3, function() {
            return $.ajax({
                url: endpoint,
                type: 'POST',
                data: data,
                timeout: 15000,
            });
        }, {wait: 3}).next(function(res) {
            p('remote delete success - ' + url);
            Model.Bookmark.findByUrl(url).next(function(b) {
                if (b) {
                    // XXX: remove tag
                    p('delete bookmarked - ' + url);
                    HTTPCache.clearCached(url);
                    b.destroy().next(function() {
                         $(document).trigger('BookmarksUpdated');
                    });
                }
            });
        }).error(function(res) {
            Manager.deleteBookmarkError(data);
        });
    },

    saveBookmark: function(data) {
        // ["comment=%5Bhatena%5Dhatenabookmark&url=http%3A%2F%2Fb.hatena.ne.jp%2F&with_status_op=1&private=1"]
        var data = URI.parseQuery(data);
        data.rks = this.rks;
        var endpoint = this.link('add.edit.json');
        var self = this;

        p(data);
        Deferred.retry(3, function(i) {
            p('save ajax start:' + data.url + ' : ' + i);
            return $.ajax({
                url: endpoint,
                type: 'POST',
                data: data,
                dataType: "text",
                timeout: 15000,
            });
        }, {wait: 3}).next(function(res) {
            p('remote save success - ' + data.url);
            if (data.confirm_bookmark) {
                setTimeout(function() {
                    Manager.confirmBookmark(URI.parse(data.url).entryURL);
                }, 10);
            }
            self.updateBookmark(data.url, res);
        }).error(function(res) {
            Manager.saveBookmarkError(data);
        });
    },
    updateBookmark: function(url, data) {
         // XXX
         try {
             data = JSON.parse(data);
         } catch(e) {
         }
         var self = this;
         Model.Bookmark.findByUrl(url).next(function(b) {
             HTTPCache.clearCached(url);
             if (b) {
                 b.set('comment', data.comment_raw || '');
                 Model.getDatabase().transaction(function() {
                     b.save().next(function() {
                         $(document).trigger('BookmarksUpdated');
                     });
                 });
             } else {
                 p('update bookmark - save sync' + Sync._syncing);
                 setTimeout(function() {
                     Sync.sync();
                     setTimeout(function() {
                         p('update bookmark - save sync retry');
                         self.hasBookmark(url).next(function(has) {
                             p('update bookmark - save sync retry if false -> ' + !!has);
                             if (!has) Sync.sync();
                         });
                     }, 10000);
                 }, 500);
             }
         });
    },
    clear: function user_clear() {
    }
};


