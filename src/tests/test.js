
Deferred.define();
Deferred.prototype._fire = function (okng, value) {
    var next = "ok";
    try {
        value = this.callback[okng].call(this, value);
    } catch (e) {
        next  = "ng";
        if (Deferred.debug) console.error(e);
        value = e;
    }
    if (value instanceof Deferred) {
        value._next = this._next;
    } else {
        if (this._next) this._next._fire(next, value);
    }
    return this;
}

var p = function() {
    console.log(Array.prototype.slice.call(arguments, 0));
}

var is = function(a, b, mes) {
    equals(a.toString(), b.toString(), mes);
}

Deferred.test = function(name, t, count, wait) {
    var d = new Deferred();
    var search = location.search;
    var func = function() {
        setTimeout(function() {
            var setupDeferred = new Deferred(), teardownDeferred = new Deferred();
            var setup = Deferred.test.setup, teardown = Deferred.test.teardown;
            setupDeferred.next(function() {
                next(function() {
                    var args = [name, function() {
                        stop(wait || 3000);
                        try {
                            t(teardownDeferred);
                        } catch(e) {
                            ok(false, 'test error: ' + e.toString());
                            teardownDeferred.call();
                        }
                    }];
                    if (count) args.push(count)
                    test.apply(test, args);
                });//, 0);
                return teardownDeferred;
            }).next(function() {
                teardown(d);
            });
            setup(setupDeferred);
        }, 0);
    }
    if (search.indexOf('?') == 0) {
        if (decodeURIComponent(search.substring(1)) != name) {
            setTimeout(function() {
                d.call();
            }, 0);
        } else {
            func();
        }
    } else {
        func();
    }
    return d;
};

// var i = 0;
Deferred.test.setup = function(d) {
//    console.log('setup' + (++i));
    d.call();
};

Deferred.test.teardown = function(d) {
    start(); // XXX
//    console.log('teardown' + i);
    d.call();
};

Deferred.prototype.method = function(name) {
    return d[name]();
};

Deferred.register('test', Deferred.test);

var Database = Deferred.WebDatabase;
var Model = Database.Model, SQL = Database.SQL;

Deferred.
test("uri", function(d) {
    var hatena = 'http://www.hatena.ne.jp/foobar?query=foo#hash=bar';
    var u = URI.parse(hatena);
    equals(u.search, '?query=foo');
    equals(u.hash, '#hash=bar');
    equals(u.schema, 'http');
    ok(!u.isHTTPS, 'is not HTTPS');
    equals(u.port, '');
    equals(u.host, 'www.hatena.ne.jp');
    equals(u.path, '/foobar');
    equals(u.href, hatena);
    equals(u.path_query, '/foobar?query=foo');
    equals(u.encodeURI, encodeURIComponent(hatena));
    equals(u.entryURL, B_HTTP + 'entry/www.hatena.ne.jp/foobar?query=foo%23hash=bar');

    hatena = 'https://www.hatena.ne.jp/';
    u = URI.parse(hatena);
    equals(u.search, '');
    equals(u.hash, '');
    equals(u.schema, 'https');
    ok(u.isHTTPS, 'isHTTPS');
    equals(u.port, '');
    equals(u.host, 'www.hatena.ne.jp');
    equals(u.path, '/');
    equals(u.href, hatena);
    equals(u.path_query, '/');
    equals(u.encodeURI, encodeURIComponent(hatena));
    equals(u.entryURL, B_HTTP + 'entry/s/www.hatena.ne.jp/');

    d.call();
}, 22, 1000).

test("timer", function(d){
    var t = Timer.create(10, 5); // 10ms, 5times
    var i = 0;
    t.bind('timer', function(ev, c) {
        equals(c, ++i);
    });
    t.bind('timerComplete', function(ev, c) {
        equals(c, 5);
        d.call();
    });
    t.start();
}, 6, 1000).

test("timer stop", function(d){
    var t = Timer.create(10, 5); // 10ms, 5times
    var i = 0;
    t.bind('timer', function(ev, c) {
        equals(c, ++i);
        if (c == 3) t.stop();
    });
    t.bind('timerComplete', function(ev, c) {
        ok(false, 'not call this');
    });
    setTimeout(function() { d.call() }, 500);
    t.start();
}, 3, 1000).

test('ExpireCache', function(d) {
    var cache = new ExpireCache('testcache' + (new Date-0));
    ok(cache.get('foo') == null );
    cache.set('foo', 'bar');
    equals(cache.get('foo'), 'bar');
    cache.set('foo1', 'baz1');
    equals(cache.get('foo1'), 'baz1');
    cache.clear('foo1');
    ok(cache.get('foo1') == null, 'cache clear');
    cache.clearAll();
    ok(cache.get('foo') == null, 'cache clear all');

    var cache2 = new ExpireCache('testcache1' + (new Date-0), 60, 'JSON');
    var data = {foo: 'bar'};
    cache2.set('data', data);
    equals(cache2.get('data').foo, 'bar', 'serialize json');

    cache = new ExpireCache('testcache2' + (new Date-0), 0.01); // 10ms cache
    cache.set('foo1', 'bar');
    equals(cache.get('foo1'), 'bar');
    wait(0.2).next(function() {
        ok(cache.get('foo1') == null, 'cache expired');
        d.call();
    });
}, 8, 3000).

test('HTTPCache', function(d) {
    var cache = new HTTPCache('test');
    var url = 'http://www.google.com/';
    cache.get(url).next(function(res) {
        ok(res, 'get cache1');
    }).next(function() {
        ok(cache.has(url), 'has cache');
        cache.get(url).next(function(res) {
            ok(res, 'get cache2');
            cache.clearAll();
            ok(!cache.has(url), 'cache clear all');
        });
    }).next(function() {
        d.call();
    });
}, 4, 3000).

test('finished', function(d) {
    ok(true, 'finished!!!');
    d.call();
}).

error(function(e) {
    console.log('error' + e.toString());
    throw(e);
});


