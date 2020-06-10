(function () {
module( "Sync" );

var Bookmark = Model.Bookmark;
asyncTest( 'sync sync sync', 7, function(d) {
    // firefox ではローカルファイルの読み込みが content-type: application/xml になり
    // $.ajax が xml パースエラーを出してしまうのでモックする
    var orig = XMLHttpRequest.prototype.getAllResponseHeaders;
    XMLHttpRequest.prototype.getAllResponseHeaders = function(...args) { return ""; };

    Timer.__defineGetter__('now', function() { return 1255663923100 });
    Model.getDatabase = function() { return IDBManager.getInstance('test-sync'); }
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
        return Bookmark.search('', { limit: 1000 }).next(function(r) {
            equal(r.length, 518, 'total count');
        })
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
        return Bookmark.search('', { limit: 1000 }).next(function(r) {
            equal(r.length, 519, 'total count2');
        });
    }).
    next(function () {
        return Bookmark.search('高速').next(function(r) {
            equal(r.length, 3, 'search');
        });
    }).
    error(function() {}).
    next(function () {
        QUnit.start();
        XMLHttpRequest.prototype.getAllResponseHeaders = orig;
    });

    Model.initialize(true).next(function() {
        Sync.init();
    });
} );
}).call( this );
