
// consts
var GLOBAL = this;
var B_HOST = 'b.hatena.ne.jp';
var B_ORIGIN = 'https://' + B_HOST + '/';
var B_STATIC_HOST = 'cdn-ak.b.st-hatena.com';
var B_STATIC_ORIGIN = 'https://' + B_STATIC_HOST + '/';
var B_API_HOST = 'b.hatena.ne.jp';
var B_API_ORIGIN = 'https://' + B_API_HOST;

// utility
var p = function() {
    console.log(JSON.stringify(Array.prototype.slice.call(arguments, 0, arguments.length)));
}

var sprintf = function (str) {
    var args = Array.prototype.slice.call(arguments, 1);
    return str.replace(/%0(\d+)d/g, function(m, num) {
        var r = String(args.shift());
        var c = '';
        num = parseInt(num, 10) - r.length;
        while (--num >= 0) c += '0';
        return c + r;
    }).replace(/%[sdf]/g, function(m) { return sprintf._SPRINTF_HASH[m](args.shift()) });
};

sprintf._SPRINTF_HASH = {
    '%s': String,
    '%d': parseInt,
    '%f': parseFloat
};

var importFeature = function(source, names, target) {
    if (!target) target = GLOBAL;
    for (var i = 0;  i < names.length; i++) {
        var name = names[i];
        if (source[name]) {
            target[name] = source[name];
        } else {
            throw new Error('' + name + ' is not found');
        }
    }
}

var $K = function(i) { return function() { return i } };

var Utils = {
    truncate: function(str, size, suffix) {
        if (!str) str = '';
        if (!size) size = 32;
        if (!suffix) suffix = '...';
        var b = 0;
        for (var i = 0;  i < str.length; i++) {
            b += str.charCodeAt(i) <= 255 ? 1 : 2;
            if (b > size) {
                return str.substr(0, i) + suffix;
            }
        }
        return str;
    },
    isString: function(obj) {
        return typeof obj === 'string' || obj instanceof String;
    },
    strToDate: function(dateStr) {
        // dateStr // yyyymmddhhmmss
        return new Date(
            dateStr.substr(0,4),
            parseInt(dateStr.substr(4,2), 10) - 1,
            dateStr.substr(6,2),
            dateStr.substr(8,2),
            dateStr.substr(10,2),
            dateStr.substr(12,2)
        );
    },
    coolURL: function(url, len) {
        var u = url.
          replace(/^https?:\/\//, '').
          replace(/\.[^\/]+$/, '');
        return Utils.truncate(u, len || 40);
    },
    randomString: function(len) {
        var str = '01234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        var sLen = str.length;
        var res = '';
        for (var i = 0; i < len; i++) {
            res += str.charAt(Math.floor(Math.random() * sLen));
        }
        return res;
    },
    escapeHTML: function(str) {
        return str.replace(/&/g, '&amp;').
                   replace(/</g, '&lt;').
                   replace(/>/g, '&gt;');
    },
    countCommentToBytes: function(comment) {
        var bytes = 0;
        for (var i = 0;  i < comment.length; i++) {
            bytes += comment.charCodeAt(i) <= 255 ? 1 : 3;
        }
        return bytes;
    },
    ljust: function(str, len, char) {
        str = str.toString();
        char = char.toString();
        if (char.length == 0)
            char = '0';
        while (str.length < len) {
            str = char + str;
        }
        return str;
    },
    entryURL: function(url) {
        return B_ORIGIN + 'entry/' + url.replace('#', '%23');
    },
    entryImage: function(url) {
        return 'https://b.st-hatena.com/entry/image/' + url.replace('#', '%23');
    },
    faviconUrl: function(url) {
        return 'https://cdn-ak.favicon.st-hatena.com/?url=' + encodeURIComponent(url.replace('#', '%23'));
    },
    editBookmarkCurrent: function(winId) {
        chrome.tabs.query({ active: true, windowId: winId }, function(tabs) {
            var tab = tabs[0];
            chrome.extension.getBackgroundPage().Manager.editBookmarkTab(tab.id);
        });
    },
    createElementSimply: function(name, attr) {
        var children = Array.prototype.slice.call(arguments, 2);
        var e = document.createElement(name);
        if (attr)
            for (var key in attr)
                e[key] = attr[key];

        children.map(function(el) { return el.nodeType > 0 ? el : document.createTextNode(el) }).
            forEach(function(el) { return e.appendChild(el) });
        return e;
    },
    createElementFromString: function (str, opts) {
        // original code by cho45 - http://gist.github.com/3239
        if (!opts) opts = { data: {} };
        var document = opts.document || window.document;
        if (!opts.data) opts.data = { };
        var t, cur = opts.parent || document.createDocumentFragment(), root, stack = [cur];
        while (str.length) {
            if (str.indexOf("<") == 0) {
                if ((t = str.match(/^\s*<(\/?[^\s>\/]+)([^>]+?)?(\/)?>/))) {
                    var tag = t[1], attrs = t[2], isempty = !!t[3];
                    if (tag.indexOf("/") == -1) {
                        child = document.createElement(tag);
                        if (attrs) attrs.replace(/([a-z]+)=(?:'([^']+)'|"([^"]+)")/gi,
                            function (m, name, v1, v2) {
                                var v = text(v1 || v2);
                                if (name == "class") root && (root[v] = child), child.className = v;
                                child.setAttribute(name, v);
                            }
                        );
                        cur.appendChild(root ? child : (root = child));
                        if (!isempty) {
                            stack.push(cur);
                            cur = child;
                        }
                    } else cur = stack.pop();
                } else throw("Parse Error: " + str);
            } else {
                if ((t = str.match(/^([^<]+)/))) cur.appendChild(document.createTextNode(text(t[0])));
            }
            str = str.substring(t[0].length);
        }
        function text (str) {
            return str
                .replace(/&(#(x)?)?([^;]+);/g, function (_, isNumRef, isHex, ref) {
                    return isNumRef ? String.fromCharCode(parseInt(ref, isHex ? 16 : 10)):
                                      {"lt":"<","gt":"<","amp":"&"}[ref];
                })
                .replace(/#\{([^}]+)\}/g, function (_, name) {
                    return (typeof(opts.data[name]) == "undefined") ? _ : opts.data[name];
                });
        }
        return root;
    }
}

