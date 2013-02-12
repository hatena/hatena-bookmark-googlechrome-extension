/*============================================================*
 * 別のファイルに切り出していないテスト
 *============================================================*/

function is( a, b, mes ) {
    equal( JSON.stringify(a), JSON.stringify(b), mes );
}

module( "Utils" );

test( "sprintf function", 3, function () {
    equal(
        sprintf( 'foo%sbar%sbaz', '-', '-' ),
        'foo-bar-baz',
        "テンプレート中の '%s' は文字列に置き換えられる" );
    equal(
        sprintf( 'foo%dbar%dbaz', '30hogehoge', 22),
        'foo30bar22baz',
        "テンプレート中の '%d' は数値に置き換えられる" );
    equal(
        sprintf( '%05d-%04d-%03d', 10, 10, 10 ),
        '00010-0010-010',
        "テンプレートでの '%d' に 0 詰めの幅指定ができる" );
} );

test( "isString function", 4, function () {
    ok( Utils.isString('foo'), 'String 型の値は真' );
    ok( Utils.isString(new String('foo')), 'String オブジェクトは真' );
    ok( !Utils.isString(null), 'null は偽' );
    ok( !Utils.isString(void 0), 'undefined は偽' );
} );

test( "strToDate function", 3, function () {
    ok(
        Utils.strToDate('20091019175513') instanceof Date,
        "strToDate 関数の返り値は Date オブジェクト" );
    equal(
        Utils.strToDate('20091019175513').getTime(),
        ( 1255974913 + ( new Date() ).getTimezoneOffset() * 60 ) * 1000,
        "YYYYMMDDhhmmss 形式の文字列を与えるとその時刻に対応する Date オブジェクトを返す" );
    equal(
        Utils.strToDate('20091019175513').getTimezoneOffset(),
        ( new Date() ).getTimezoneOffset(),
        "Timezone はブラウザのデフォルトタイムゾーンである" );
} );

module( "jQuery" );

test( "jQuery classlike", 4, function () {
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
    equal(klass1.id, 1);

    var klass2 = new Klass.init('bar');
    equal(klass2.id, 2);

    Klass.bind('dispatch', function(ev, target) {
        equal(target.id, klass1.id);
    });
    klass1.dispatchTrigger();

    Klass.unbind('dispatch');

    Klass.bind('dispatch', function(ev, target) {
        equal(target.id, klass2.id);
    });
    klass2.dispatchTrigger();
} );

module( "Config" );

test( "Config", 20, function () {

    var key;
    try {
        Config.get('booltest');
    } catch ( err ) {
        ok( true, "Config.get('booltest') is 'undefined'" );
    }
    Config.append( 'booltest', {
        'default': true,
        type: 'boolean'
    } );
    Config.clearALL();

    key = 'booltest';
    is( Config.get(key), true );
    Config.set( key, false );
    is( Config.get(key), false );
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
} );

