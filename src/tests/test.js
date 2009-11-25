
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
    equals(JSON.stringify(a), JSON.stringify(b), mes);
    // equals(a.toString(), b.toString(), mes);
}

function mockAjax(opts) {
    if (opts.url.indexOf('http') == 0) {
        var orig_url = opts.url;
        var url = URI.parse(opts.url);
        opts.url = '/tests/data/' + url.schema + '/' + url.host + url.path + escape(url.search).replace(/%/g, '_');
        // console.log([opts.url, '<-', orig_url].join(' '));
    }
    return opts;
}

var orig_ajax = $.ajax; $.ajax = function (opts) {
    opts = mockAjax(opts);
    return orig_ajax(opts);
}

var Bookmark = Model.Bookmark, Tag = Model.Tag;

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
    Timer.__defineGetter__('now', function() { return (new Date).getTime() });
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
test("utils", function(d) {
    equals(sprintf('foo%sbar%sbaz', '-', '-'), 'foo-bar-baz');
    equals(sprintf('foo%dbar%dbaz', '30hogehoge', 22), 'foo30bar22baz');
    equals(sprintf('%05d-%04d-%03d', 10, 10, 10), '00010-0010-010');
    ok(Utils.isString('foo'), 'isString');
    ok(Utils.isString(new String('foo')), 'isString');
    ok(!Utils.isString(null), 'isString null');
    ok(!Utils.isString(undefined), 'isString undef');

    equals(Utils.strToDate('20091019175513').getTime(), 1255942513*1000);
    ok(Utils.strToDate('20091019175513') instanceof Date, 'date');
    d.call();
}).

test("jQuery classlike", function(d) {
    var Klass = $({});
    $.extend(Klass, {
        _id: 0,
        getID: function() { return ++this._id },
        init: function(val) {
            this.id = Klass.getID();
            this.val = val;
        },
    });

    Klass.prototype = {
        dispatchTrigger: function() {
            Klass.trigger('dispatch', this);
        }
    }
    Klass.init.prototype = Klass.prototype;

    var klass1 = new Klass.init('foo');
    equals(klass1.id, 1);

    var klass2 = new Klass.init('bar');
    equals(klass2.id, 2);

    Klass.bind('dispatch', function(ev, target) {
        equals(target.id, klass1.id);
    });
    klass1.dispatchTrigger();

    Klass.unbind('dispatch');

    Klass.bind('dispatch', function(ev, target) {
        equals(target.id, klass2.id);
    });
    klass2.dispatchTrigger();

    d.call();
}, 4).

test("Config", function(d) {
    var key;
    try {
        Config.get('booltest');
    } catch(e) {
        ok(true, "Config.get('booltest') is 'undefined'");
    }
    Config.append('booltest', {
        'default': true,
        type: 'boolean'
    });
    Config.clearALL();

    key = 'booltest';
    is(Config.get(key), true);
    Config.set(key, false);
    is(Config.get(key), false);
    Config.set(key, 1);
    is(Config.get(key), true);
    Config.set(key, '0');
    is(Config.get(key), false);

    Config.append('inttest', {
        'default': 10,
        type: 'int'
    });
    Config.clearALL();
    is(Config.get('inttest'), 10);
    Config.set('inttest', '100px');
    is(Config.get('inttest'), 100);

    Config.append('uinttest', {
        'default': 10,
        type: 'unsignedInt'
    });
    Config.clearALL();

    is(Config.get('uinttest'), 10);
    Config.set('uinttest', '-100px');
    is(Config.get('uinttest'), 0);

    Config.append('number', {
        'default': 3.333,
        type: 'number'
    });
    Config.clearALL();

    is(Config.get('number'), 3.333);
    Config.set('number', '-100.01');
    is(Config.get('number'), -100.01);

    Config.append('intbitween', {
        'default': 100,
        type: 'int',
        normalizer: {
            name: 'between',
            options: [10, 200],
        }
    });
    Config.clearALL();
    is(Config.get('intbitween'), 100);
    Config.set('intbitween', '500px');
    is(Config.get('intbitween'), 200);
    Config.set('intbitween', 5);
    is(Config.get('intbitween'), 10);

    // auto detect
    key = 'bool.autodetect';
    Config.append(key, true)
    is(Config.get(key), true);
    Config.set(key, false);
    is(Config.get(key), false);
    Config.set(key, 1);
    is(Config.get(key), true);
    Config.set(key, '0');
    is(Config.get(key), false);

    // auto detect
    key = 'int.autodetect';
    Config.append(key, 10)
    Config.clearALL();
    is(Config.get(key), 10);
    Config.set(key, '100px');
    is(Config.get(key), 100);

    Config.clearALL();
    d.call();
}, 20).

