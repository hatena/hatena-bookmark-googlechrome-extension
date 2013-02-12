/*============================================================*
 * jsdeferred-webdatabase.js 周りのテスト
 *============================================================*/

module( "jsdeferred-webdatabase" );

asyncTest( "isTableCreated method", 2, function () {

    // テスト用の Database オブジェクトを返すようにメソッドを上書き
    Model.getDatabase = function() {
        return new Database( 'hatenabookmark-for-test', {
            estimatedSize: 50 * 1024 * 1024
        } );
    };

    // Model.initialize() を実行してテーブルを作成し (存在しなければ),
    // Bookmark.isTableCreated の返り値を検査
    Model.initialize().
    next( function () {
        return Model.Bookmark.isTableCreated();
    } ).
    next( function ( isCreated ) {
        ok( isCreated,
            "テーブルが存在するならば Model.Bookmark.isTableCreated は真を返す" );
    } ).
    // テーブルを削除して, Bookmark.isTableCreated の返り値を検査
    next( function () {
        return Model.Bookmark.dropTable();
    } ).
    next( function () {
        return Model.Bookmark.isTableCreated();
    } ).
    next( function ( isCreated ) {
        ok( !isCreated,
            "テーブルが存在しないならば Model.Bookmark.isTableCreated は偽を返す" );
    } ).
    // エラーが発生しても QUnit.start メソッドが呼ばれるように
    error().
    next( function () {
        QUnit.start(); // 停止している testrunner の再開
    } );

} );