asyncTest( "deferred retry", 2, function () {
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
        equal('third', mes)
        count = 0;
        Deferred.retry(2, successThird).next(function(mes) {
            ok(false, 'don"t call this');
        }).error(function(mes) {
            ok(true, 'retry over');
            QUnit.start();
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
} );

module( "URI" );

test( "uri", 32, function () {
    var hatena = 'http://www.hatena.ne.jp/foobar?query=foo#hash=bar';
    var u = URI.parse(hatena);
    equal(u.search, '?query=foo');
    equal(u.hash, '#hash=bar');
    equal(u.schema, 'http');
    ok(!u.isHTTPS, 'is not HTTPS');
    equal(u.port, '');
    equal(u.host, 'www.hatena.ne.jp');
    equal(u.path, '/foobar');
    equal(u.href, hatena);
    equal(u.pathQuery, '/foobar?query=foo');
    equal(u.encodeURI, encodeURIComponent(hatena));
    equal(u.entryURL, B_HTTP + 'entry/www.hatena.ne.jp/foobar?query=foo%23hash=bar');

    hatena = 'https://www.hatena.ne.jp/';
    u = URI.parse(hatena);
    equal(u.search, '');
    equal(u.hash, '');
    equal(u.schema, 'https');
    ok(u.isHTTPS, 'isHTTPS');
    equal(u.port, '');
    equal(u.host, 'www.hatena.ne.jp');
    equal(u.path, '/');
    equal(u.href, hatena);
    equal(u.pathQuery, '/');
    equal(u.encodeURI, encodeURIComponent(hatena));
    equal(u.entryURL, B_HTTP + 'entry/s/www.hatena.ne.jp/');

    hatena = 'http://www.hatena.ne.jp/foobar?query1=foo%23&query2=bar#test';
    u = URI.parse(hatena);
    equal(u.param('query1'), 'foo#');
    equal(u.param('query2'), 'bar');
    u.param({query2: 'bar2'});
    equal(u.param('query2'), 'bar2');
    u.param({
        query1: 'bar#',
        query2: null,
    });
    equal(u.param('query1'), 'bar#');
    equal(u.param('query2'), null);
    equal(u.search, '?query1=bar%23');
    u.param('query3', 'baz');
    equal(u.search, '?query1=bar%23&query3=baz');
    var undef;
    u.param({
        query1: undef,
        query2: null,
        query3: null,
    });
    equal(u.search, '');

    var parsed = URI.parseQuery('comment=%5Bhatena%5Dhatenabookmark&url=http%3A%2F%2Fb.hatena.ne.jp%2F&with_status_op=1&private=1');
    is(parsed, {
        comment: '[hatena]hatenabookmark',
        url: 'http://b.hatena.ne.jp/',
        with_status_op: '1',
        private: '1',
    });
    ok(!parsed.foo);
} );

module( "Timer" );

asyncTest( "timer", 6, function () {
    var t = Timer.create(10, 5); // 10ms, 5times
    var i = 0;
    t.bind('timer', function(ev, c) {
        equal(c, ++i);
    });
    t.bind('timerComplete', function(ev, c) {
        equal(c, 5);
        QUnit.start();
    });
    t.start();
} );

asyncTest( "timer stop", 3, function () {
    var t = Timer.create(10, 5); // 10ms, 5times
    var i = 0;
    t.bind('timer', function(ev, c) {
        equal(c, ++i);
        if (c == 3) t.stop();
    });
    t.bind('timerComplete', function(ev, c) {
        ok(false, 'not call this');
    });
    setTimeout(function() { QUnit.start() }, 500);
    t.start();
} );

module( "ExpireCache" );

asyncTest( 'ExpireCache', 8, function () {
    ExpireCache.clearAllCaches();
    var cache = new ExpireCache('testcache' + (new Date-0));
    ok(cache.get('foo') == null );
    cache.set('foo', 'bar');
    equal(cache.get('foo'), 'bar');
    cache.set('foo1', 'baz1');
    equal(cache.get('foo1'), 'baz1');
    cache.clear('foo1');
    ok(cache.get('foo1') == null, 'cache clear');
    cache.clearAll();
    ok(cache.get('foo') == null, 'cache clear all');

    var cache2 = new ExpireCache('testcache1' + (new Date-0), 60, 'JSON');
    var data = {foo: 'bar'};
    cache2.set('data', data);
    equal(cache2.get('data').foo, 'bar', 'serialize json');

    cache = new ExpireCache('testcache2' + (new Date-0), 0.01); // 10ms cache
    cache.set('foo1', 'bar');
    equal(cache.get('foo1'), 'bar');
    wait(0.2).next(function() {
        ok(cache.get('foo1') == null, 'cache expired');
        QUnit.start();
    });
} );

module( "SiteInfoManager" );

test( 'SiteinfoManager', 2, function () {
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
    equal(siteinfo.domain, data[1].domain, 'get siteinfo')
    equal(SiteinfoManager.getSiteinfosWithXPath.length, 0, 'get siteinfos with XPath');
} );

test( 'SiteinfoManager.LDRizeConverter', 6, function () {
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
    equal(data.length, 1, 'length of converted data');
    equal(data[0].domain, originalData[0].domain, 'converted data');
    equal(details.xpathData.length, 1, 'length of data with XPath');
    equal(details.xpathData[0].domain, originalData[1].domain, 'data with XPath');

    details.data = data;
    SiteinfoManager.addSiteinfos(details);
    var siteinfos = SiteinfoManager.getSiteinfosWithXPath();
    equal(siteinfos.length, 1, 'length of siteinfos with XPath');
    equal(siteinfos[0].domain, originalData[1].domain, 'siteinfos with XPath');
} );

test( 'SiteinfoManager.SiteconfigConverter', 5, function () {
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
    equal(data.length, 1, 'length of converted data');
    equal(data[0].domain, '^https?://www\\.example\\.org/', 'converted domain');
    equal(data[0].paragraph, 'descendant::body', 'converted paragraph');
    equal(data[0].link, '__location__', 'converted link');
    equal(data[0].annotation, 'descendant::p[count(preceding-sibling::*) = 1]', 'converted annotation');
} );

(function () {
var Bookmark = Model.Bookmark, Tag = Model.Tag;
module( "Model" );

asyncTest( 'Model Bookmark/Tag', 13, function(d) {
    var db = new Database('testModelBookmarkTag');
    Model.getDatabase = function() { return db };

    var bDate = new Bookmark();
    bDate.date = new Date(1255519120 * 1000);
    equal(bDate.get('date'), 1255519120 , 'date proxy');
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
            equal(b.id, 1);
            equal(b.date - 0, new Date(1255519120 * 1000)-0, 'date proxy');
            ok(typeof b.search === 'undefined', 'Bookmark#search not used');
            Tag.find({}).next(function(tags) {
                equal(tags.length, 2);
                equal(tags[0].name, 'hatena');
                equal(tags[1].name, 'はてな');
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
                        equal(c, 200);
                        Bookmark.search('なのサ').next(function(r) {
                            equal(r.length, 20, 'search res');
                            Bookmark.search('すごい5').next(function(r) {
                                equal(r.length, 11, 'search res2');
                                equal(r[r.length-1].url, 'http://www.hatena.ne.jp/59', 'search order');
                                QUnit.start();
                            });
                        });
                    });
                });
            });
        });
    });
} );
}).call( this );

