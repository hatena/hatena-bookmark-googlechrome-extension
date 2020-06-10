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
    equal(u.entryURL, B_ORIGIN + 'entry/www.hatena.ne.jp/foobar?query=foo%23hash=bar');

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
    equal(u.entryURL, B_ORIGIN + 'entry/s/www.hatena.ne.jp/');

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

    var parsed = URI.parseQuery('comment=%5Bhatena%5Dhatenabookmark&url=https%3A%2F%2Fb.hatena.ne.jp%2F&with_status_op=1&private=1');
    is(parsed, {
        comment: '[hatena]hatenabookmark',
        url: 'https://b.hatena.ne.jp/',
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
    Deferred.wait(0.2).next(function() {
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
