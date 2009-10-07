

var MY_NAME_URL = B_HTTP + 'my.name';
var Database = Deferred.WebDatabase;
var Model = Database.Model, SQL = Database.SQL;
var UserManager = $({});

$.extend(UserManager, {
    login: function() {
        $.getJSON(MY_NAME_URL).next(UserManager.loginHandler); // .error(this.loginErrorHandler);
    },
    loginHandler: function(res) {
        p('loginHandler');
        UserManager.setUser(res);
    },
    loginErrorHandler: function UserManager_loginErrorHandler(res) {
        p('login error...');
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
        p(user.name);
        UserManager.trigger('UserChange', [user]);
    }
});

var User = function(name, options) {
    this._name = name;
    this.options = options || {};
};

User.prototype = {
    get name() { return this._name },
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
    get database() {
        return new Database('hatenabookmark-' + this.name);
    },
    get dataURL() { return sprintf(B_HTTP + '%s/search.data', this.name) },
    // get bookmarkHomepage() UserUtils.getHomepage(this.name, 'b'),
    // getProfileIcon: function user_getProfileIcon(isLarge) {
    //     return UserUtils.getProfileIcon(this.name, isLarge);
    // },

    clear: function user_clear() {
    }
};

$(document).ready(function() {
    UserManager.login();
});


