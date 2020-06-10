/*============================================================*
 * HTTPCache のテスト
 *============================================================*/

(function () {
module( "HTTPCache" );

// firefox ではローカルファイルの読み込みが content-type: application/xml になり
// $.ajax が xml パースエラーを出してしまうのでモックする
var orig = XMLHttpRequest.prototype.getAllResponseHeaders;
XMLHttpRequest.prototype.getAllResponseHeaders = function(...args) { return ""; };

asyncTest( 'HTTPCache', 5, function () {
    ExpireCache.clearAllCaches();
    var cache = new HTTPCache('test');
    var url = 'https://b.hatena.ne.jp/index.html';
    var r_tmp;
    cache.get(url).next(function(res) {
        ok(res, 'get cache1');
        return res;
    }).next(function(res1) {
        ok(cache.has(url), 'has cache');
        cache.get(url).next(function(res) {
            ok(res, 'get cache2');
            is(res, res1, 'eq cache');
            cache.clearAll();
            ok(!cache.has(url), 'cache clear all');
        });
    }).
    // エラーが発生した場合にも QUnit.start メソッドが呼び出されるように
    error(function(){}).
    next(function() { QUnit.start(); });
} );

asyncTest( 'HTTPCache(s)', 12, function () {
    var url = 'https://b.hatena.ne.jp/index.html';
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
    ]).
    next(function() { return Deferred.parallel([
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
    ]) }).
    // エラーが発生した場合にも QUnit.start メソッドが呼び出されるように
    error(function(){}).
    next(function() { QUnit.start(); });
} );

}).call( this );