test("TagCompleter", function(d) {
    this.__defineGetter__('TestTags', function() {
        // 毎回生成する
        return [
           '*これはほげ',
           'aaa',
           'abc',
           'array',
           'arrya',
           'as3',
        ];
    });

    (function testUniqTag()
    {
        var line = new TagCompleter.InputLine('[foo][bar][foo]hoge', TestTags);
        is(line.value, '[foo][bar][foo]hoge');
        line.uniqTextTags();
        is(line.value, '[foo][bar]hoge');
    })();

    (function testAddTag()
    {
        var line = new TagCompleter.InputLine('', TestTags);
        line.addTag('foo');
        is(line.value, '[foo]');
        line.addTag('foo');
        is(line.value, '[foo]');
        line.addTag('bar');
        is(line.value, '[foo][bar]');
    })();

    (function testAddTag2()
    {
        var line = new TagCompleter.InputLine('コメント', TestTags);
        line.addTag('foo');
        is(line.value, '[foo]コメント');
        line.addTag('foo');
        is(line.value, '[foo]コメント');
        line.addTag('bar');
        is(line.value, '[foo][bar]コメント');
    })();


    (function testAddTag3()
    {
        var line = new TagCompleter.InputLine('[foo][aaコメント', TestTags);
        line.addTag('foo');
        is(line.value, '[foo][aaコメント');
        line.addTag('foo');
        is(line.value, '[foo][aaコメント');
        line.addTag('bar');
        is(line.value, '[foo][bar][aaコメント');
    })();

    (function testDevareTag() {
        var line = new TagCompleter.InputLine('[foo][aaコメント', TestTags);
        line.deleteTag('foo');
        is(line.value, '[aaコメント');
        line.deleteTag('foo');
        is(line.value, '[aaコメント');

        line = new TagCompleter.InputLine('[foo][bar][aaコメント', TestTags);
        line.deleteTag('foo');
        is(line.value, '[bar][aaコメント');
        line.deleteTag('bar');
        is(line.value, '[aaコメント');
    })();

    (function testPosWord () {
        var line = new TagCompleter.InputLine('[foo][bar]moo', TestTags);
        is(line.posWord(0), null);
        is(line.posWord(1), "");
        is(line.posWord(2), 'f');
        is(line.posWord(3), 'fo');
        is(line.posWord(4), 'foo');
        is(line.posWord(5), null);
        is(line.posWord(6), "");
        is(line.posWord(7), 'b');
        is(line.posWord(8), 'ba');
        is(line.posWord(9), 'bar');
        is(line.posWord(10), null);

        is(line.posWord(11), null);

        line = new TagCompleter.InputLine('a', TestTags);
        is(line.posWord(1), null);
    })();

    (function testSuggest() {
        var line = new TagCompleter.InputLine('[a', TestTags);
        var tags = line.suggest(2); // caret pos, デフォルトだと 10 個
        is(tags, ['aaa', 'abc', 'array', 'arrya', 'as3']);
        tags = line.suggest(1);
        is(tags, []);

        line.maxSuggest = 2;
        tags = line.suggest(2);
        is(tags, ['aaa', 'abc']);

        line = new TagCompleter.InputLine('[ano][bar]', TestTags);
        is(line.suggest(0), []);
        is(line.suggest(3), []);
        is(line.suggest(4), []);
        is(line.suggest(5), []);

        line = new TagCompleter.InputLine('[*こ', TestTags);
        is(line.suggest(0), []);
        is(line.suggest(1), []);
        is(line.suggest(2), ['*これはほげ']);
        is(line.suggest(3), ['*これはほげ']);

        line = new TagCompleter.InputLine('', TestTags);
        is(line.suggest(0), []);
    })();

    (function testInsertion() {
        var line = new TagCompleter.InputLine('[a', TestTags);
        // 戻り値に、caret 位置を返す
        is(5, line.insertionTag('abc', 2));
        is(line.suggest(5), []);
        is(line.value, '[abc]');

        line = new TagCompleter.InputLine('[a', TestTags);
        is(3, line.insertionTag('a', 2));
        is(line.suggest(3), []);
        is(line.value, '[a]');

        line = new TagCompleter.InputLine('[a', TestTags);
        is(5, line.insertionTag('abc', 1));
        is(line.suggest(5), []);
        is(line.value, '[abc]a');

        line = new TagCompleter.InputLine('[a[foo]komment', TestTags);
        is(9, line.insertionTag('afoobar', 2));
        is(line.suggest(9), []);
        is(line.value, '[afoobar][foo]komment');

        line = new TagCompleter.InputLine('[a][foo]komment', TestTags);
        is(9, line.insertionTag('afoobar', 2));
        is(line.suggest(9), []);
        is(line.value, '[afoobar][foo]komment');
    })();

    d.call();
}).

