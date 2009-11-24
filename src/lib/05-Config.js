
var Config = {
    PREFIX: 'Config-',
    configs: {},
    listeners: {},
    localStorage: localStorage,
    typeConversions: {
        boolean: function(value) {
            if (isFinite(value)) {
                return !!parseInt(value);
            } else {
                return !!value;
            }
        },
        int: function(value) {
            return parseInt(value);
        },
        unsignedInt: function(value) {
            value = parseInt(value)
            return (value < 0) ? 0 : value;
        },
        number: function(value) {
            return Number(value);
        },
    },
    normalizers: {
        between: function(value, options) {
            var min = Math.min.apply(Math, options);
            var max = Math.max.apply(Math, options);
            return Math.max(min, Math.min(value, max));
        }
    },
    get: function(oKey) {
        this.keyCheck(oKey);

        var key = this.PREFIX + oKey;
        if (typeof this.localStorage[key] == 'undefined') {
            return this.getDefault(oKey);
        } else {
            return JSON.parse(this.localStorage[key]);
        }
    },
    getDefault: function(key) {
        if (typeof this.configs[key] == 'undefined') {
            return;
        } else {
            return this.configs[key]['default'];
        }
    },
    set: function(oKey, value) {
        this.keyCheck(oKey);
        var key = this.PREFIX + oKey;

        value = this.typeConversion(oKey, value);
        value = this.normalize(oKey, value);
        if (this.validation(oKey, value)) {
            this.localStorage[key] = JSON.stringify(value);
        } else {
            // ToDo
        }
    },
    keyCheck: function(key) {
        if (!this.configs[key]) throw 'key undefined!: ' + key;
    },
    typeConversion: function(key, value) {
        var config = this.configs[key];
        var type = config.type;
        if (typeof type == 'function') {
            //
        } else if (type && this.typeConversions[type]) {
            type = this.typeConversions[type];
        }
        if (type) {
            return type(value);
        } else {
            return value;
        }
    },
    normalize: function(key, value) {
        var config = this.configs[key];
        var normalizer = config.normalizer;
        if (typeof normalizer == 'function') {
            return normalizer(value);
        } else if (normalizer && this.normalizers[normalizer.name]) {
            return this.normalizers[normalizer.name](value, normalizer.options);
        } else {
            return value;
        }
    },
    validation: function(key, value) {
        // ToDo
        return true;
    },
    append: function(key, options) {
        this.configs[key] = options;
    },
    clear: function(key) {
        this.keyCheck(key);
        key = this.PREFIX + key;
        this.localStorage.removeItem(key);
    },
    clearALL: function() {
        var self = this;
        Object.keys(this.configs).forEach(function(key) {
            self.clear(key);
        });
    },
    addListener: function(key, func) {
    },
    removeListener: function(key) {
    },
    bind: function(key) {
        var self = this;
        return {
            get: function() {
                return self.get(key);
            },
            set: function(val) {
                return self.set(key, val);
            },
            clear: function() {
                return self.clear(key);
            }
        }
    }
};

/*
Config.configs = {
    'main.size.auto': {
        default: true,
    },
    'main.size.height': 500,
    'commentviewer.autoHideComment': true,
    'commentviewer.autoHideThreshold': 15,
    'input.confirmBookmark': false,
    'tags.recommendTags.enabled': true,
    'tags.allTags.enabled': true,
    'tags.showAllTags': false,
    'tags.complete.enabled': true,
    'tags.tagMaxResult': 10,
}
*/


