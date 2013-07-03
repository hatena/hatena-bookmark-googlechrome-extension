
var ExpireCache = function(key, defaultExpire, seriarizer, sweeperDelay) {
    this.key = key || 'default-key';
    this.defaultExpire = defaultExpire || 60 * 30; // 30分
    this.seriarizer = ExpireCache.Seriarizer[seriarizer];
    if (!sweeperDelay)
        sweeperDelay = 60 * 60 * 4; // 四時間
    this.sweeper = Timer.create(1000 * sweeperDelay);
    var self = this;
    this.sweeper.bind('timer', function() {
        self.sweepHandler();
    });
    this.sweeper.start();
}

ExpireCache.__defineGetter__('now', function() { return new Date-0 });

ExpireCache.shared = {};
ExpireCache.clearAllCaches = function() { ExpireCache.shared = {} };
ExpireCache.Seriarizer = {};
ExpireCache.Seriarizer.JSON = {
    seriarize: function(value) { return JSON.stringify(value) },
    deseriarize: function(value) { return JSON.parse(value) },
}

ExpireCache.prototype = {
    sweepHandler: function() {
        for (var key in this.cache) {
            this._update(key);
        }
    },
    get key() { return this._key },
    set key(value) {
        this._key = value || 'global';
        if (!ExpireCache.shared[this.sharedKey])
            ExpireCache.shared[this.sharedKey] = {};
    },
    get sharedKey() { return '_cache_' + this._key },
    get cache() {
        var c = ExpireCache.shared[this.sharedKey];
        if (c) {
            return c;
        } else {
            return (ExpireCache.shared[this.sharedKey] = {});
        }
    },
    deseriarize: function ExpireCache_deseriarize(value) {
        if (!this.seriarizer) return value;

        return this.seriarizer.deseriarize(value);
    },
    seriarize: function ExpireCache_seriarize(value) {
        if (!this.seriarizer) return value;

        return this.seriarizer.seriarize(value);
    },
    get: function ExpireCache_get (key) {
        return this.has(key) ? this.deseriarize(this.cache[key][0]) : null;
    },
    _update: function ExpireCache__update(key) {
        if (!this.cache[key]) return;
        var tmp = this.cache[key];
        if (ExpireCache.now >= tmp[1]) {
            delete this.cache[key]
        }
    },
    has: function ExpireCache_has(key) {
        this._update(key);
        return !!this.cache[key];
    },
    clear: function ExpireCache_clear(key) {
        if (this.cache[key]) {
            delete this.cache[key];
            return true;
        } else {
            return false;
        }
    },
    clearAll: function ExpireCache_clearAll() {
        delete ExpireCache.shared[this.sharedKey];
        ExpireCache.shared[this.sharedKey] = {};
    },
    set: function ExpireCache_set(key, value, expire) {
        if (!expire) expire = this.defaultExpire;
        var e = ExpireCache.now + (expire * 1000);
        this.cache[key] = [this.seriarize(value), e];
    },
}