test("deferred retry", function(d) {
    var count = 0;
    var successThird = function() {
        var deferred = new Deferred;
        setTimeout(function() {
            var c = ++count;
            if (c == 3) {
                deferred.call('third');
            } else {
                deferred.fail('no third');
            }
        }, 10);
        return deferred;
    }
    Deferred.retry(4, successThird).next(function(mes) {
        equals('third', mes)
        count = 0;
        Deferred.retry(2, successThird).next(function(mes) {
            ok(false, 'don"t call this');
        }).error(function(mes) {
            ok(true, 'retry over');
            d.call();
        });
    }).error(function() {
        ok(false, 'don"t call this');
    });
    // orig_ajax({
    //     type: 'GET',
    //     url: 'http://www.google.com/',
    //     timeout: 1,
    // }).next(function(s) {
    //     console.log('success');
    //     p(s);
    // }).error(function(a) {
    //     p(this);
    //     console.log('error');
    //     console.log(a);
    // });
    // var w = d.wait(0.5).next(function() {
    //     alert(1);
    // });
    // setTimeout(function() {
    //     w.cancel();
    // }, 100);
    // var ret = Deferred.retry(function() {
    //     return d.wait(1).next(function() { return 10 });
    // });
    //d.call();
}, 2, 2000).

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
    equals(u.pathQuery, '/foobar?query=foo');
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
    equals(u.pathQuery, '/');
    equals(u.encodeURI, encodeURIComponent(hatena));
    equals(u.entryURL, B_HTTP + 'entry/s/www.hatena.ne.jp/');

    hatena = 'http://www.hatena.ne.jp/foobar?query1=foo%23&query2=bar#test';
    u = URI.parse(hatena);
    equals(u.param('query1'), 'foo#');
    equals(u.param('query2'), 'bar');
    u.param({query2: 'bar2'});
    equals(u.param('query2'), 'bar2');
    u.param({
        query1: 'bar#',
        query2: null,
    });
    equals(u.param('query1'), 'bar#');
    equals(u.param('query2'), null);
    equals(u.search, '?query1=bar%23');
    u.param('query3', 'baz');
    equals(u.search, '?query1=bar%23&query3=baz');
    var undef;
    u.param({
        query1: undef,
        query2: null,
        query3: null,
    });
    equals(u.search, '');

    var parsed = URI.parseQuery('comment=%5Bhatena%5Dhatenabookmark&url=http%3A%2F%2Fb.hatena.ne.jp%2F&with_status_op=1&private=1');
    is(parsed, {
        comment: '[hatena]hatenabookmark',
        url: 'http://b.hatena.ne.jp/',
        with_status_op: '1',
        private: '1',
    });
    ok(!parsed.foo);

    d.call();
}, 32, 1000).

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
    ExpireCache.clearAllCaches();
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
    ExpireCache.clearAllCaches();
    var cache = new HTTPCache('test');
    var url = 'http://b.hatena.ne.jp/index.html';
    var r_tmp;
    cache.get(url).next(function(res) {
        ok(res, 'get cache1');
        return res.toString();
    }).next(function(res1) {
        ok(cache.has(url), 'has cache');
        cache.get(url).next(function(res) {
            ok(res, 'get cache2');
            is(res, res1, 'eq cache');
            cache.clearAll();
            ok(!cache.has(url), 'cache clear all');
        });
    }).next(function() {
        d.call();
    });
}, 5, 3000).

