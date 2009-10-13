
// utility
var p = function() {
    console.log(JSON.stringify(Array.prototype.slice.call(arguments, 0, arguments.length)));
}

var sprintf = function (str) {
    var args = Array.prototype.slice.call(arguments, 1);
    return str.replace(/%[sdf]/g, function(m) { return sprintf._SPRINTF_HASH[m](args.shift()) });
};

sprintf._SPRINTF_HASH = {
    '%s': String,
    '%d': parseInt,
    '%f': parseFloat,
};

var B_HOST = 'b.hatena.ne.jp';
var B_HTTP = 'http://' + B_HOST + '/';
var B_STATIC_HOST = 'b.st-hatena.com';
var B_STATIC_HTTP = 'http://' + B_STATIC_HOST + '/';
var B_API_STATIC_HOST = 'api.b.st-hatena.com';
var B_API_STATIC_HTTP = 'http://' + B_API_STATIC_HOST + '/';

var $K = function(i) { return function() { return i } };

if (typeof Deferred != 'undefined') {
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
    Deferred.debug = true;
}


if (typeof jQuery != 'undefined') {
    // setter/getter extend version
    jQuery.extend = jQuery.fn.extend = function() {
        // copy reference to target object
        var target = arguments[0] || {}, i = 1, length = arguments.length, deep = false, options;
    
        // Handle a deep copy situation
        if ( typeof target === "boolean" ) {
            deep = target;
            target = arguments[1] || {};
            // skip the boolean and the target
            i = 2;
        }
    
        // Handle case when target is a string or something (possible in deep copy)
        if ( typeof target !== "object" && !jQuery.isFunction(target) )
            target = {};
    
        // extend jQuery itself if only one argument is passed
        if ( length == i ) {
            target = this;
            --i;
        }
    
        for ( ; i < length; i++ )
            // Only deal with non-null/undefined values
            if ( (options = arguments[ i ]) != null )
                // Extend the base object
                for ( var name in options ) {
                    var getterFlag = false;
                    var src, copy;
                    if ( options.__lookupGetter__ &&  options.__lookupGetter__(name) !== undefined ) {
                        target.__defineGetter__(name, options.__lookupGetter__(name));
                        getterFlag = true;
                    } else {
                        copy = options[ name ];
                    }
    
                    // Prevent never-ending loop
                    if ( target === copy )
                        continue;
    
                    // Recurse if we're merging object values
                    if ( deep && !getterFlag && copy && typeof copy === "object" && !copy.nodeType ) {
                        src = target[ name ];
                        target[ name ] = jQuery.extend( deep, 
                            // Never move original objects, clone them
                            src || ( copy.length != null ? [ ] : { } )
                        , copy );
    
                    // Don't bring in undefined values
                    } else {
                        if ( options.__lookupSetter__ && options.__lookupSetter__(name) !== undefined ) {
                            target.__defineSetter__(name, options.__lookupSetter__(name));
                        }
                        if ( copy !== undefined && !getterFlag) {
                            target[ name ] = copy;
                        }
                    }
    
                }
    
        // Return the modified object
        return target;
    };
}

