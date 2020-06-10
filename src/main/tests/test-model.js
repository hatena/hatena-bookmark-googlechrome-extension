(function () {
var Bookmark = Model.Bookmark;
module( "Model" );

test( 'Model.Bookmark proxy', 9, function () {
    var bDate = new Bookmark({
        url: 'http://www.hatena.ne.jp/',
        comment: '[hatena][はてな]これはすごい',
        title: 'はてなのサイト',
    });
    const date = new Date(1255519120 * 1000);

    bDate.set('date', 1255519120);
    equal(bDate.get('date'), 1255519120 , 'date proxy');
    equal(bDate.date.getTime(), date.getTime());

    bDate.date = date;
    equal(bDate.get('date'), 1255519120 , 'date proxy');
    equal(bDate.date.getTime(), date.getTime());

    equal(bDate.dateFullYMD, '20091014201840');
    equal(bDate.dateYMDHM, "2009/10/14 20:18");
    equal(bDate.dateYMD, "2009/10/14");
    deepEqual(bDate.tags, ['hatena', 'はてな']);
    equal(bDate.body, 'これはすごい');
});

asyncTest( 'Model Bookmark', 16, function(d) {
    Model.getDatabase = function() { return IDBManager.getInstance('test-model'); }

    Model.initialize(true).next(function() {
        ok(true, 'initialize model');
        var bookmark = new Bookmark({
            url: 'http://www.hatena.ne.jp/',
            comment: '[hatena][はてな]これはすごい',
            title: 'はてなのサイト',
        });
        bookmark.set('date', 1255519120);
        return bookmark.saveWithTransaction();
    }).next(function(b) {
        equal(b.date - 0, new Date(1255519120 * 1000)-0, 'date proxy');
        ok(typeof b.search === 'undefined', 'Bookmark#search not used');
        const promises = [];
        for (var i = 0;  i < 99; i++) {
            var b = new Bookmark({
                url: 'http://www.hatena.ne.jp/' + i,
                comment: '[hatena][はてな]これはすごい' + i,
                title: 'はてなのサイト' + i,
            });
            b.set('date', 1255519120 + i);
            promises.push(b.save());
        }
        return Promise.all(promises);
    }).next(function() {
        ok(true, '100 bookmark insert');
        return Bookmark.findByUrl('http://www.hatena.ne.jp/48');
    }).next(function(bookmark) {
        equal(bookmark.comment, '[hatena][はてな]これはすごい48');
        equal(bookmark.title, 'はてなのサイト48');
        return bookmark.destroy();
    }).next(function() {
        return Bookmark.findByUrl('http://www.hatena.ne.jp/48');
    }).next(function(bookmark) {
        equal(bookmark, undefined, '消したのでブックマーク取得できない');
    }).next(function() {

        return Bookmark.search('なのサ')
    }).next(function(r) {
        equal(r.length, 20, 'デフォルトの limit が 20');

        return Bookmark.search('サイト3')
    }).next(function(r) {
        equal(r.length, 11, '3, 30~39 で 11 個');
        equal(r[0].url, 'http://www.hatena.ne.jp/3', 'search order');

        return Bookmark.search('すごい4')
    }).next(function(r) {
        equal(r.length, 10, '48 を消したので 10 個しか取得できない');
        equal(r[r.length-1].url, 'http://www.hatena.ne.jp/49', 'search order');

        return Bookmark.search('http://www.hatena.ne.jp/5')
    }).next(function(r) {
        equal(r.length, 11, '5, 50~59 で 11 個');
        equal(r[0].url, 'http://www.hatena.ne.jp/5', 'search order');

        return Bookmark.search('すごい4', { offset: 1, limit: 2, order: 'date desc' });
    }).next(function(r) {
        equal(r.length, 2, 'limit 2 なので 2');
        equal(r[0].url, 'http://www.hatena.ne.jp/47', 'offset して 49 -> 47');
    }).next(function(r) {
        QUnit.start();
    });
} );
}).call( this );