test('HTTPCache(s)', function(d) {
    var url = 'http://b.hatena.ne.jp/index.html';
    ExpireCache.clearAllCaches();
    Deferred.parallel([
        HTTPCache.counter.get('https://www.hatena.ne.jp/').next(function(r) {
            ok(r == null, 'counter cache null');
        }),
        HTTPCache.counter.get(url).next(function(r) {
            ok(r, 'counter cache');
            ok(r >= 1, 'counter cache');
        }),
        HTTPCache.comment.get(url).next(function(r) {
            ok(r, 'comment cache');
            ok(r.count >= 1, 'comment cache count');
        }),
        HTTPCache.entry.get(url).next(function(r) {
            ok(r, 'entry cache');
        })
    ]).next(function() { return Deferred.parallel([
        HTTPCache.counter.get('https://www.hatena.ne.jp/').next(function(r) {
            ok(r == null, '2: counter cache null');
        }),
        HTTPCache.counter.get(url).next(function(r) {
            ok(r, '2: counter cache');
            ok(r >= 1, '2: counter cache');
        }),
        HTTPCache.comment.get(url).next(function(r) {
            ok(r, '2: comment cache');
            ok(r.count >= 1, '2: comment cache count');
        }),
        HTTPCache.entry.get(url).next(function(r) {
            ok(r, '2: entry cache');
        })
    ]) }).next(function() { d.call(); });
}, 12, 1000).

test('SiteinfoManager', function(d) {
    SiteinfoManager.storage = {};
    var data = [
        { domain: '^http://example\\.org/',
          paragraph: '//p',
          link: 'a' },
        { domain: '^http://([\\w-]+\\.)+example\\.org/',
          paragraph: '//div',
          link: 'descendant::a[@href]' },
    ];
    SiteinfoManager.addSiteinfos({ data: data });
    var siteinfo = SiteinfoManager.getSiteinfoForURL('http://foo.example.org/bar');
    equals(siteinfo.domain, data[1].domain, 'get siteinfo')
    equals(SiteinfoManager.getSiteinfosWithXPath.length, 0, 'get siteinfos with XPath');
    d.call();
}, 2, 1000).

test('SiteinfoManager.LDRizeConverter', function(d) {
    var originalData = [
        { domain: '^http://example\\.org/',
          paragraph: '//p',
          link: 'a[@href]' },
        { domain: '//div[@class="page_with_characteristic_structure"]',
          paragraph: '//div[@class="paragraph"]',
          link: 'h2/a' },
    ];
    var details = {
        data: originalData.map(function (d) { return { data: d }; }),
    };
    var data = SiteinfoManager.LDRizeConverter.convert(details.data, details);
    equals(data.length, 1, 'length of converted data');
    equals(data[0].domain, originalData[0].domain, 'converted data');
    equals(details.xpathData.length, 1, 'length of data with XPath');
    equals(details.xpathData[0].domain, originalData[1].domain, 'data with XPath');

    details.data = data;
    SiteinfoManager.addSiteinfos(details);
    var siteinfos = SiteinfoManager.getSiteinfosWithXPath();
    equals(siteinfos.length, 1, 'length of siteinfos with XPath');
    equals(siteinfos[0].domain, originalData[1].domain, 'siteinfos with XPath');
    d.call();
}, 6, 1000).

test('SiteinfoManager.SiteconfigConverter', function(d) {
    var originalData = {
        'www.example.org': [
            {
                path: '^/',
                entryNodes: {
                    'body': {
                        uri: 'window.location',
                        title: 'a',
                        container: 'p:nth-child(2)'
                    }
                }
            },
        ]
    };
    var data = SiteinfoManager.SiteconfigConverter.convert(originalData);
    equals(data.length, 1, 'length of converted data');
    equals(data[0].domain, '^https?://www\\.example\\.org/', 'converted domain');
    equals(data[0].paragraph, 'descendant::body', 'converted paragraph');
    equals(data[0].link, '__location__', 'converted link');
    equals(data[0].annotation, 'descendant::p[count(preceding-sibling::*) = 1]', 'converted annotation');
    d.call();
}, 5, 1000).

