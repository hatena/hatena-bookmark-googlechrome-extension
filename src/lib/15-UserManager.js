
var UserManager = $({});
UserManager.MY_NAME_URL = B_HTTP + 'my.name';

$.extend(UserManager, {
    login: function() {
        $.getJSON(UserManager.MY_NAME_URL).next(UserManager.loginHandler).error(UserManager.loginErrorHandler);
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
                current.options.rks = res.rks;
                current.options.plususer = res.plususer;
                current.options.ignores_regex = res.ignores_regex;
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
    this.options = options || {};
};

User.prototype = {
    get name() { return this._name },
    get icon() { return this.getProfileIcon(false) },
    getProfileIcon: function(isLarge) {
        var name = this.name;
        return sprintf('http://www.st-hatena.com/users/%s/%s/profile%s.gif',
                       name.substring(0, 2), name, isLarge ? '' : '_s');
    },
    get plususer() { return this.options.plususer == 1 },
    get rks() { return this.options.rks },
    get private() { return this.options.private == 1 },
    get public() { return !this.private },
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
    hasBookmark: function user_hasBookmark(url) {
        // var res = model('Bookmark').findByUrl(url);
        // return res && res[0] ? true : false;
    },
    getEndPoint: function(name) {
        return B_HTTP + this.name + '/' + name;
    },
    get database() {
        return new Database('hatenabookmark-' + this.name, '1.0', 'hatenabookmark-' + this.name, 1024 * 1024 * 50);
    },
    get dataURL() { return sprintf(B_HTTP + '%s/search.data', this.name) },
    // get dataURL() { return sprintf(B_HTTP + 'secondlife/search.data', this.name) },
    // getProfileIcon: function user_getProfileIcon(isLarge) {
    //     return UserUtils.getProfileIcon(this.name, isLarge);
    // },

    saveBookmark: function(data) {
        // ["comment=%5Bhatena%5Dhatenabookmark&url=http%3A%2F%2Fb.hatena.ne.jp%2F&with_status_op=1&private=1"]
        var data = URI.parseQuery(data);
        data.rks = this.rks;
        var endpoint = this.getEndPoint('add.edit.json');
        Deferred.retry(3, function() {
            return $.ajax({
                url: endpoint,
                type: 'POST',
                data: data,
                timeout: 15000,
            });
        }, {wait: 3}).next(function(res) {
            // XXX データに基づき更新する
            console.log('save success');
            // console.log(res);
            Sync.sync();
        }).error(function(res) {
            console.log('save error');
        });
    },
    clear: function user_clear() {
    }
};


