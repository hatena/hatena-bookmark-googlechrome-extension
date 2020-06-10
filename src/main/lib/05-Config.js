
var Config = {
    PREFIX: 'Config-',
    configs: {},
    listeners: {},
    localStorage: localStorage,
    typeConversions: {
        boolean: function(value) {
            if (typeof value == 'boolean') return value;

            if (isFinite(value)) {
                return !!parseInt(value, 10);
            } else {
                return !!value;
            }
        },
        int: function(value) {
            return parseInt(value, 10);
        },
        unsignedInt: function(value) {
            value = parseInt(value, 10)
            return (value < 0) ? 0 : value;
        },
        number: function(value) {
            return Number(value);
        },
        string: function(value) {
            return value.toString();
        }
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
        if (type && typeof type == 'function') {
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
        if (typeof options != 'object')
            options = this.typeDetect(options);
        this.configs[key] = options;
    },
    typeDetect: function(value) {
        var type;
        switch(typeof value) {
            case 'number':
                if (value.toString().indexOf('.') == -1) {
                    type = 'int';
                } else {
                    type = 'number';
                }
                break;
            case 'boolean':
                type = 'boolean';
                break;
            case 'string':
                type = 'string';
                break;
            default:
                type = 'object';
                break;
        }
        return {
            'default': value,
            type: type,
        }
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


