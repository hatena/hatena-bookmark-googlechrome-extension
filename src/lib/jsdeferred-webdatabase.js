
(function() {
    Deferred.define(this);

    var $D = Deferred;
    var $K = function(x) { return function() { return x } };
    var Database, Transaction, SQL, Model;

    var p = function() {
        console.log(Array.prototype.slice.call(arguments, 0));
    }

    var extend = function(to, from) {
        if (!from) return to;
        for (var key in from) {
            to[key] = from[key];
            var getter, setter;
            if (getter = from.__lookupGetter__(key)) {
                if (getter) to.__defineGetter__(key, getter);
            }
            if (setter = from.__lookupSetter__(key)) {
                if (setter) to.__defineSetter__(key, setter);
            }
        }
        return to;
    }

    Database = Deferred.WebDatabase = function(dbName, options) {
        if (!dbName) dbName = 'default-wdb';

        if (Database._instances[dbName]) return Database._instances[dbName];

        this.options = extend({
            version: '1.0',
            displayName: dbName,
            estimatedSize: 50 * 1024 * 1024
        }, options);

        this.dbName = dbName;
        this.db = this.getDatabase();
        Database._instances[dbName] = this;
        return this;
    }

    extend(Database, {
        Util: {
            _addTrigger: function(obj, name, func, type) {
                if (!obj && obj[name]) throw new Error('obj or ' + name + ' is not fount.');
                if (!obj._triggers) obj._triggers = {};
                if (!obj._triggers[name]) obj._triggers[name] = [];
                var callers = obj._triggers[name];
                var origFunc = obj[name];
                if (type == 'after') {
                    obj[name] = function() {
                        var res = origFunc.apply(obj, arguments);
                        if (res instanceof Deferred) {
                            return res.next(func);
                        } else {
                            func.apply(obj, arguments);
                            return res;
                        }
                    }
                } else {
                    obj[name] = function() {
                        var res = func.apply(obj, arguments);
                        if (res instanceof Deferred) {
                            return res.next(origFunc);
                        } else {
                            return origFunc.apply(obj, arguments);
                        }
                    }
                }
            },
            afterTrigger: function(obj, name, func) {
                return Database.Util._addTrigger(obj, name, func, 'after');
            },
            beforeTrigger: function(obj, name, func) {
                return Database.Util._addTrigger(obj, name, func, 'before');
            }
        },
        _instances: {},
        debug: p,
        global: null
    });

    Database.prototype = {
        transaction: function(callback, lock) {
            if (typeof lock == 'undefined') lock = true;
            var d = new $D, db = this.db;
            var self = this;
            self._d = db.transaction(function(tx) {
                var t = new Transaction(tx);
                self._tx = t;
                callback(t);
                return t.commit(lock);
            }, function(e) {
                self.clearTransaction();
                if (Database.debugMessage) console.error('transaction error:' +  e);
                d.fail(e);
            }, function(e) {
                self.clearTransaction();
                d.call(e);
            });
            return d;
        },
        clearTransaction: function() {
            if (this._tx) delete this._tx;
            if (this._d) delete this._d;
        },
        getDatabase: function() {
            var options = this.options;
            var db = (Database.global || window).openDatabase(this.dbName, options.version, options.displayName, options.estimatedSize);
            return db;
        },
        execute: function(sql, args) {
            var self = this;
            if (self._tx)
                return self._tx.execute(sql, args);
            return next(function() {
                var d = new $D;
                if (!(sql instanceof Array)) {
                    sql = [[sql, args]];
                }
                var nRes, nError;
                self.transaction(function(tx) {
                    var str, arg;
                    for (var i = 0, len = sql.length; i < len; i++) {
                        if (sql[i] instanceof Array) {
                            str = sql[i][0], arg = sql[i][1];
                        } else {
                            str = sql[i], arg = null;
                        }
                        tx.execute(str, arg);
                    }
                    tx.error(function(res) {
                        nError = res;
                    }).next(function(res) {
                        nRes = res;
                    });
                }).error(function(e) {
                    d.fail(e || nError);
                }).next(function() {
                    if (nError) {
                        d.fail(nError);
                    } else {
                        d.call(nRes);
                    }
                });
                return d;
            });
        }
    }

    Transaction = Database.Transaction = function(tx) {
        this.queue = [];
        this.tx = tx;
        return this;
    }

    Transaction.prototype = {
        commit: function(lock) {
            var d = new $D;
            this.chains(d, lock);
            return d;
        },
        chains: function(d, lock, okng, values) {
            if (this.queue.length == 0) return;

            var self = this;
            var que = this.queue.shift();
            if (que[0] == 'deferred') {
                if (lock && okng && (que[1] == 'next' || que[1] == 'error')) {
                    // next は非同期になってしまい Transaction できないため無理矢理...
                    if ((que[1] == 'next' && okng == 'ok') || (que[1] == 'error' && okng == 'ng')) {
                        try {
                            okng = 'ok';
                            values = que[2][0](values);
                            d = d.next(function() { return values });
                        } catch(e) {
                            okng = 'ng'
                            values = e;
                            d = d.error(function() { return values });
                        }
                    }
                    self.chains(d, lock, okng, values);
                } else {
                    d = d[que[1]].apply(d, que[2]);
                    while (this.queue.length && this.queue[0][0] == 'deferred') {
                        // 次も deferred ならここで繋げておかずに return を返すと進行してしまう
                        que = this.queue.shift();
                        d = d[que[1]].apply(d, que[2]);
                    }
                    return d;
                }
            } else if (que[0] == 'sql') {
                var sql = que[1], args = que[2];
                if (typeof sql == 'function') {
                    if (!self._lastResult) {
                        throw new Error('no last result');
                    } else {
                        sql = sql(self._lastResult);
                        if (sql instanceof Array) {
                            sql = sql[0], args = sql[1];
                        }
                    }
                }
                self.tx.executeSql(sql, args, function(_tx, res) {
                    self.tx = _tx;
                    self._lastResult = res;
                    self.chains(d, lock, 'ok', res);
                    if (Database.debugMessage) Database.debug(res, sql, args);
                    d.call(res);
                }, function(_tx, error) {
                    self.tx = _tx;
                    self._lastError = [error, sql, args];
                    self.chains(d, lock, 'ng', error);
                    if (Database.debugMessage) Database.debug(error, sql, args);
                    d.fail([error, sql, args]);
                });
                return d;
            }
        },
        /*
         * tx.execute('SELECT * from users').next(result) {
         * };
         * tx.execute('SELECT * from users').execute(function(result) {
         *     var name = result.rows.item(0).name;
         *     return ['SELECT * from users where name = ?', name];
         * });
         */
        execute: function(sql, args) {
            this.queue.push(['sql', sql, args]);
            return this;
        }
    };

    (function() {
        // for (var name in JSDeferred.prototype) {
        ['next', 'cancel', 'call', 'fail', 'error'].forEach(function(name) {
            var method = Deferred.prototype[name];
            if (typeof method == 'function' && typeof Transaction.prototype[name] == 'undefined') {
                Transaction.prototype[name] = function() {
                    this.queue.push(['deferred', name, Array.prototype.slice.call(arguments, 0)]);
                    return this;
                }
            }
        });
    })();

    /*-- include SQLAbstract --*/
    /* rev: 9a01158cc8454d80869fff950ff6caf760d8b546 */    
    (function(Global) {
        var p = function() {
            if (typeof console != 'undefined')
                console.log(Array.prototype.slice.call(arguments, 0));
        }
    
        var extend = function(to, from) {
            if (!from) return to;
            for (var key in from) {
                to[key] = from[key];
            }
            return to;
        }
    
        var SQLAbstract = Global.SQLAbstract = function(options) {
            this.options = extend({
            }, options);
            return this;
        }
    
        extend(SQLAbstract, {
            isString: function(obj) {
                return typeof obj === 'string' || obj instanceof String;
            },
            NOT_NULL: "0x01NOTNULL",
            NULL: null
        });
    
        SQLAbstract.prototype = {
            select: function(table, fields, where, options) {
                if (!fields) {
                    fields = '*';
                } else {
                    if (fields instanceof Array) {
                        var res = [];
                        for (var i = 0;  i < fields.length; i++) {
                            res.push(this.field(fields[i]));
                        }
                        fields = res.join(', ');
                    } else {
                        fields = this.field(fields);
                    }
                }
                var stmt, bind = [];
                stmt = 'SELECT ' + (fields || '*') + ' FROM ' + table;
                if (where) {
                    var wheres = this.where(where);
                    stmt += ' ' + wheres[0];
                    bind = wheres[1];
                }
                if (options) {
                    var opt = this.optionsToSQL(options);
                    stmt += opt[0];
                    bind = bind.concat(opt[1]);
                }
                return [stmt, bind];
            },
            field: function(obj) {
                if (SQLAbstract.isString(obj)) {
                    return obj;
                } else {
                    var res = [];
                    for (var key in obj) {
                        res.push('' + key + ' AS ' + obj[key]);
                    }
                    return res.join(', ');
                }
            },
            insert: function(table, data) {
                var keys = [], bind = [], values = [];
                for (var key in data) {
                    if (typeof data[key] != 'undefined') {
                        keys.push(key);
                        bind.push(data[key]);
                        values.push('?');
                    }
                }
                var stmt = 'INSERT INTO ' + table + ' (' + keys.join(', ') + ') VALUES (' + values.join(', ') + ')';
                return [stmt, bind];
            },
            update: function(table, data, where) {
                var wheres, keys = [], bind = [];
                if (where) wheres = this.where(where);
                for (var key in data) {
                    if (typeof data[key] != 'undefined') {
                        keys.push(key + ' = ?');
                        bind.push(data[key]);
                    }
                }
                var stmt = 'UPDATE ' + table + ' SET ' + keys.join(', ');
                if (wheres) {
                    stmt += ' ' + wheres[0];
                    bind = bind.concat(wheres[1]);
                }
                /* SQLite not support update limit/order ...
                if (options) {
                    var opt = this.optionsToSQL(options);
                    stmt += opt[0];
                    bind = bind.concat(opt[1]);
                }
                */
                return [stmt, bind];
            },
            deleteSql: function(table, where) {
                var wheres, bind = [];
                if (where) wheres = this.where(where);
                var stmt = 'DELETE FROM ' + table;
                if (wheres) {
                    stmt += ' ' + wheres[0];
                    bind = bind.concat(wheres[1]);
                }
                return [stmt, bind];
            },
            optionsToSQL: function(options) {
                var stmt = '', bind = [];
                if (options) {
                    if (options.order) {
                        stmt += ' ORDER BY ' + options.order;
                    }
                    if (options.group) {
                        stmt += ' GROUP BY ' + options.group;
                    }
                    if (typeof options.limit != 'undefined') {
                        stmt += ' LIMIT ?';
                        bind.push(parseInt(options.limit));
                    }
                    if (typeof options.offset != 'undefined') {
                        stmt += ' OFFSET ?';
                        bind.push(parseInt(options.offset));
                    }
                }
                return [stmt, bind];
            },
            create: function(table, fields, force) {
                var stmt = 'CREATE TABLE ' + (!force ? 'IF NOT EXISTS ' : '' ) + table + ' ';
                var bind = [];
                var values = [];
                for (var key in fields) {
                    bind.push(key + ' ' + fields[key]);
                }
                stmt += ' (' + bind.join(', ') + ')';
                // stmt += ' IF NOT EXISTS ' + table;
                return [stmt, []];
            },
            drop: function(table, force) {
                return ['DROP TABLE ' + (!force ? 'IF EXISTS ' : '' ) + table, []];
            },
            where: function(obj) {
                if (SQLAbstract.isString(obj)) {
                    return [obj, null];
                } else if (obj instanceof Array) {
                    if (obj[1] instanceof Array) {
                        return ['WHERE ' + obj[0], obj[1]];
                    } else if (SQLAbstract.isString(obj[1])) {
                        return ['WHERE ' + obj[0], obj.slice(1)];
                    } else {
                        var stmt = obj[0];
                        var hash = obj[1];
                        var re = /:(\w(:?[\w_]+)?)/g;
                        var bind = [];
    
                        stmt = stmt.replace(re, function(m) {
                            // var key = RegExp.$1;
                            var key = m.substring(1);
                            if (hash[key]) {
                                bind.push(hash[key]);
                            } else {
                                throw new Error('name not found: ' + key);
                            }
                            return '?';
                        });
                        return ['WHERE ' + stmt, bind];
                    }
                } else {
                    return this.whereHash(obj);
                }
            },
            whereHash: function(hash) {
                var stmt = [], bind = [];
                for (var key in hash) {
                    var val = hash[key];
                    if (val instanceof Array) {
                        // bind = bind.concat(val);
                        // var len = val.length;
                        var tmp = [];
                        var v;
                        while ((v = val.shift())) {
                            var t = this.holder(key, v);
                            bind = bind.concat(t[1]);
                            tmp.push(t[0]);
                        }
                        stmt.push('(' + tmp.join(' OR ') + ')');
                    } else {
                        var r = this.holder(key, val);
                        if (typeof r[1] != 'undefined')
                            bind = bind.concat(r[1]);
                        stmt.push(r[0]);
                    }
                }
                return ['WHERE ' + stmt.join(' AND '), bind];
            },
            holder: function(key, hash) {
                var stmt, bind;
                if (typeof hash == 'undefined') {
                    stmt = key + ' = ?';
                } else if (hash == null) {
                    stmt = key + ' IS NULL';
                } else if (hash == SQLAbstract.NOT_NULL) {
                    stmt = key + ' IS NOT NULL';
                } else if (SQLAbstract.isString(hash) || !isNaN(hash)) {
                    stmt = key + ' = ?';
                    bind = [hash];
                } else if (hash instanceof Array) {
                    throw new Error('holder error' + hash);
                } else {
                    var st = [], bind = [];
                    for (var cmp in hash) {
                        st.push(cmp);
                        bind.push(hash[cmp]);
                    }
                    if (st.length > 1) {
                        for (var i = 0, len = st.length;  i < len; i++) {
                            st[i] = '(' + key + ' ' + st[i] + ' ?)';
                        }
                        stmt = st.join(' OR ');
                    } else {
                        stmt = '' + key + ' ' + st[0] + ' ?';
                    }
                }
                return [stmt, bind];
            }
        }
    })(this);
    /*-- include SQLAbstract end --*/

    SQL = Database.SQL = SQLAbstract;

    Model = Database.Model = function(schema, db) {
        var klass = function(data, raw) {
            if (!data) data = {};
            this._klass = klass;
            this._data = {};
            this.setAttributes(data, raw);
            if (data._created) {
                this._created = data._created;
            }
            return this;
        };

        var sql = klass.sql = new SQL();
        klass.table = schema.table;
        klass._columnProxy = {};
        klass._db = db;

        extend(klass, {
            afterTrigger: function(name, func) {
                return Database.Util.afterTrigger(klass, name, func);
            },
            beforeTrigger: function(name, func) {
                return Database.Util.beforeTrigger(klass, name, func);
            },
            proxyColumns: function(hash) {
                for (var key in hash) {
                    if (klass.hasColumn(key)) {
                        var val = hash[key];
                        if (typeof val === 'string' || val instanceof String) {
                            if (Model.DEFAULT_PROXY_COLUMNS[val]) {
                                klass._columnProxy[key] = Model.DEFAULT_PROXY_COLUMNS[val];
                            } else {
                                throw new Error("Model.DEFAULT_PROXY_COLUMNS don't have " + val);
                            }
                        } else {
                            if (val.setter && val.getter) {
                                klass._columnProxy[key] = val;
                            } else {
                                throw new Error("required setter/getter: " + key);
                            }
                        }
                    }
                }
            },
            setColumns: function() {
                klass._columns = [];
                var f = klass._fields;
                for (var key in f) {
                    klass._columns.push(key);
                }
            },
            hasColumn: function(name) {
                return !!klass.fields[name];
            },
            defineGetterSetters: function() {
                for (var i = 0;  i < klass.columns.length; i++) {
                    klass.defineGetterSetter(klass.columns[i]);
                }
            },
            defineGetterSetter: function(key) {
                klass.prototype.__defineSetter__(key, function(value) {
                    this.setByProxy(key, value);
                });
                klass.prototype.__defineGetter__(key, function() {
                    return this.getByProxy(key);
                });
            },
            setPrimaryKeysHash: function() {
                klass.pKeyHash = {};
                for (var i = 0;  i < klass.primaryKeys.length; i++) {
                    var key = klass.primaryKeys[i];
                    klass.pKeyHash[key] = true;
                }
            },
            get columns() {
                return klass._columns;
            },
            set fields (fields) {
                klass._fields = fields;
                klass.setColumns();
            },
            get fields () {
                return klass._fields;
            },
            set primaryKeys (primaryKeys) {
                klass._primaryKeys = primaryKeys;
                klass.setPrimaryKeysHash();
            },
            get primaryKeys () {
                return klass._primaryKeys;
            },
            set database (newdb) {
                klass._db = newdb;
            },
            get database () {
                return klass._db;
            },
            initialize: function() {
                return klass.isTableCreated().next(function(res) {
                    if (res) {
                        return new $D;
                    } else {
                        return klass.createTable();
                    }
                });
            },
            __getInfo: function ( key ) {
                return ( klass._infoCache ? klass._infoCache[key] : void 0 );
            },
            isTableCreated: function() {
                if ( klass.__getInfo("name") ) {
                    return $D.next(function() {
                        return true;
                    });
                } else {
                    return klass.__updateInfo().next(function() {
                        return klass.__getInfo("name") ? true : false;
                    });
                }
            },
            execute: function(sql) {
                if (sql instanceof Array) {
                    return klass.database.execute(sql[0], sql[1]);
                } else {
                    throw new Error('klass execute required([stmt, bind])' + sql);
                }
            },
            find: function(options) {
                if (!options) options = {};
                var d = klass.execute(klass.select(options.fields, options.where, options));
                return d.next(function(res) {
                    return klass.resultSet(res, options.resultType);
                });
            },
            findFirst: function(options) {
                if (!options) options = {};
                options.limit = 1;
                var d = klass.execute(klass.select(options.fields, options.where, options));
                return d.next(function(res) {
                    if (!res) return;
                    var r = klass.resultSet(res);
                    return r[0];
                });
            },
            resultSet: function(res, type) {
                // default
                type = (type || '').toUpperCase();
                if (type == 'RAW') {
                    return res;
                } else if (type == 'ARRAY') {
                    return klass.resultSetArray(res);
                } else {
                    return klass.resultSetInstance(res);
                }
            },
            resultSetArray: function(res) {
                var result = [], rows = res.rows;
                var len = rows.length;
                for (var i = 0;  i < len; i++) {
                    result.push(rows.item(i));
                }
                return result;
            },
            resultSetInstance: function(res) {
                var result = [], rows = res.rows;
                var len = rows.length;
                for (var i = 0;  i < len; i++) {
                    var r = new klass(rows.item(i), true);
                    r._created = true;
                    result.push(r);
                }
                return result;
            },
            select: function(fields, where, options) {
                return sql.select(klass.table, fields, where, options);
            },
            deleteSql: function(where) {
                return sql.deleteSql(klass.table, where);
            },
            destroy: function(where) {
                if (!where) throw new Error('where args required');
                return klass.execute(sql.deleteSql(klass.table, where));
            },
            destroyAll: function() {
                return klass.execute(sql.deleteSql(klass.table));
            },
            createTable: function() {
                return klass.execute( sql.create(klass.table,klass.fields) )
                            .next( klass.__afterCreateTable );
            },
            __afterCreateTable: function(r) {
                if (!this._infoCache) {
                    return klass.__updateInfo().next($K(r));
                } else {
                    return $D.next($K(r));
                }
            },
            __updateInfo: function() {
                return klass.execute(sql.select('sqlite_master', '*', {
                    type: 'table',
                    name: klass.table
                })).next(function(res) {
                    if (res.rows && res.rows.length) {
                        var item = res.rows.item(0);
                        klass._infoCache = item;
                    }
                });
            },
            dropTable: function(force) {
                var d = klass.execute(sql.drop(klass.table, force));
                return d.next(klass.afterDropTable);
            },
            afterDropTable: function(res) {
                delete klass._infoCache;
                return res;
            },
            count: function(where) {
                return klass.execute(klass.select('count(*) AS total', where)).next(function(res) {
                    if (res.rows && res.rows.length) {
                        var item = res.rows.item(0);
                        return item.total;
                    }
                    return 0;
                });
            }
        });

        klass.prototype = {
            afterTrigger: function(name, func) {
                var orig = klass.prototype[name];
                klass.prototype[name] = function() {
                    var res = orig.apply(this, arguments);
                    if (res instanceof Deferred) {
                        return res.next(func);
                    } else {
                        func.apply(this, arguments);
                    }
                    return res;
                }
            },
            beforeTrigger: function(name, func) {
                var orig = klass.prototype[name];
                klass.prototype[name] = function() {
                    var res = func.apply(this, arguments);
                    if (res instanceof Deferred) {
                        return res.next(orig);
                    } else {
                        return orig.apply(this, arguments);
                    }
                }
            },
            setByProxy: function(key, value) {
                if (klass._columnProxy[key]) {
                    value = klass._columnProxy[key].setter(value);
                }
                this.set(key, value);
            },
            getByProxy: function(key) {
                var val = this.get(key);
                if (klass._columnProxy[key]) {
                    return klass._columnProxy[key].getter(val);
                } else {
                    return val;
                }
            },
            set: function(key, value) {
                this._data[key] = value;
            },
            get: function(key) {
                return this._data[key];
            },
            getFieldData: function() {
                var data = {};
                for (var i = 0;  i < klass.columns.length; i++) {
                    var key = klass.columns[i];
                    if (!klass.pKeyHash[key]) data[key] = this.get(key);
                }
                return data;
            },
            getPrimaryWhere: function() {
                var where = {};
                for (var i = 0;  i < klass.primaryKeys.length; i++) {
                    var key = klass.primaryKeys[i];
                    where[key] = this.get(key);
                    if (typeof where[key] == 'undefined') {
                        throw new Error('primary keys values is required.' +  key);
                    }
                }
                return where;
            },
            setAttributes: function(data, raw) {
                if (data) {
                    for (var i = 0;  i < klass.columns.length; i++) {
                        var key = klass.columns[i];
                        if (typeof data[key] != 'undefined') {
                            if (raw) {
                                this.set(key, data[key]);
                            } else {
                                this.setByProxy(key, data[key]);
                            }
                        }
                    }
                }
            },
            reload: function() {
            },
            _updateFromResult: function(res) {
                if (res.insertId && klass.primaryKeys.length == 1) {
                    this.set(klass.primaryKeys[0], res.insertId);
                    this._created = true;
                }
            },
            destroy: function() {
                if (!this._created) {
                    throw new Error('this row not created');
                }
                var self = this;
                if (klass.beforeDestoroy) klass.beforeDestoroy(self);

                var d = klass.execute(sql.deleteSql(klass.table, this.getPrimaryWhere()));
                return d.next(function(res) {
                    delete self._created;
                    if (klass.afterDestroy) klass.afterDestroy(self);
                    return self;
                });
            },
            save: function() {
                var d;
                var self = this;
                if (klass.beforeSave) klass.beforeSave(self);
                if (this._created) {
                    var data = this.getFieldData();
                    d = klass.execute(sql.update(klass.table, data, this.getPrimaryWhere()));
                } else {
                    var data = this.getFieldData();
                    d = klass.execute(sql.insert(klass.table, data));
                }
                return d.next(function(res) {
                    if (!self._created)
                        self._updateFromResult(res);
                    if (klass.afterSave) klass.afterSave(self);
                    return self;
                });
            },
            saveWithTransaction: function() {
                var self = this;
                var res = self.save();
                var d = klass.database.transaction(function() {
                    self.save().next();
                });
                d = d.next(function() {
                    return self;
                });
                return d;
            }
        }

        klass.fields = schema.fields;
        klass.primaryKeys = schema.primaryKeys;
        if (!schema.primaryKeys && !schema.primaryKeys.length) throw new Error('primaryKeys required.');
        if (!(schema.primaryKeys instanceof Array)) throw new Error('primaryKeys(Array) required.');

        klass.defineGetterSetters();

        return klass;
    }

    Model.DEFAULT_PROXY_COLUMNS = {
        Date: {
            getter: function(val) {
                if (typeof val == 'undefined') {
                    return;
                } else {
                    return new Date(val);
                }
            },
            setter: function(val) {
                return val.getTime();
            }
        },
        JSON: {
            getter: function(val) {
                if (typeof val == 'undefined') {
                    return;
                } else {
                    return JSON.parse(val);
                }
            },
            setter: function(val) {
                return JSON.stringify(val);
            }
        }
    };

})();

