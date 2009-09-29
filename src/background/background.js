
var MY_NAME_URL = B_HTTP + 'my.name';

var User = function(name, options) {
    this._name = name;
    this.options = options || {};
};

$.extend(User, {
    login: function() {
        $.getJSON(MY_NAME_URL).next(this.loginHandler); // .error(this.loginErrorHandler);
    },
    loginHandler: function(res) {
        p('loginHandler' , res);
        User.setUser(res);
    },
    loginErrorHandler: function User_loginErrorHandler(res) {
        p('login error...');
    },
    logout: function User_clearUser () {
        User.clearUser();
    },
    clearUser: function() {
        if (this.user) {
            this.user.clear();
            delete this.user;
        }
    },
    setUser: function User_setCurrentUser (res) {
        var current = User.user;
        if (current) {
            if (current.name == res.name) {
                current.options.rks = res.rks;
                current.options.plususer = res.plususer;
                current.options.ignores_regex = res.ignores_regex;
                delete current._ignores;
                return current;
            }
            User.clearUser();
        }
        var user = new User(res.name, res);
        User.user = user;
        $(document).trigger('UserChange', [user]);
    }
});

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
        // if (!this._db) {
        //     var dir = this.configDir;
        //     dir.append('bookmark.sqlite');
        //     this._db = new Database(dir);
        //     this._db.connection.executeSimpleSQL('PRAGMA case_sensitive_like = 1');
        // }
        // return this._db;
    },
    get dataURL() { return sprintf(B_HTTP + '%s/search.data', this.name) },
    // get bookmarkHomepage() UserUtils.getHomepage(this.name, 'b'),
    // getProfileIcon: function user_getProfileIcon(isLarge) {
    //     return UserUtils.getProfileIcon(this.name, isLarge);
    // },

    clear: function user_clear() {
        if (this._db) {
            this._db.connection.close();
            p(this._name + "'s database is closed");
        }
    }
}

$(document).ready(function() {
    User.login();
});