module( "User" );

test( 'UserView', 2, function () {
    var view = new User.View('nagayama');
    ok(view.icon.match(/\/users\/na\/nagayama\/profile_s\.gif$/));
    ok(view.largeIcon.match(/\/users\/na\/nagayama\/profile\.gif$/));
});

asyncTest( 'UserManeger', 7, function () {
    // UserManager.MY_NAME_URL = '/tests/data/hatenatest.my.name';
    UserManager.deferred('bind', 'UserChange').next(function(ev, user) {
        ok(true, 'Loggin!');
        equal(UserManager.user, user, 'user');
        equal(user.name, 'hatenatest');
        ok(user.ignores instanceof RegExp, 'ignores regexp list');
        ok(user.public != user.private, 'public/private');
        ok(user.database instanceof Database, 'database instance');
        UserManager.clearUser();
        ok(UserManager.user != user, 'no user');
        QUnit.start();

        UserManager.unbind('UserChange');
    });
    UserManager.login();
} );

(function () {
module( "Sync" );

var Bookmark = Model.Bookmark, Tag = Model.Tag;
asyncTest( 'sync sync sync', 12, function(d) {
    Timer.__defineGetter__('now', function() { return 1255663923100 });
    var db = new Database('SyncTest');
    Model.getDatabase = function() { return db };
    var user = new User('hatenatest', {});
    Sync.getDataURL = function() {
        return user.dataURL;
    }
    // Sync.deferred は, jQuery.fn.deferred で定義されていて, JSDeferred.connect を
    // 行う. 要は, Sync.bind("progress", ...) でイベントリスナを登録し, イベント発火
    // 時に next に進むものと思えばよい. (bind は Object.prototype.bind ではなく
    // jQuery のメソッド)
    Sync.deferred('bind', 'progress').next(function(ev, obj) {
        if (obj.value !== null && obj.value == 0) {
            ok(true, 'progress start');
        }
    });
    Sync.deferred('bind', 'complete').next(function() {
        ok(true, 'Sync!');
        Sync.unbind('complete');
    }).
    // Sync.deferred().next メソッドのコールバックの中から Deferred オブジェクトを
    // 返しても, そこに値がセットされる前に次の next コールバックが呼び出されてしまう
    // ようなので, 一旦別の next コールバック呼び出しをはさむ
    // Sync 前の状態確認
    next(function () {
        return Bookmark.count().next(function(r) {
            equal(r, 518, 'total count');
        });
    }).
    next(function () {
        return Tag.find({where: {name: 'db'}}).next(function (r) {
            equal(r.length, 13, 'tag');
        });
    }).
    // Sync する
    next(function () {
        var d = Sync.deferred('bind', 'complete').next(function() {
            ok(true, 'sync sync');
        });
        Sync.sync();
        return d;
    }).
    // 以降は Sync 後の状態確認
    next(function () {
        return Bookmark.count().next(function(r) {
            equal(r, 519, 'total count2');
        });
    }).
    next(function () {
        return Tag.find({where: {name: 'db'}}).next(function(r) {
            equal(r.length, 14, 'tag2');
        });
    }).
    next(function () {
        return Bookmark.search('高速').next(function(r) {
            equal(r.length, 3, 'search');
        });
    }).
    next(function () {
        return Tag.getNameCountHash().next(function(tags) {
            equal(Object.keys(tags).length, 88);
            equal(tags['並行'], 40);
            equal(tags['javascript'], 11);
        });
    }).
    next(function () {
        QUnit.start();
    });

    Model.initialize(true).next(function() {
        Sync.init();
    });
} );
}).call( this );
