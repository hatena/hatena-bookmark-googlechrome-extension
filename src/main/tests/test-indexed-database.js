/*============================================================*
 * indexed-database.js 周りのテスト
 *============================================================*/

module( "indexed-database" );

asyncTest( "IDBManager", 1, function () {

    const idbm = IDBManager.getInstance('hatenabookmark-for-test')

    idbm.destroy().then(function() {
        return idbm.initialize({
            version: 1,
            stores: [
                {
                    name: "test-table-1",
                    key: { keyPath: "id", autoIncrement: false },
                    indices: [
                        { name: "date", path: "date", opts: { unique: false } }
                    ]
                },
                {
                    name: "test-table-2",
                    key: { keyPath: "test", autoIncrement: true }
                }
            ]
        })
    }).then(function() {
        const db = idbm.database;
        deepEqual([ ...db.objectStoreNames ], ["test-table-1", "test-table-2"]);
    }).catch().then(function() {
        QUnit.start();
    });

} );
