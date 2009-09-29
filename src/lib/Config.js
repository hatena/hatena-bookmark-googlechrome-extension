
// XXX: now Mock ...
var Config = {
    _dict: {},
    get: function(key) {
        return Config._dict[key];
    },
    set: function(key, value) {
        Config._dict[key] = value;
    }
};
