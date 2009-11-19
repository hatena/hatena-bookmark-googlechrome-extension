
var Config = {
    _dict: {},
    get: function(oKey) {
        var key = 'Config-' + oKey;
        if (typeof localStorage[key] == 'undefined') {
            return Config.getDefault(oKey);
        } else {
            return JSON.parse(localStorage[key]);
        }
    },
    getDefault: function(key) {
        if (typeof Config.DEFAULT[key] == 'undefined') {
            return;
        } else {
            return Config.DEFAULT[key];
        }
    },
    set: function(key, value) {
        key = 'Config-' + key;
        if (value == null || typeof value == 'undefined') {
            delete localStorage[key];
        } else {
            localStorage[key] = JSON.stringify(value);
        }
    },
    clear: function(key) {
        Config.set(key);
    },
    bind: function(key) {
        return {
            get: function() {
                return Config.get(key);
            },
            set: function(val) {
                return Config.set(key, val);
            },
            clear: function() {
                return Config.clear(key);
            }
        }
    }
};

Config.DEFAULT = {
    'commentviewer.autoSize': true,
    'commentviewer.autoHideComment': true,
    'commentviewer.autoHideThreshold': 15,
    'tags.recommendTags.enabled': true,
    'tags.allTags.enabled': true,
    'tags.showAllTags': false,
    'tags.complete.enabled': true,
    'tags.tagMaxResult': 10,
}


