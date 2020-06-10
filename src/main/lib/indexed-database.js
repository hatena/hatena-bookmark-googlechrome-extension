var IDBManager = class {

    constructor(name) {
        this.name = name;
    }

    static getInstance(name) {
        if (!IDBManager._instances) { IDBManager._instances = {} }
        if (!IDBManager._instances[name]) {
            IDBManager._instances[name] = new IDBManager(name)
        }
        return IDBManager._instances[name];
    }

    /**
     * schema: {
     *   version: number;
     *   stores: [ {
     *     name: string;
     *     key: { keyPath: string; autoIncrement: boolean; },
     *     indices: [ {
     *       name: string;
     *       path: string;
     *       opts: any;
     *     } ]
     *   } ]
     * }
     */
    initialize(schema) {
        return new Promise((ok, ng) => {
            var dbConnect = indexedDB.open(this.name, schema.version);

            dbConnect.onsuccess = (event) => {
                var target = event.target;
                this.database = target.result;
                ok(event);
            };

            dbConnect.onerror = (event) => {
                ng(event);
            };

            dbConnect.onupgradeneeded = (event) => {
                var target = event.target;
                this.database = target.result;

                var oldVersion = event.oldVersion;
                var newVersion = event.newVersion;

                if (oldVersion === '' || oldVersion === 0) {
                    schema.stores.forEach(storeSchema => {
                        const store = this.database.createObjectStore(
                            storeSchema.name,
                            storeSchema.key
                        );
                        (storeSchema.indices || []).forEach(index => {
                            store.createIndex(index.name, index.path, index.opts);
                        })
                    })
                } else {
                    // TODO code for version up.
                }
            };
        });
    }

    // ---- thin wrapper ----

    get(storeName, key, opts = {}) {
        return new Promise((ok, ng) => {
            var txn = this.database.transaction(storeName, 'readonly');
            var store = txn.objectStore(storeName);
            var idx = opts.indexName ? store.index(opts.indexName) : undefined;
            var req = idx ? idx.get(key) : store.get(key);

            req.onsuccess = function() {
                if (opts.success) opts.success(this);
                ok(this.result);
            };
            req.onerror = function(e) {
                if (opts.error) opts.error(e);
                ng(e);
            };
        })
    }

    search(storeName, key, opts = {}) {
        const {
            indexName, condidtion, direction, limit, offset,
            filter, update
        } = opts;
        const direct = direction || "next";
        const off    = offset || 0;
        return new Promise((ok, ng) => {
            const txn = this.database.transaction(
                storeName,
                update ? 'readwrite' : 'readonly'
            );
            const store = txn.objectStore(storeName);
            const idx   = indexName ? store.index(indexName) : undefined;

            const range =
                  !key               ? null
                : condition === 'gt' ? IDBKeyRange.lowerBound(key)
                : condition === 'lt' ? IDBKeyRange.upperBound(key)
                                     : IDBKeyRange.only(key);

            const req = idx ? idx.openCursor(range, direct)
                            : store.openCursor(range, direct);

            const resultArray = [];
            let skipped = 0;
            req.onsuccess = function() {
                const cursor = this.result;
                if (cursor && (limit === undefined || resultArray.length < limit)) {
                    if (!filter || filter(cursor)) {
                        if (skipped >= off) {
                            if (update) { update(cursor); }
                            resultArray.push(cursor.value);
                        } else {
                            skipped++;
                        }
                    }
                    cursor.continue(); // search next;
                } else {
                    ok(resultArray)
                }
            };
            req.onerror = function(e) {
                consolel.log(e);
                ng(e);
            }
        })
    }

    update(storeName, key, updateValues, opts = {}) {
        opts.update = true;
        opts.success = (cursor) => {
            var original = cursor.value;
            for (var key in updateValues) {
                original[key] = updateValues[key];
            }
            cursor.update(original);
        };
        return this.search(storeName, key, opts);
    }

    put(storeName, data, opts = {}) {
        return this.putAll(storeName, [data], opts).then(
            (results) => results[0],
            (errors) => errors[0]
        );
    }

    // TODO. エラー処理確認する. 一個だけ失敗した場合にどうなるのか等
    putAll(storeName, dataArray, opts = {}) {
        return Promise.all(dataArray.map(data => {
            return new Promise((ok, ng) => {
                var txn = this.database.transaction(storeName, 'readwrite');
                var store = txn.objectStore(storeName);
                var req = store.put(data);
                req.onsuccess = (e) => {
                    if (opts.success) opts.success(e);
                    ok(e);
                };
                req.onerror = (e) => {
                    if (opts.error) opts.error(e);
                    ng(e);
                };
            })
        }))
    }

    delete(storeName, key, opts = {}) {
        return new Promise((ok, ng) => {
            var txn = this.database.transaction(storeName, 'readwrite');
            var store = txn.objectStore(storeName);
            var req = store.delete(key);

            req.onsuccess = (e) => {
                if (opts.success) opts.success();
                ok(e);
            };
            req.onerror = (e) => {
                if (opts.error) opts.error();
                ng(e);
            };
        })
    }

    destroy() {
        return new Promise((ok, ng) => {
            const req = indexedDB.deleteDatabase(this.name);
            req.onsuccess = function(e) { ok(e) };
            req.onerror   = function(e) { ng(e) };
            req.onblocked = function(e) { ng(e) };
        });
    }
}