Utils.createElementSimply.t = function(text) { return document.createTextNode(text) }

if (typeof Deferred != 'undefined') {
    Deferred.onerror = function(e) { console.error(e);console.error(e.stack) };

    Deferred.retry = function(retryCount, funcDeffered/* funcDeffered() return Deferred */, options) {
        if (typeof retryCount == 'undefined')
            retryCount == 1;
        if (!options) options = {};

        var wait = options.wait || 0;
        var d = new Deferred();
        var retry = function() {
            var m = funcDeffered(retryCount);
            m.next(function(mes) {
                d.call(mes);
            }).error(function(e) {
                if (--retryCount <= 0) {
                    d.fail(['retry failed', e]);
                } else {
                    setTimeout(retry, wait * 1000);
                }
            });
        };
        setTimeout(retry, 0);
        return d;
    }
}

if (typeof jQuery != 'undefined') {
    /**
     * jQuery 1.3.2 の jQuery.extend を基に,
     * accessor property (setter / getter) も移動するように拡張したメソッド
     */
    jQuery.extendWithAccessorProperties = jQuery.fn.extendWithAccessorProperties = function() {
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

    jQuery.httpSuccess = function( xhr ) {
        try {
            // IE error sometimes returns 1223 when it should be 204 so treat it as success, see #1450
            return !xhr.status && (location.protocol == "file:" || location.protocol == "chrome-extension:") ||
                ( xhr.status >= 200 && xhr.status < 300 ) || xhr.status == 304 || xhr.status == 1223;
        } catch(e){}
        return false;
    };

}