test('Model Bookmark/Tag', function(d) {
    var db = new Database('testModelBookmarkTag');
    Model.getDatabase = function() { return db };

    var bDate = new Bookmark();
    bDate.date = new Date(1255519120 * 1000);
    equals(bDate.get('date'), 1255519120 , 'date proxy');
    Database.debugMessage = true;
    Model.initialize(true).next(function() {
        ok(true, 'initialize model');
        var bookmark = new Bookmark({
            url: 'http://www.hatena.ne.jp/',
            comment: '[hatena][はてな]これはすごい',
            title: 'はてなのサイト',
        });
        bookmark.set('date', 1255519120);
        bookmark.saveWithTransaction().next(function(b) {
            equals(b.id, 1);
            equals(b.date - 0, new Date(1255519120 * 1000)-0, 'date proxy');
            ok(b.search.indexOf('これはすごい') != -1, 'search comment');
            ok(b.search.indexOf('サイト') != -1, 'search title');
            Tag.find({}).next(function(tags) {
                equals(tags.length, 2);
                equals(tags[0].name, 'hatena');
                equals(tags[1].name, 'はてな');
            }).next(function() {
                db.transaction(function() {
                    for (var i = 0;  i < 99; i++) {
                        var b = new Bookmark({
                            url: 'http://www.hatena.ne.jp/' + i,
                            comment: '[hatena][はてな]これはすごい' + i,
                            title: 'はてなのサイト' + i,
                        });
                        b.set('date', 1255519120 + i);
                        b.save().next();
                    }
                }).next(function() {
                    ok(true, '100 bookmark insert');
                    Tag.count().next(function(c) {
                        equals(c, 200);
                        Bookmark.search('なのサ').next(function(r) {
                            equals(r.length, 20, 'search res');
                            Bookmark.search('すごい5').next(function(r) {
                                equals(r.length, 11, 'search res2');
                                equals(r[r.length-1].url, 'http://www.hatena.ne.jp/59', 'search order');
                                d.call();
                            });
                        });
                    });
                });
            });
        });
    });
}, 14, 5000).

test('UserView', function(d) {
    var view = new User.View('nagayama');
    equals(view.icon , 'http://www.st-hatena.com/users/na/nagayama/profile_s.gif');
    equals(view.largeIcon, 'http://www.st-hatena.com/users/na/nagayama/profile.gif');

    d.call();
}).
test('UserManeger', function(d) {
    // UserManager.MY_NAME_URL = '/tests/data/hatenatest.my.name';
    UserManager.deferred('bind', 'UserChange').next(function(ev, user) {
        ok(true, 'Loggin!');
        equals(UserManager.user, user, 'user');
        equals(user.name, 'hatenatest');
        ok(user.ignores instanceof RegExp, 'ignores regexp list');
        ok(user.public != user.private, 'public/private');
        ok(user.database instanceof Database, 'database instance');
        UserManager.clearUser();
        ok(UserManager.user != user, 'no user');
        d.call();

        UserManager.unbind('UserChange');
    });
    UserManager.login();
}, 7, 1000).

test('sync sync sync', function(d) {
    Timer.__defineGetter__('now', function() { return 1255663923100 });
    var db = new Database('SyncTest');
    Model.getDatabase = function() { return db };
    var user = new User('hatenatest', {});
    Sync.getDataURL = function() {
        return user.dataURL;
    }
    Sync.deferred('bind', 'progress').next(function(ev, obj) {
        if (obj.value !== null && obj.value == 0) {
            ok(true, 'progress start');
        }
    });
    Sync.deferred('bind', 'complete').next(function() {
        ok(true, 'Sync!');
        Sync.unbind('complete');
        Bookmark.count().next(function(r) {
            equals(r, 518, 'total count');
            Tag.find({where: {name: 'db'}}).next(function(r) {
                equals(r.length, 13, 'tag');

                Sync.deferred('bind', 'complete').next(function() {
                    ok(true, 'sync sync');
                    Bookmark.count().next(function(r) {
                        equals(r, 519, 'total count2');
                        Tag.find({where: {name: 'db'}}).next(function(r) {
                            equals(r.length, 14, 'tag2');
                            Bookmark.search('高速').next(function(r) {
                                equals(r.length, 3, 'search');
                                Tag.getNameCountHash().next(function(tags) {
                                    equals(Object.keys(tags).length, 88);
                                    equals(tags['並行'], 40);
                                    equals(tags['javascript'], 11);
                                    d.call();
                                });
                            });
                        });
                    });
                });
                Sync.sync();
            });
        });
    });
    Model.initialize(true).next(function() {
        Sync.init();
    });
}, 12, 10000).

test('finished', function(d) {
    ok(true, 'finished!!!');
    d.call();
}).

error(function(e) {
    console.log('error' + e.toString());
    throw(e);
});


