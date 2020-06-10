/* Ten */
if (typeof(Ten) == 'undefined') {

Ten = {};
Ten.NAME = 'Ten';
Ten.VERSION = 0.44;

/* Ten.Class */
Ten.Class = function(klass, prototype) {
    if (klass && klass.initialize) {
        var c = klass.initialize;
    } else if(klass && klass.base) {
        var c = function() { return klass.base[0].apply(this, arguments) };
    } else {
        var c = function() {};
    }
    c.prototype = prototype || {};
    c.prototype.constructor = c;
    Ten.Class.inherit(c, klass);
    if (klass && klass.base) {
        for (var i = 0;  i < klass.base.length; i++) {
            var parent = klass.base[i];
            if (i == 0) {
                c.SUPER = parent;
                c.prototype.SUPER = parent.prototype;
            }
            Ten.Class.inherit(c, parent);
            Ten.Class.inherit(c.prototype, parent.prototype);
        }
    }
    return c;
}
Ten.Class.inherit = function(child,parent) {
    for (var prop in parent) {
        if (typeof(child[prop]) != 'undefined' || prop == 'initialize') continue;
        child[prop] = parent[prop];
    }
}

/*
// Basic Ten Classes
*/

/* Ten.Function */
Ten.Function = {
    bind: function(f,o) {
        return function() {
            return f.apply(o, arguments);
        }
    },
    method: function(obj, method) {
        return Ten.Function.bind(obj[method], obj);
    }
};

/* Ten.Array */
Ten.Array = {
    flatten: function(arr) {
        var ret = [];
        (function(arr) {
            for (var i = 0; i < arr.length; i++) {
                var o = arr[i];
                if (Ten.Array.isArray(o)) {
                    arguments.callee(o);
                } else {
                    ret.push(o);
                }
            }
        })(arr);
        return ret;
    },
    dup: function(arr) {
        var res = [];
        for (var i = 0; i < arr.length; i++) {
            res[i] = arr[i];
        }
        return res;
    },
    indexOf: function(arr,e) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] == e) return i;
        }
        return -1;
    },
    isArray: function(o) {
        return (o instanceof Array ||
                (o && typeof(o.length) === 'number' && typeof(o) != 'string' && !o.nodeType));
    },
    find: function (arr, cond) {
        var code = (cond instanceof Function) ? cond : function (v) {
            return v == cond;
        };
        var arrL = arr.length;
        for (var i = 0; i < arrL; i++) {
            if (code(arr[i])) {
                return arr[i];
            }
        }
        return undefined; // not null
    },
    forEach: function (arraylike, code) {
        var length = arraylike.length;
        for (var i = 0; i < length; i++) {
            var r = code(arraylike[i]);
            if (r && r.stop) return r.returnValue;
        }
        return null;
    }
};

/* Ten.JSONP */
Ten.JSONP = new Ten.Class({
    initialize: function(uri,obj,method) {
        if (Ten.JSONP.Callbacks.length) {
            setTimeout(function() {new Ten.JSONP(uri,obj,method)}, 500);
            return;
        }
        var del = uri.match(/\?/) ? '&' : '?';
        uri += del + 'callback=Ten.JSONP.callback';
        if (!uri.match(/timestamp=/)) {
            uri += '&' + encodeURI(new Date());
        }
        if (typeof(obj) == 'function' && typeof(method) == 'undefined') {
            obj = {callback: obj};
            method = 'callback';
        }
        if (obj && method) Ten.JSONP.addCallback(obj,method);
        this.script = document.createElement('script');
        this.script.src = uri;
        this.script.type = 'text/javascript';
        this.script.onerror = function () {Ten.JSONP.Callbacks = [];};
        document.getElementsByTagName('head')[0].appendChild(this.script);
    },
    addCallback: function(obj,method) {
        Ten.JSONP.Callbacks.push({object: obj, method: method});
    },
    callback: function(args) {
        // alert('callback called');
        var cbs = Ten.JSONP.Callbacks;
        for (var i = 0; i < cbs.length; i++) {
            var cb = cbs[i];
            cb.object[cb.method].call(cb.object, args);
        }
        Ten.JSONP.Callbacks = [];
    },
    MaxBytes: 1800,
    Callbacks: []
});

/* Ten.XHR */
Ten.XHR = new Ten.Class({
    initialize: function(uri,opts,obj,callPropertyName) {
        Ten.EventDispatcher.implementEventDispatcher(this);
        this.method = 'GET';

        if (!uri) return;

        if (!Ten.XHR.isSafeUri(uri)) {
            throw "host differs : " + uri;
        }

        if (!opts) opts = {};

        if (opts.method) 
            this.method = opts.method;

        var self = this;
        this.addEventListener('complete', function() {
            if (!obj) return;
            if (typeof(obj) == 'function' && typeof(callPropertyName) == 'undefined') {
                obj.call(obj, self.request);
            } else {
                obj[callPropertyName].call(obj, self.request);
            }
        });

        this.load(uri, opts.data);
    },
    getXMLHttpRequest: function() {
        var xhr;
        var tryThese = [
            function () { return new XMLHttpRequest(); },
            function () { return new ActiveXObject('Msxml2.XMLHTTP'); },
            function () { return new ActiveXObject('Microsoft.XMLHTTP'); },
            function () { return new ActiveXObject('Msxml2.XMLHTTP.4.0'); }
        ];
        for (var i = 0; i < tryThese.length; i++) {
            var func = tryThese[i];
            try {
                xhr = func;
                return func();
            } catch (e) {
                //alert(e);
            }
        }
        return xhr;
    },
    isSafeUri: function(uri) {
        if (uri.match(/^\w+:/) || uri.match(/^\/\//)) {
            if (uri.split('/')[2] == location.host) return true;
            else return false;
        } else if (uri.match(/^\/[^\/]/) || uri == '/') {
            return true;
        } else if (!uri || uri.length == 0) {
            return false;
        }
        return true;
    },
    makePostData: function(data) {
        var regexp = /%20/g;
        if (typeof data == 'string' || (data instanceof String)) {
            return encodeURIComponent(data).replace(regexp, '+');
        }
        var pairs = [];
        for (var k in data) {
            if (typeof data[k] == 'undefined') continue;
            var prefix = encodeURIComponent(k).replace(regexp, '+') + '=';
            var values = Array.prototype.concat(data[k]);
            for (var i = 0; i < values.length; i++) {
                var pair = prefix + encodeURIComponent(values[i]).replace(regexp, '+');
                pairs.push(pair);
            }
        }
        return pairs.join('&');
    }
},{
    load: function(url, params) {
        var req = Ten.XHR.getXMLHttpRequest();
        this.request = req;

        var self = this;
        req.onreadystatechange = function() {
            self.stateChangeHandler.call(self, req);
        };
        params = params ? Ten.XHR.makePostData(params) : null;

        req.open(this.method, url, true);
        if (this.method == 'POST') 
            req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        req.send(params);
    },
    stateChangeHandler: function(req) {
        this.dispatchEvent('state_change');

        if (req.readyState == 4) {
            this.dispatchEvent('ready', req.status.toString());

            if (req.status >= 200 && req.status < 300) {
                this.dispatchEvent('complete', req);
            } else {
                this.dispatchEvent('error', req);
            }
        }
    }
});



/* Ten.Observer */
Ten.Observer = new Ten.Class({
    initialize: function(element,event,obj,method) {
        var func = obj;
        if (typeof(method) == 'string') {
            func = obj[method];
        }
        this.element = element;
        this.event = event;
        this.listener = function(event) {
            return func.call(obj, new Ten.Event(event || window.event));
        }
        this.start();
    }
},{
    stop: function() {
        if (this.element.removeEventListener) {
            this.element.removeEventListener(this.event,this.listener,false);
        } else if (this.element.detachEvent) {
            this.element.detachEvent(this.event,this.listener);
        }
    },
    start: function() {
        if (this.element.addEventListener) {
            if (this.event.indexOf('on') == 0) {
                this.event = this.event.substr(2);
            }
            this.element.addEventListener(this.event, this.listener, false);
        } else if (this.element.attachEvent) {
            this.element.attachEvent(this.event, this.listener);
        }
    }
});

/* Ten.Event */
Ten.Event = new Ten.Class({
    initialize: function(e) {
        this.event = e;
        if (e) {
            this.target = e.target || e.srcElement;
            this.shiftKey = e.shiftKey;
            this.ctrlKey = e.ctrlKey;
            this.altKey = e.altKey;
        }
    },
    KeyMap: {
        8:"backspace", 9:"tab", 13:"enter", 19:"pause", 27:"escape", 32:"space",
        33:"pageup", 34:"pagedown", 35:"end", 36:"home", 37:"left", 38:"up",
        39:"right", 40:"down", 44:"printscreen", 45:"insert", 46:"delete",
        112:"f1", 113:"f2", 114:"f3", 115:"f4", 116:"f5", 117:"f6", 118:"f7",
        119:"f8", 120:"f9", 121:"f10", 122:"f11", 123:"f12",
        144:"numlock", 145:"scrolllock"
    }
},{
    mousePosition: function() {
        if (!this.event.clientX) return null;
        return Ten.Geometry.getMousePosition(this.event);
    },
    isKey: function(name) {
        var ecode = this.event.keyCode;
        if (!ecode) return false;
        var ename = Ten.Event.KeyMap[ecode];
        if (!ename) return false;
        return (ename == name);
    },
    targetIsFormElements: function() {
        if (!this.target) return false;
        var T = (this.target.tagName || '').toUpperCase();
        return (T == 'INPUT' || T == 'SELECT' || T == 'OPTION' ||
                T == 'BUTTON' || T == 'TEXTAREA');
    },
    stop: function() {
        var e = this.event;
        if (e.stopPropagation) {
            e.stopPropagation();
            e.preventDefault();
        } else {
            e.cancelBubble = true;
            e.returnValue = false;
        }
    },
    preventDefault: function () {
        var e = this.event;
        if (e.preventDefault) e.preventDefault();
        e.returnValue = false;
        this._isDefaultPrevented = true;
    },
    isDefaultPrevented: function () {
        return this._isDefaultPrevented || this.event.defaultPrevented || (this.event.returnValue === false);
    }
});

/* Ten.EventDispatcher */
Ten.EventDispatcher = new Ten.Class({
    initialize: function() {
        this._eventListeners = {};
    }, 
    implementEventDispatcher: function(obj) {
        Ten.Class.inherit(obj, Ten.EventDispatcher.prototype);
        obj._eventListeners = {};
    }
}, {
    hasEventListener: function(type) {
        return (this._eventListeners[type] instanceof Array && this._eventListeners[type].length > 0);
    },
    addEventListener: function(type, listener) {
        if (!this.hasEventListener(type)) {
            this._eventListeners[type] = [];
        }
        var listeners = this._eventListeners[type];
        for (var i = 0;  i < listeners.length; i++) {
            if (listeners[i] == listener) {
                return;
            }
        }
        listeners.push(listener);
    },
    removeEventListener: function(type, listener) {
        if (this.hasEventListener(type)) {
            var listeners = this._eventListeners[type];
            for (var i = 0;  i < listeners.length; i++) {
                if (listeners[i] == listener) {
                    listeners.splice(i, 1);
                    return;
                }
            }
        }
    },
    dispatchEvent: function(type, opt) {
        if (!this.hasEventListener(type)) return false;
        var listeners = this._eventListeners[type];
        for (var i = 0;  i < listeners.length; i++) {
            listeners[i].call(this, opt);
        }
        return true; // preventDefault is not implemented
    }
});

/* Ten.DOM */
Ten.DOM = new Ten.Class({
    createElementFromString : function (str, opts) {
        if (!opts) opts = { data: {} };
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
    },

    getElementsByTagAndClassName: function(tagName, className, parent) {
        if (typeof(parent) == 'undefined') parent = document;
        if (!tagName) return Ten.DOM.getElementsByClassName(className, parent);
        var children = parent.getElementsByTagName(tagName);
        if (className) { 
            var elements = [];
            for (var i = 0; i < children.length; i++) {
                var child = children[i];
                if (Ten.DOM.hasClassName(child, className)) {
                    elements.push(child);
                }
            }
            return elements;
        } else {
            return children;
        }
    },
    getElementsByClassName: function(className, parent) {
        if (typeof(parent) == 'undefined') parent = document;
        var ret = [];
        if (parent.getElementsByClassName) {
            var nodes =  parent.getElementsByClassName(className);
            for (var i = 0 , len = nodes.length ; i < len ; i++ ) ret.push(nodes.item(i));
            return ret;
        } else {
            if (!className) return ret;
            (function(parent) {
                var elems = parent.childNodes;
                for (var i = 0; i < elems.length; i++) {
                    var e = elems[i];
                    if (Ten.DOM.hasClassName(e, className)) {
                        ret.push(e);
                    }
                    arguments.callee(e);
                }
            })(parent);
            ret = Ten.Array.flatten(ret);
            return ret;
        }
    },
    hasClassName: function(element, className) {
        if (!element || !className) return false;
        var cname = element.className;
        if (!cname) return false;
        cname = ' ' + cname.toLowerCase() + ' ';
        cname = cname.replace(/[\n\r\t]/g, ' ');
        className = ' ' + className.toLowerCase() + ' ';
        return (cname.indexOf(className) != -1);
    },
    addClassName: function(element, className) {
        if (Ten.DOM.hasClassName(element, className)) return;
        var c = element.className || '';
        c = c.length ? c + " " + className : className;
        element.className = c;
    },
    removeClassName: function(element, className) {
        if (!Ten.DOM.hasClassName(element, className)) return;
        var c = element.className;
        var classes = c.split(/\s+/);
        for (var i = 0; i < classes.length; i++) {
            if (classes[i] == className) {
                classes.splice(i,1);
                break;
            }
        }
        element.className = classes.join(' ');
    },
    removeEmptyTextNodes: function(element) {
        var nodes = element.childNodes;
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (node.nodeType == 3 && !/\S/.test(node.nodeValue)) {
                node.parentNode.removeChild(node);
            }
        }
    },
    nextElement: function(elem) {
        do {
            elem = elem.nextSibling;
        } while (elem && elem.nodeType != 1);
        return elem;
    },
    prevElement: function(elem) {
        do {
            elem = elem.previousSibling;
        } while (elem && elem.nodeType != 1);
        return elem;
    },
    nextSiblingInSource: function(elem) {
        if (elem.childNodes && elem.childNodes.length) {
            return elem.childNodes[0];
        } else if (elem.nextSibling) {
            return elem.nextSibling;
        } else if (elem.parentNode && elem.parentNode.nextSibling) {
            return elem.parentNode.nextSibling;
        }
        return null;
    },
    firstElementChild: function (node) {
        var el = node.firstElementChild || node.firstChild;
        while (el && el.nodeType != 1) {
            el = el.nextSibling;
        }
        return el;
    },
    getElementSetByClassNames: function (map, container) {
        var elements = {root: []};

        if (map.root) {
            if (map.root instanceof Array) {
                elements.root = map.root;
            } else {
                if (Ten.DOM.hasClassName(container, map.root)) {
                    elements.root = [container];
                } else {
                    elements.root = Ten.DOM.getElementsByClassName(map.root, container);
                }
            }
            delete map.root;
        }

        var root = elements.root[0] || container || document.body || document.documentElement || document;
        for (var n in map) {
            if (map[n] instanceof Array) {
                elements[n] = map[n];
            } else if (map[n]) {
                elements[n] = Ten.DOM.getElementsByClassName(map[n], root);
            }
        }

        return elements;
    },
    getAncestorByClassName: function (className, node) {
        while (node != null) {
            node = node.parentNode;
            if (Ten.DOM.hasClassName(node, className)) {
                return node;
            }
        }
        return null;
    },
    someParentNode: function(el, func) {
        if (el.parentNode) {
            if (func(el.parentNode)) {
                return true;
            } else {
                return Ten.DOM.someParentNode(el.parentNode, func);
            }
        } else {
            return false;
        }
    },
    insertBefore: function(node, ref) {
        ref.parentNode.insertBefore(node, ref);
    },
    insertAfter: function(node, ref) {
        if (ref.nextSibling) {
            ref.parentNode.insertBefore(node, ref.nextSibling);
        } else {
            ref.parentNode.appendChild(node);
        }
    },
    unshiftChild: function(elem, child) {
        if (elem.firstChild) {
            elem.insertBefore(child, elem.firstChild);
        } else {
            elem.appendChild(child);
        }
    },
    replaceNode: function(newNode, oldNode) {
        var parent = oldNode.parentNode;
        if (newNode && parent && parent.nodeType == 1) {
            parent.insertBefore(newNode, oldNode);
            parent.removeChild(oldNode);
        }
    },
    removeElement: function(elem) {
        if (!elem.parentNode) return;
        elem.parentNode.removeChild(elem);
    },
    removeAllChildren: function(node) {
        while (node.firstChild)
            node.removeChild(node.firstChild);
    },
    scrapeText: function(node) {
        if (typeof node.textContent == 'string') return node.textContent;
        if (typeof node.innerText == 'string') return node.innerText;
        var rval = [];
        (function (node) {
            var cn = node.childNodes;
            if (cn) {
                for (var i = 0; i < cn.length; i++) {
                    arguments.callee.call(this, cn[i]);
                }
            }
            var nodeValue = node.nodeValue;
            if (typeof(nodeValue) == 'string') {
                rval.push(nodeValue);
            }
        })(node);
        return rval.join('');
    },
    getSelectedText: function() {
        if (window.getSelection)
            return '' + (window.getSelection() || '');
        else if (document.getSelection)
            return document.getSelection();
        else if (document.selection)
            return document.selection.createRange().text;
        else
            return '';
    },
    clearSelection: function() {
        if (window.getSelection) {
            window.getSelection().collapse(document.body, 0);
        } else if (document.getSelection) {
            document.getSelection().collapse(document.body, 0);
        } else {
            var selection = document.selection.createRange();
            selection.setEndPoint("EndToStart", selection);
            selection.select();
        }
    },
    show: function(elem) {
        elem.style.display = 'block';
    },
    hide: function(elem) {
        elem.style.display = 'none';
    },
    addObserver: function() {
        var c = Ten.DOM;
        if (c.observer || c.loaded) return;
        c.observer = new Ten.Observer(window,'onload',c,'finishLoad');
        var ua = navigator.userAgent.toUpperCase();
        if (window.opera || ua.indexOf('FIREFOX') >= 0) {
            new Ten.Observer(window,'DOMContentLoaded',c,'finishLoad');
        } else if ((ua.indexOf('MSIE') >= 0 || ua.toLowerCase().indexOf('webkit') >= 0) && window == top) {
            var i = 0;
            (function() {
                if (i++ > 10000) return null;
                try {
                    if (document.readyState != 'loaded' &&
                        document.readyState != 'complete') {
                            document.documentElement.doScroll('left');
                        }
                } catch(error) {
                    return setTimeout(arguments.callee, 13);
                }
                return c.finishLoad();
            })();
        }
    },
    finishLoad: function() {
        var c = Ten.DOM;
        if (!c.loaded) {
            c.dispatchEvent('DOMContentLoaded');
            c.dispatchEvent('onload'); // for backward compatibility
            c.loaded = true;
            c.observer.stop();
            c.observer = null;
        }
    },
    observer: null,
    loaded: false
});
Ten.EventDispatcher.implementEventDispatcher(Ten.DOM);
Ten.DOM.addObserver();

/* Ten.Element */
Ten.Element = new Ten.Class({
    initialize: function(tagName, attributes) {
        var elem = document.createElement(tagName);
        for (var a in attributes) {
            if (a == 'style') {
                Ten.Style.applyStyle(elem, attributes[a])
            } else if (a == 'value' && tagName.toLowerCase() == 'input') {
                elem.setAttribute('value', attributes[a]);
            } else if (a.indexOf('on') == 0) {
                new Ten.Observer(elem, a, attributes[a]);
            } else {
                elem[a] = attributes[a];
            }
        }
        var children = Array.prototype.slice.call(arguments, 2);
        for (var i = 0; i < children.length; i++) {
            var child = children[i];
            if (typeof child == 'string')
                child = document.createTextNode(child);
            if (!child)
                continue;
            elem.appendChild(child);
        }
        Ten.Element.dispatchEvent('create',elem);
        return elem;
   }
});
Ten.EventDispatcher.implementEventDispatcher(Ten.Element);

/* Ten.Cookie */
Ten.Cookie = new Ten.Class({
    initialize: function(string) {
        this.cookies = this.constructor.parse(string);
    },
    parse: function(string) {
        var cookies = { };

        var segments = (string || document.cookie).split(/;\s*/);
        while (segments.length) {
            try {
                var segment = segments.shift().replace(/^\s*|\s*$/g, '');
                if (!segment.match(/^([^=]*)=(.*)$/))
                    continue;
                var key = RegExp.$1, value = RegExp.$2;
                if (value.indexOf('&') != -1) {
                    value = value.split(/&/);
                    for (var i = 0; i < value.length; i++)
                        value[i] = decodeURIComponent(value[i]);
                } else {
                    value = decodeURIComponent(value);
                }
                key = decodeURIComponent(key);

                cookies[key] = value;
            } catch (e) {
            }
        }

        return cookies;
    }
}, {
    set: function(key, value, option) {
        this.cookies[key] = value;

        if (value instanceof Array) {
            for (var i = 0; i < value.length; i++)
                value[i] = encodeURIComponent(value[i]);
            value = value.join('&');
        } else {
            value = encodeURIComponent(value);
        }
        var cookie = encodeURIComponent(key) + '=' + value;

        option = option || { };
        if (typeof option == 'string' || option instanceof Date) {
            // deprecated
            option = {
                expires: option
            };
        }

        if (!option.expires) {
            option.expires = this.defaultExpires;
        }
        if (/^\+?(\d+)([ymdh])$/.exec(option.expires)) {
            var count = parseInt(RegExp.$1);
            var field = ({ y: 'FullYear', m: 'Month', d: 'Date', h: 'Hours' })[RegExp.$2];

            var date = new Date;
            date['set' + field](date['get' + field]() + count);
            option.expires = date;
        }

        if (option.expires) {
            if (option.expires.toUTCString)
                option.expires = option.expires.toUTCString();
            cookie += '; expires=' + option.expires;
        }
        if (option.domain) {
            cookie += '; domain=' + option.domain;
        }
        if (option.path) {
            cookie += '; path=' + option.path;
        } else {
            cookie += '; path=/';
        }

        return document.cookie = cookie;
    },
    get: function(key) {
        return this.cookies[key];
    },
    has: function(key) {
        return (key in this.cookies) && !(key in Object.prototype);
    },
    clear: function(key) {
        this.set(key, '', new Date(0));
        delete this.cookies[key];
    }
});

/* Ten.Selector */
Ten.Selector = new Ten.Class({
    initialize: function(selector) {
        this.selectorText = selector;
        var sels = selector.split(/\s+/);
        var child = null;
        var separator = null;
        for (var i = sels.length - 1; i >= 0; i--) {
            if (sels[i] == '>') {
                continue;
            } else if ((i > 0) && sels[i-1] == '>') {
                separator = sels[i-1];
            }
            var opt = separator ? {separator: separator} : null;
            separator = null;
            var node = new Ten.SelectorNode(sels[i],child,opt);
            child = node;
        }
        this.childNode = child;
    },
    getElementsBySelector: function(selector, parent) {
        var sels = selector.split(/\s*,\s*/);
        var ret = [];
        for (var i = 0; i < sels.length; i++) {
            var sel = new Ten.Selector(sels[i]);
            ret = ret.concat(sel.getElements(parent));
        }
        ret = Ten.Array.flatten(ret);
        return ret;
    }
},{
    getElements: function(parent) {
        if (typeof(parent) == 'undefined') {
            parent = document;
        }
        return this.childNode.getElements(parent);
    }
});

/* Ten.SelectorNode */
Ten.SelectorNode = new Ten.Class({
    initialize: function(selector, child, opt) {
        if (selector) {
            selector = selector.replace(/\s/g,'');
        }
        this.option = opt;
        this.selectorText = selector;
        this.childNode = child;
        this.parseSelector();
    }
},{
    getElementsBySelector: null, // will be overridden by parser
    parseSelector: function() {
        var f = 'getElementsBySelector';
        var t = this.selectorText;
        var match;
        if ((match = t.match(/^(.+)\:([\w\-+()]+)$/))) {
            t = match[1];
            this.pseudoClass = match[2];
        }
        if (t.match(/^[\w-]+$/)) {
            this[f] = function(parent) {
                return parent.getElementsByTagName(t);
            };
        } else if ((match = t.match(/^([\w-]+)?#([\w-]+)$/))) {
            var tname = match[1];
            var idname = match[2];
            this[f] = function(parent) {
                var e = document.getElementById(idname);
                if (!tname ||
                    e.tagName.toLowerCase() == tname.toLowerCase()) {
                        return [e];
                    } else {
                        return [];
                    }
            };
        } else if ((match = t.match(/^([\w-]+)?\.([\w-]+)/))) {
            var tname = match[1];
            var cname = match[2];
            this[f] = function(parent) {
                return Ten.DOM.getElementsByTagAndClassName(tname,cname,parent);
            };
        }
        if (this.option && this.option.separator) this.parseSeparator();
        if (this.pseudoClass) this.parsePseudoClass();
    },
    parsePseudoClass: function() {
        if (!this.pseudoClass) return;
        var pseudo = this.pseudoClass;
        var f = 'getElementsBySelector';
        var func = this[f];
        var match;
        if ((match = pseudo.match(/^(.+)-child(\((\d+)\))?$/))) {
            var type = match[1];
            var n = match[3];
            var index;
            if (type == 'first') {
                index = 0;
            } else if (type == 'last') {
                index = -1;
            } else if (type == 'nth' && n) {
                index = n - 1;
            }
            if (typeof index == 'number') {
                this[f] = function(parent) {
                    var elems = func(parent);
                    if (index < 0) index = elems.length + index;
                    if (elems[index]) {
                        return [elems[index]];
                    } else {
                        return [];
                    }
                }
            }
        } else if ((match = pseudo.match(/^nth-child\((\d+)n\+(\d+)\)$/))) {
            var a = new Number(match[1]);
            var b = new Number(match[2]);
            this[f] = function(parent) {
                var elems = func(parent);
                var ret = [];
                for (var n = 0; n < 1000; n++) {
                    var i = a * n + b - 1;
                    if (i < 0) continue;
                    if (typeof elems[i] == 'undefined') break;
                    ret.push(elems[i]);
                }
                return ret;
            };
        }
    },
    parseSeparator: function() {
        if (!this.option) return;
        var sep = this.option.separator;
        if (!sep) return;
        var f = 'getElementsBySelector';
        var func = this[f];
        if (sep == '>') {
            this[f] = function(parent) {
                var elems = func(parent);
                var ret = [];
                for (var i = 0; i < elems.length; i++) {
                    if (elems[i].parentNode == parent) ret.push(elems[i]);
                }
                return ret;
            }
        }
    },
    getElements: function(parent) {
        if (typeof this.getElementsBySelector != 'function') return null;
        var ret = [];
        var elems = this.getElementsBySelector(parent);
        if (elems && this.childNode) {
            for (var i = 0; i < elems.length; i++) {
                ret.push(this.childNode.getElements(elems[i]));
            }
            return ret;
        } else {
            return elems;
        }
    }
});

/* Ten._Selector */
Ten._Selector = new Ten.Class({
    base : [Ten.Selector],
    initialize: function(selector) {
        this.selectorText = selector;
        var sels = selector.split(/\s+/);
        var child = null;
        var separator = null;
        for (var i = sels.length - 1; i >= 0; i--) {
            if (sels[i] == '>') {
                continue;
            } else if ((i > 0) && sels[i-1] == '>') {
                separator = sels[i-1];
            }
            var opt = separator ? {separator: separator} : null;
            separator = null;
            var node = new Ten._SelectorNode(sels[i],child,opt);
            child = node;
        }
        this.childNode = child;
    },
    getElementsBySelector: function(selector, parent) {
        var sels = selector.split(/\s*,\s*/);
        var ret = [];
        for (var i = 0; i < sels.length; i++) {
            var sel = new Ten._Selector(sels[i]);
            ret = ret.concat(sel.getElements(parent));
        }
        ret = Ten._Selector._elementArrayFlatten(ret);
        if (selector.indexOf(',') >= 0) ret.sort(Ten._Selector._sortByElementOrder);
        return ret;
    },
    _sortByElementOrder: function(a, b) {
        var depthA = Ten._Selector._getNodeDepth(a);
        var depthB = Ten._Selector._getNodeDepth(b);
        if (depthA > depthB) for (var i = 0; i < (depthA - depthB) ; i++ ) a = a.parentNode;
        else if (depthA < depthB) for (var i = 0; i < (depthB - depthA) ; i++ ) b = b.parentNode;
        return Ten._Selector._getSiblingDepth(b) - Ten._Selector._getSiblingDepth(a);
    },
    _getNodeDepth: function(elem) {
        var i = 0;
        for (var n = elem ; n ; n = n.parentNode, i++){}
        return i;
    },
    _getSiblingDepth: function(elem) {
        var i = 0;
        for (var n = elem; n ; n = n.nextSibling, i++){}
        return i;
    },
    _elementArrayFlatten : function(arr) {
        var ret = [];
        (function(arr) {
            for (var i = 0; i < arr.length; i++) {
                var o = arr[i];
                if ((o && o instanceof Array) ||
                    (o && typeof(o.length) === 'number' 
                       && typeof(o) != 'string'
                       && !o.tagName)){
                    arguments.callee(o);
                } else {
                    ret.push(o);
                }
            }
        })(arr);
        return ret;
    }
},{
});

/* Ten._SelectorNode */
Ten._SelectorNode = new Ten.Class({
    base : [Ten.SelectorNode]
},{
    parsePseudoClass: function() {
        if (!this.pseudoClass) return;
        var pseudo = this.pseudoClass;
        var f = 'getElementsBySelector';
        var func = this[f];
        var match;
        if ((match = pseudo.match(/^(.+)-child(\((\d+)\))?$/))) {
            var type = match[1];
            var n = match[3];
            var index;
            if (type == 'first') {
                index = 0;
            } else if (type == 'last') {
                index = -1;
            } else if (type == 'nth' && n) {
                index = n - 1;
            }
            if (typeof index == 'number') {
                this[f] = function(parent) {
                    var elems = func(parent);
                    var ret = [];
                    for (var i = 0, len = elems.length ; i < len ; i++ ) {
                        var children =  elems[i].parentNode.childNodes;
                        if((index >= 0 && children[index] == elems[i]) 
                            || (index < 0 && children[children.length - 1] == elems[i]))
                                 ret.push(elems[i]);
                    }
                    return ret;
                }
            }
        } else if ((match = pseudo.match(/^nth-child\((\d+)n\+(\d+)\)$/))) {
            var a = new Number(match[1]);
            var b = new Number(match[2]);
            this[f] = function(parent) {
                var elems = func(parent);
                var tagName = elems[0].tagName;
                var parents = [];
                var checkArray = function (array , e) {
                    for (var i = 0 , len = array.length; i < len ; i++) {
                        if (array[i] == e) return;
                    }
                    array.push(e);
                }
                for (var i = 0, len = elems.length ; i < len ; i++ ){
                   checkArray(parents, elems[i].parentNode); 
                }
                var ret = [];
                for (var j = 0, len = parents.length ; j < len ; j++) {
                    var children = parents[j].childNodes;
                    for (var n = 0; n < children.length; n++) {
                        var i = a * n + b - 1;
                        if (i < 0) continue;
                        if (children[i] && children[i].tagName == tagName) ret.push(children[i]);
                    }
                }
                return ret;
            };
        }
    }
});

/* Ten.querySelector */
if (document.querySelector) {
    Ten.querySelector = function (selector, elem) {
        if (elem) return (elem.querySelector) ? elem.querySelector(selector) : null;
        return document.querySelector(selector);
    }
} else {
    Ten.querySelector = function (selector, elem) {
        return Ten._Selector.getElementsBySelector(selector, elem)[0] || null;
    }
}

if (document.querySelectorAll) {
    Ten.querySelectorAll = function (selector, elem) {
        var elems ;
        try {
            if (elem) elems = (elem.querySelectorAll) ? elem.querySelectorAll(selector) : [];
            else  elems = document.querySelectorAll(selector);
        } catch (e) {
            return (elem) ? Ten._Selector.getElementsBySelector(selector, elem) : Ten._Selector.getElementsBySelector(selector);
        }
       // return Array.prototype.slice.apply(elems);
        var ret = [];
        for (var i = 0 , len = elems.length ; i < len ; i++ ) ret.push(elems[i]);
        return ret;
    }
    Ten.DOM.orig_getElementsByTagAndClassName = Ten.DOM.getElementsByTagAndClassName;
    Ten.DOM.getElementsByTagAndClassName = function(tag,klass,parent) {
        var selector = tag || '';
        if (klass) selector += '.' + klass;
        if (!tag && !klass) return [];
        try {
            return Ten.querySelectorAll(selector, parent);
        } catch(e) {
            return Ten.DOM.orig_getElementsByTagAndClassName(tag, klass, parent);
        }
    }
} else {
    Ten.querySelectorAll = Ten._Selector.getElementsBySelector;
}

/* Ten.Color */
Ten.Color = new Ten.Class({
    initialize: function(r,g,b,a) {
        if (typeof(a) == 'undefined' || a === null) a = 1;
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    },
    parseFromString: function(str) {
        var match;
        if ((match = str.match(/^#([0-9a-f]{6}|[0-9a-f]{3})$/i))) {
            var hexstr = match[1];
            var w = hexstr.length / 3;
            var rgb = [];
            for (var i = 0; i < 3; i++) {
                var hex = hexstr.substr(w * i, w);
                if (hex.length == 1) hex += hex;
                rgb.push(parseInt(hex,16));
            }
            return new Ten.Color(rgb[0],rgb[1],rgb[2]);
        } else if ((match = str.match(/^rgb\(([\d.,\s]+)\)/))) {
            var rdba = match[1].split(/[\s,]+/);
            return new Ten.Color(rdba[0],rdba[1],rdba[2],rdba[3]);
        }
        return null;
    },
    parseFromElementColor: function(elem,prop) {
        var ret;
        for (var color; elem; elem = elem.parentNode) {
            color = Ten.Style.getElementStyle(elem, prop);
            if (typeof(color) != 'undefined' && color != 'transparent') {
                ret = color;
                break;
            }
        }
        return ret ? Ten.Color.parseFromString(ret) : null;
    }
},{
    asRGBString: function() {
        if (this.a < 1) {
            return 'rgba(' + this.r + ',' + this.g + ',' + this.b +
                ',' + this.a + ')';
        } else {
            return 'rgb(' + this.r + ',' + this.g + ',' + this.b + ')';
        }
    },
    asHexString: function() {
        var str = '#';
        var cls = ['r','g','b'];
        for (var i = 0; i < 3; i ++) {
            var c = Math.round(this[cls[i]]);
            var s = c.toString(16);
            if (c < 16) s = '0' + s;
            str += s;
        }
        return str;
    },
    overlay: function(color) {
        if (color.a == 1) return color;
        r = Math.round(color.r * color.a + this.r * this.a * (1 - color.a));
        g = Math.round(color.g * color.a + this.g * this.a * (1 - color.a));
        b = Math.round(color.b * color.a + this.b * this.a * (1 - color.a));
        return new Ten.Color(r,g,b);
    }
});

/* Ten.Style */
Ten.Style = new Ten.Class({
    applyStyle: function(elem, style) {
        var cssText = elem.style.cssText;
        var estyle = elem.style;
        for (var prop in style) {
            var value = style[prop];
            if (typeof value == 'function') {
                estyle[prop] = value.call(elem);
            } else {
                estyle[prop] = value;
            }
        }
        return function() {
            elem.style.cssText = cssText;
        };
    },
    getGlobalRule: function(selector) {
        selector = selector.toLowerCase();
        if (Ten.Style._cache[selector]) {
            return Ten.Style._cache[selector];
        } else if (Ten.Style._cache[selector] === null) {
            return null;
        } else {
            for (var i = document.styleSheets.length - 1; i >= 0; i--) {
                var ss = document.styleSheets[i];
                try {
                    var cssRules = ss.cssRules || ss.rules;
                } catch(e) {
                    continue;
                }
                if (cssRules) {
                    for (var j = cssRules.length - 1; j >= 0; j--) {
                        var rule = cssRules[j];
                        if (rule.selectorText &&
                            rule.selectorText.toLowerCase() == selector) {
                                Ten.Style._cache[selector] = rule;
                                return rule;
                            }
                    }
                }
            }
        }
        Ten.Style._cache[selector] = null;
        return null;
    },
    getGlobalStyle: function(selector, prop) {
        var rule = Ten.Style.getGlobalRule(selector);
        if (rule && rule.style[prop]) {
            return rule.style[prop];
        } else {
            return null;
        }
    },
    getElementStyle: function(elem, prop) {
        var style = elem.style ? elem.style[prop] : null;
        if (!style) {
            var dv = document.defaultView;
            if (dv && dv.getComputedStyle) {
                try {
                    var styles = dv.getComputedStyle(elem, null);
                } catch(e) {
                    return null;
                }
                prop = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
                style = styles ? styles.getPropertyValue(prop) : null;
            } else if (elem.currentStyle) {
                style = elem.currentStyle[prop];
            }
        }
        return style;
    },
    scrapeURL: function(url) {
        if (url.match(/url\((.+)\)/)) {
            url = RegExp.$1;
            url = url.replace(/[\'\"<>]/g, '');
            return url;
        }
        return null;
    },
    _cache: {}
});

/* Ten.Geometry */
Ten.Geometry = new Ten.Class({
    initialize: function() {
        if (Ten.Geometry._initialized) return;
        var func = Ten.Geometry._functions;
        var de = document.documentElement;
        if (window.innerWidth) {
            func.getXScroll = function() { return window.pageXOffset; }
            func.getYScroll = function() { return window.pageYOffset; }
        } else if (de && de.clientWidth) {
            func.getXScroll = function() { return de.scrollLeft; }
            func.getYScroll = function() { return de.scrollTop; }
        } else if (document.body.clientWidth) {
            func.getXScroll = function() { return document.body.scrollLeft; }
            func.getYScroll = function() { return document.body.scrollTop; }
        }

        func.getWindowHeight = function(w) { return Ten.Geometry._getRoot(w).clientHeight; }
        func.getWindowWidth  = function(w) { return Ten.Geometry._getRoot(w).clientWidth; }

        func.getDocumentHeight = function(w) { return Ten.Geometry._getRoot(w).scrollHeight; }
        func.getDocumentWidth  = function(w) { return Ten.Geometry._getRoot(w).scrollWidth; }

        Ten.Geometry._initialized = true;
    },
    _getRoot : function(w) {
        if (!w) w = window;
        var root = /BackCompat/i.test(w.document.compatMode) ? document.body : document.documentElement;
        return root;
    },
    _initialized: false,
    _functions: {},
    getScroll: function() {
        if (!Ten.Geometry._initialized) new Ten.Geometry;
        return {
            x: Ten.Geometry._functions.getXScroll(),
            y: Ten.Geometry._functions.getYScroll()
        };
    },
    getMousePosition: function(pos) {
        // pos should have clientX, clientY same as mouse event
        if (!Ten.Browser.isChrome && (navigator.userAgent.indexOf('Safari') > -1) &&
            (navigator.userAgent.indexOf('Version/') < 0)) {
            return {
                x: pos.clientX,
                y: pos.clientY
            };
        } else {
            var scroll = Ten.Geometry.getScroll();
            return {
                x: pos.clientX + scroll.x,
                y: pos.clientY + scroll.y
            };
        }
    },
    getElementPosition: function(e) {
        var pos = {x:0, y:0};
        if (document.documentElement.getBoundingClientRect) { // IE 
            var box = e.getBoundingClientRect();
            var owner = e.ownerDocument;
            pos.x = box.left + Math.max(owner.documentElement.scrollLeft, owner.body.scrollLeft) - 2;
            pos.y = box.top  + Math.max(owner.documentElement.scrollTop,  owner.body.scrollTop) - 2
        } else if(document.getBoxObjectFor) { //Firefox
            pos.x = document.getBoxObjectFor(e).x;
            pos.y = document.getBoxObjectFor(e).y;
        } else {
            do {
                pos.x += e.offsetLeft;
                pos.y += e.offsetTop;
            } while ((e = e.offsetParent));
        }
        return pos;
    },
    getWindowSize: function() {
        if (!Ten.Geometry._initialized) new Ten.Geometry;
        return {
            w: Ten.Geometry._functions.getWindowWidth(),
            h: Ten.Geometry._functions.getWindowHeight()
        };
    },
    getDocumentSize: function(w) {
        if (!Ten.Geometry._initialized) new Ten.Geometry;
        w = w || window;
        return {
            w: Ten.Geometry._functions.getDocumentWidth(w),
            h: Ten.Geometry._functions.getDocumentHeight(w)
        };
    }
});

/* Ten.Position */
Ten.Position = new Ten.Class({
    initialize: function(x,y) {
        this.x = x;
        this.y = y;
    },
    add: function(a,b) {
        return new Ten.Position(a.x + b.x, a.y + b.y);
    },
    subtract: function(a,b) {
        return new Ten.Position(a.x - b.x, a.y - b.y);
    }
});

/* Ten.Logger */
Ten.Logger = new Ten.Class({
    initialize: function(level, fallbackElement) {
        this.level = level || 'info';
        this.fallbackElement = fallbackElement;
        this.logFunction = this.constructor.logFunction;
        this.logs = [];
    },
    LEVEL: {
        error: 0,
        warn:  1,
        info:  2,
        debug: 3
    },
    logFunction: function(level, args) {
        if (typeof console == 'undefined') {
            try {
                if (window.opera) {
                    // Opera
                    opera.postError(args.join(', '));
                } else {
                    // fub
                    external.consoleLog(args.join(', '));
                }
            } catch (e) {
                if (this.fallbackElement && this.fallbackElement.appendChild) {
                    this.fallbackElement.appendChild(document.createTextNode(level + ': ' + args.join(', ')));
                    this.fallbackElement.appendChild(document.createElement('br'));
                }
            }
        } else if (typeof console[level] == 'function') {
            if (navigator.userAgent.indexOf('Safari') >= 0) {
                // Safari
                console[level](args.join(', '));
            } else {
                // Firefox (with Firebug)
                console[level].apply(console, args);
            }
        } else if (typeof console.log == 'function') {
            console.log(args.join(', '));
        }
    }
}, {
    logs: null,
    log: function(level) {
        var LEVEL = this.constructor.LEVEL;
        if (!(level in LEVEL) || LEVEL[level] > LEVEL[this.level])
            return;

        var args = [];
        for (var i = 1; i < arguments.length; i++) {
            args.push(arguments[i]);
        }

        this.logs.push([level, args]);

        this.logFunction(level, args);
    },
    error: function() {
        return this._log('error', arguments);
    },
    warn: function() {
        return this._log('warn', arguments);
    },
    info: function() {
        return this._log('info', arguments);
    },
    debug: function() {
        return this._log('debug', arguments);
    },
    _log: function(level, _arguments) {
        var args = [level];
        for (var i = 0; i < _arguments.length; i++)
            args.push(_arguments[i]);
        return this.log.apply(this, args);
    }
});

/* DEPRECATED: Ten.Browser */
Ten.Browser = {
    isIE: navigator.userAgent.indexOf('MSIE') != -1,
    isIE6 : navigator.userAgent.indexOf('MSIE 6.') != -1,
    isIE7 : navigator.userAgent.indexOf('MSIE 7.') != -1,
    isIE8 : navigator.userAgent.indexOf('MSIE 8.') != -1,
    isIE9 : navigator.userAgent.indexOf('MSIE 9.') != -1,
    geIE10 : /MSIE [0-9]{2,}\./.test(navigator.userAgent),
    /* Gecko */
    isMozilla: navigator.userAgent.indexOf('Mozilla') != -1 && !/compatible|WebKit/.test(navigator.userAgent),
    /* Presto */
    isOpera: !!window.opera,
    isWebKit: navigator.userAgent.indexOf('WebKit') != -1,
    isSafari: navigator.userAgent.indexOf('WebKit') != -1 && navigator.userAgent.indexOf('Chrome/') == -1,
    isChrome : navigator.userAgent.indexOf('Chrome/') != -1,
    isFirefox : navigator.userAgent.indexOf('Firefox/') != -1,
    isDSi : navigator.userAgent.indexOf('Nintendo DSi') != -1,
    is3DS : navigator.userAgent.indexOf('Nintendo 3DS') != -1,
    isWii : navigator.userAgent.indexOf('Nintendo Wii') != -1 && !navigator.userAgent.indexOf('Nintendo WiiU'),
    isWiiU: navigator.userAgent.indexOf('Nintendo WiiU'),
    /* Android smartphones */
    isAndroid : navigator.userAgent.indexOf('Android') != -1 && navigator.userAgent.indexOf('Mobile') != -1,
    /* iPhone and iPod touch */
    isIPhone : (navigator.userAgent.indexOf('iPod;') != -1 || navigator.userAgent.indexOf('iPhone;') != -1 || navigator.userAgent.indexOf('iPhone Simulator;') != -1),
    isIPad : navigator.userAgent.indexOf('iPad') != -1,
    isBB: navigator.userAgent.indexOf('BlackBerry') == 0,
    isWM: navigator.userAgent.indexOf('IEMobile') != -1 || navigator.userAgent.indexOf('Windows Phone') != -1,
    isOSX: navigator.userAgent.indexOf('OS X ') != -1,
    isSupportsXPath : !!document.evaluate,
    noQuirks: document.compatMode == 'CSS1Compat',
    version: {
        string: (/(?:Firefox\/|MSIE |Opera\/|Chrome\/|Version\/)([\d.]+)/.exec(navigator.userAgent) || []).pop(),
        valueOf: function() { return parseFloat(this.string) },
        toString: function() { return this.string }
    }
};
/* Touch small devices */
Ten.Browser.isTouch = Ten.Browser.isIPhone || Ten.Browser.isAndroid || Ten.Browser.isDSi || Ten.Browser.is3DS;
Ten.Browser.isSmartPhone = Ten.Browser.isIPhone || Ten.Browser.isAndroid;
Ten.Browser.leIE7 = Ten.Browser.isIE6 || Ten.Browser.isIE7;

if (!Ten.Browser.isIE) Ten.JSONP.MaxBytes = 7000;

if (!Ten.Browser.CSS) Ten.Browser.CSS = {};
Ten.Browser.CSS.noFixed = Ten.Browser.isIE6 || (Ten.Browser.isIE && !Ten.Browser.noQuirks);

Ten.Event.onKeyDown = ((Ten.Browser.isFirefox && Ten.Browser.isOSX) || Ten.Browser.isOpera) ? 'onkeypress' : 'onkeydown';


Ten.Deferred = (function () {
    function Deferred () { return (this instanceof Deferred) ? this.init() : new Deferred() }
    Deferred.ok = function (x) { return x };
    Deferred.ng = function (x) { throw  x };
    Deferred.prototype = {
        
        init : function () {
            this._next    = null;
            this.callback = {
                ok: Deferred.ok,
                ng: Deferred.ng
            };
            return this;
        },
    
        
        next  : function (fun) { return this._post("ok", fun) },
    
        
        error : function (fun) { return this._post("ng", fun) },
    
        
        call  : function (val) { return this._fire("ok", val) },
    
        
        fail  : function (err) { return this._fire("ng", err) },
    
        
        cancel : function () {
            (this.canceller || function () {})();
            return this.init();
        },
    
        _post : function (okng, fun) {
            this._next =  new Deferred();
            this._next.callback[okng] = fun;
            return this._next;
        },
    
        _fire : function (okng, value) {
            var next = "ok";
            try {
                value = this.callback[okng].call(this, value);
            } catch (e) {
                next  = "ng";
                value = e;
                if (Deferred.onerror) Deferred.onerror(e);
            }
            if (value instanceof Deferred) {
                value._next = this._next;
            } else {
                if (this._next) this._next._fire(next, value);
            }
            return this;
        }
    };
    
    Deferred.next_default = function (fun) {
        var d = new Deferred();
        var id = setTimeout(function () { d.call() }, 0);
        d.canceller = function () { clearTimeout(id) };
        if (fun) d.callback.ok = fun;
        return d;
    };
    Deferred.next_faster_way_readystatechange = ((typeof window === 'object') && (location.protocol == "http:") && !window.opera && /\bMSIE\b/.test(navigator.userAgent)) && function (fun) {
        var d = new Deferred();
        var t = new Date().getTime();
        if (t - arguments.callee._prev_timeout_called < 150) {
            var cancel = false;
            var script = document.createElement("script");
            script.type = "text/javascript";
            script.src  = "data:text/javascript,";
            script.onreadystatechange = function () {
                if (!cancel) {
                    d.canceller();
                    d.call();
                }
            };
            d.canceller = function () {
                if (!cancel) {
                    cancel = true;
                    script.onreadystatechange = null;
                    document.body.removeChild(script);
                }
            };
            document.body.appendChild(script);
        } else {
            arguments.callee._prev_timeout_called = t;
            var id = setTimeout(function () { d.call() }, 0);
            d.canceller = function () { clearTimeout(id) };
        }
        if (fun) d.callback.ok = fun;
        return d;
    };
    Deferred.next_faster_way_Image = ((typeof window === 'object') && (typeof(Image) != "undefined") && !window.opera && document.addEventListener) && function (fun) {
        var d = new Deferred();
        var img = new Image();
        var handler = function () {
            d.canceller();
            d.call();
        };
        img.addEventListener("load", handler, false);
        img.addEventListener("error", handler, false);
        d.canceller = function () {
            img.removeEventListener("load", handler, false);
            img.removeEventListener("error", handler, false);
        };
        img.src = "data:image/png," + Math.random();
        if (fun) d.callback.ok = fun;
        return d;
    };
    Deferred.next_tick = (typeof process === 'object' && typeof process.nextTick === 'function') && function (fun) {
        var d = new Deferred();
        process.nextTick(function() { d.call() });
        if (fun) d.callback.ok = fun;
        return d;
    }
    Deferred.next = Deferred.next_faster_way_readystatechange ||
                    Deferred.next_faster_way_Image ||
                    Deferred.next_tick ||
                    Deferred.next_default;
    
    Deferred.chain = function () {
        var chain = Deferred.next();
        for (var i = 0, len = arguments.length; i < len; i++) (function (obj) {
            switch (typeof obj) {
                case "function":
                    var name = null;
                    try {
                        name = obj.toString().match(/^\s*function\s+([^\s()]+)/)[1];
                    } catch (e) { }
                    if (name != "error") {
                        chain = chain.next(obj);
                    } else {
                        chain = chain.error(obj);
                    }
                    break;
                case "object":
                    chain = chain.next(function() { return Deferred.parallel(obj) });
                    break;
                default:
                    throw "unknown type in process chains";
            }
        })(arguments[i]);
        return chain;
    }
    
    Deferred.wait = function (n) {
        var d = new Deferred(), t = new Date();
        var id = setTimeout(function () {
            d.call((new Date).getTime() - t.getTime());
        }, n * 1000);
        d.canceller = function () { clearTimeout(id) };
        return d;
    };
    
    Deferred.call = function (fun) {
        var args = Array.prototype.slice.call(arguments, 1);
        return Deferred.next(function () {
            return fun.apply(this, args);
        });
    };
    
    Deferred.parallel = function (dl) {
        if (arguments.length > 1) dl = Array.prototype.slice.call(arguments);
        var ret = new Deferred(), values = {}, num = 0;
        for (var i in dl) if (dl.hasOwnProperty(i)) (function (d, i) {
            if (typeof d == "function") d = Deferred.next(d);
            d.next(function (v) {
                values[i] = v;
                if (--num <= 0) {
                    if (dl instanceof Array) {
                        values.length = dl.length;
                        values = Array.prototype.slice.call(values, 0);
                    }
                    ret.call(values);
                }
            }).error(function (e) {
                ret.fail(e);
            });
            num++;
        })(dl[i], i);
    
        if (!num) Deferred.next(function () { ret.call() });
        ret.canceller = function () {
            for (var i in dl) if (dl.hasOwnProperty(i)) {
                dl[i].cancel();
            }
        };
        return ret;
    };
    
    Deferred.earlier = function (dl) {
        if (arguments.length > 1) dl = Array.prototype.slice.call(arguments);
        var ret = new Deferred(), values = {}, num = 0;
        for (var i in dl) if (dl.hasOwnProperty(i)) (function (d, i) {
            d.next(function (v) {
                values[i] = v;
                if (dl instanceof Array) {
                    values.length = dl.length;
                    values = Array.prototype.slice.call(values, 0);
                }
                ret.canceller();
                ret.call(values);
            }).error(function (e) {
                ret.fail(e);
            });
            num++;
        })(dl[i], i);
    
        if (!num) Deferred.next(function () { ret.call() });
        ret.canceller = function () {
            for (var i in dl) if (dl.hasOwnProperty(i)) {
                dl[i].cancel();
            }
        };
        return ret;
    };
    
    
    Deferred.loop = function (n, fun) {
        var o = {
            begin : n.begin || 0,
            end   : (typeof n.end == "number") ? n.end : n - 1,
            step  : n.step  || 1,
            last  : false,
            prev  : null
        };
        var ret, step = o.step;
        return Deferred.next(function () {
            function _loop (i) {
                if (i <= o.end) {
                    if ((i + step) > o.end) {
                        o.last = true;
                        o.step = o.end - i + 1;
                    }
                    o.prev = ret;
                    ret = fun.call(this, i, o);
                    if (ret instanceof Deferred) {
                        return ret.next(function (r) {
                            ret = r;
                            return Deferred.call(_loop, i + step);
                        });
                    } else {
                        return Deferred.call(_loop, i + step);
                    }
                } else {
                    return ret;
                }
            }
            return (o.begin <= o.end) ? Deferred.call(_loop, o.begin) : null;
        });
    };
    
    
    Deferred.repeat = function (n, fun) {
        var i = 0, end = {}, ret = null;
        return Deferred.next(function () {
            var t = (new Date()).getTime();
            divide: {
                do {
                    if (i >= n) break divide;
                    ret = fun(i++);
                } while ((new Date()).getTime() - t < 20);
                return Deferred.call(arguments.callee);
            }
            return null;
        });
    };
    
    Deferred.register = function (name, fun) {
        this.prototype[name] = function () {
            var a = arguments;
            return this.next(function () {
                return fun.apply(this, a);
            });
        };
    };
    
    Deferred.register("loop", Deferred.loop);
    Deferred.register("wait", Deferred.wait);
    
    Deferred.connect = function (funo, options) {
        var target, func, obj;
        if (typeof arguments[1] == "string") {
            target = arguments[0];
            func   = target[arguments[1]];
            obj    = arguments[2] || {};
        } else {
            func   = arguments[0];
            obj    = arguments[1] || {};
            target = obj.target;
        }
    
        var partialArgs       = obj.args ? Array.prototype.slice.call(obj.args, 0) : [];
        var callbackArgIndex  = isFinite(obj.ok) ? obj.ok : obj.args ? obj.args.length : undefined;
        var errorbackArgIndex = obj.ng;
    
        return function () {
            var d = new Deferred().next(function (args) {
                var next = this._next.callback.ok;
                this._next.callback.ok = function () {
                    return next.apply(this, args.args);
                };
            });
    
            var args = partialArgs.concat(Array.prototype.slice.call(arguments, 0));
            if (!(isFinite(callbackArgIndex) && callbackArgIndex !== null)) {
                callbackArgIndex = args.length;
            }
            var callback = function () { d.call(new Deferred.Arguments(arguments)) };
            args.splice(callbackArgIndex, 0, callback);
            if (isFinite(errorbackArgIndex) && errorbackArgIndex !== null) {
                var errorback = function () { d.fail(arguments) };
                args.splice(errorbackArgIndex, 0, errorback);
            }
            Deferred.next(function () { func.apply(target, args) });
            return d;
        }
    }
    Deferred.Arguments = function (args) { this.args = Array.prototype.slice.call(args, 0) }
    
    Deferred.retry = function (retryCount, funcDeferred, options) {
        if (!options) options = {};
    
        var wait = options.wait || 0;
        var d = new Deferred();
        var retry = function () {
            var m = funcDeferred(retryCount);
            m.
                next(function (mes) {
                    d.call(mes);
                }).
                error(function (e) {
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
    
    Deferred.methods = ["parallel", "wait", "next", "call", "loop", "repeat", "chain"];
    Deferred.define = function (obj, list) {
        if (!list) list = Deferred.methods;
        if (!obj)  obj  = (function getGlobal () { return this })();
        for (var i = 0; i < list.length; i++) {
            var n = list[i];
            obj[n] = Deferred[n];
        }
        return Deferred;
    };
    
    
    return Deferred;
})();


} // if (typeof(Ten) == undefined)
/*
// require Ten.js
*/

/* Ten.SubWindow */
Ten.SubWindow = new Ten.Class({
    initialize: function(args) {
        var c = this.constructor;
        if (c.singleton && c._cache) {
            return c._cache;
        }
        if (args) {
            for (var k in args) {
                this[k] = args[k];
            }
        }
        var div = document.createElement('div');
        Ten.Style.applyStyle(div, Ten.SubWindow._baseStyle);
        Ten.Style.applyStyle(div, c.style);
        this.window = div;
        this.addContainerAndCloseButton();
        document.body.appendChild(div);
        if (c.draggable) {
            this._draggable = new Ten.Draggable(div, this.handle);
        }
        if (c.singleton) c._cache = this;
        return this;
    },
    _baseStyle: {
        color: '#000',
        position: 'absolute',
        display: 'none',
        zIndex: 10002,
        left: 0,
        top: 0,
        backgroundColor: '#fff',
        border: '1px solid #bbb'
    },
    style: {
        padding: '2px',
        textAlign: 'center',
        borderRadius: '6px',
        MozBorderRadius: '6px',
        width: '100px',
        height: '100px'
    },
    handleStyle: {
        position: 'absolute',
        top: '0px',
        left: '0px',
        backgroundColor: '#f3f3f3',
        borderBottom: '1px solid #bbb',
        width: '100%',
        height: '30px'
    },
    containerStyle: {
        margin: '32px 0 0 0',
        padding: '0 10px'
    },
    // closeButton: 'close.gif',
    closeButton: 'http://s.hatena.com/images/close.gif',
    closeButtonStyle: {
        position: 'absolute',
        top: '8px',
        right: '10px',
        cursor: 'pointer'
    },
    _baseScreenStyle: {
        position: 'absolute',
        top: '0px',
        left: '0px',
        display: 'none',
        zIndex: 10001,
        overflow: 'hidden',
        width: '100%',
        height: '100%'
    },
    screenStyle: {},
    showScreen: true,
    singleton: true,
    draggable: true,
    _cache: null
},{
    screen: null,
    windowObserver: null,
    visible: false,
    addContainerAndCloseButton: function() {
        var win = this.window;
        var c = this.constructor;
        var div = document.createElement('div');
        win.appendChild(div);
        Ten.Style.applyStyle(div, c.containerStyle);
        this.container = div;
        if (c.handleStyle) {
            var handle = document.createElement('div');
            Ten.Style.applyStyle(handle, c.handleStyle);
            win.appendChild(handle);
            this.handle = handle;
        }
        if (c.closeButton) {
	    var btn = document.createElement('img');
            btn.src = c.closeButton;
            btn.alt = 'close';
            Ten.Style.applyStyle(btn, c.closeButtonStyle);
            win.appendChild(btn);
            new Ten.Observer(btn, 'onclick', this, 'hide');
            this.closeButton = btn;
        }
        if (c.showScreen) {
            var screen = document.createElement('div');
            Ten.Style.applyStyle(screen, Ten.SubWindow._baseScreenStyle);
            Ten.Style.applyStyle(screen, c.screenStyle);
            document.body.appendChild(screen);
            this.screen = screen;
            new Ten.Observer(screen, 'onclick', this, 'hide');
        }
    },
    show: function(pos) {
        pos = (pos.x && pos.y) ? pos : {x:0, y:0};
        var s = this.window.style;
        s.display = 'block';
        s.left = pos.x + 'px';
        s.top = pos.y + 'px';
        if (this.screen) {
            var ss = this.screen.style;
            ss.display = 'block';
            ss.left = Ten.Geometry.getScroll().x + 'px';
            ss.top = Ten.Geometry.getScroll().y + 'px';
        }
        this.windowObserver = new Ten.Observer(document.body, 'onkeypress', this, 'handleEscape');
        this.visible = true;
    },
    handleEscape: function(e) {
        if (!e.isKey('escape')) return;
        this.hide();
        e.stop();
    },
    hide: function() {
        if (this._draggable) this._draggable.endDrag();
        this.window.style.display = 'none';
        if (this.screen) this.screen.style.display = 'none';
        if (this.windowObserver) this.windowObserver.stop();
        this.visible = false;
        this.window.blur();
    }
});

/* Ten.Draggable */
Ten.Draggable = new Ten.Class({
    initialize: function(element,handle) {
        this.element = element;
        this.handle = handle || element;
        this.startObserver = new Ten.Observer(this.handle, 'onmousedown', this, 'startDrag');
        this.handlers = [];
    }
},{
    startDrag: function(e) {
        if (e.targetIsFormElements()) return;
        this.delta = Ten.Position.subtract(
            e.mousePosition(),
            Ten.Geometry.getElementPosition(this.element)
        );
        this.handlers = [
            new Ten.Observer(document, 'onmousemove', this, 'drag'),
            new Ten.Observer(document, 'onmouseup', this, 'endDrag'),
            new Ten.Observer(this.element, 'onlosecapture', this, 'endDrag')
        ];
        e.stop();
    },
    drag: function(e) {
        var pos = Ten.Position.subtract(e.mousePosition(), this.delta);
        Ten.Style.applyStyle(this.element, {
            left: pos.x + 'px',
            top: pos.y + 'px'
        });
        e.stop();
    },
    endDrag: function(e) {
        for (var i = 0; i < this.handlers.length; i++) {
            this.handlers[i].stop();
        }
        if(e) e.stop();
    }
});
/*
// require Ten.js
*/

/* Ten.Highlight */
Ten.Highlight = new Ten.Class({
    initialize: function(quote) {
        if (!quote) return;
        this.quote = quote;
        var c = this.constructor;
        if (!c._cache) c._cache = {};
        if (c._cache[quote]) return c._cache[quote];
        c._cache[quote] = this;
        c.makeTextNodes(c);
    },
    makeTextNodes: function(c) {
        if (c.textNodes || c.textNodePositions || c.documentText) return;
        if (Ten.Highlight.highlighted) Ten.Highlight.highlighted.hide();
        c.textNodes = [];
        c.textNodePositions = [];
        var isIE = navigator.userAgent.indexOf('MSIE') != -1;
        var texts = [];
        var pos = 0;
        (function(node, parent) {
            if (isIE && parent && parent != node.parentNode) return;
            if (node.nodeType == 3) {
                c.textNodes.push(node);
                texts.push(node.nodeValue);
                c.textNodePositions.push(pos);
                pos += node.nodeValue.length;
            } else {
                var childNodes = node.childNodes;
                for (var i = 0; i < childNodes.length; i++) {
                    arguments.callee(childNodes[i], node);
                }
            }
        })(document.body);
        c.documentText = texts.join('');
        c.loaded = true;
    },
    loaded: false,
    bgColors: null,
    textNodes: null,
    textNodePositions: null,
    documentText: null,
    highlighted: null,
    _cache: null,
    _lock: {},
    Color: new Ten.Color(255,255,0,0.4),
    ClassName: null
},{
    makeMatchedNodes: function() {
        if (this.matchedNodes) return;
        var matched = {};
        var c = this.constructor;
        var quote = this.quote;
        var nodes = c.textNodes, positions = c.textNodePositions, text = c.documentText;
        var i = 0;
        for (var start = text.indexOf(quote); start != -1;
             start = text.indexOf(quote, start + quote.length)) {
             var end = start + quote.length - 1;
             for (; i < positions.length; i++) {
                 if (end < positions[i]) {
                     break;
                 }
                 var last = positions[i+1] ? positions[i+1] - 1
                     : c.documentText.length;
                 if (last < start) {
                     continue;
                 } else if (start <= last) {
                     if (!matched[i]) matched[i] = {ranges: []};
                     var range = [];
                     range[0] = start - positions[i];
                     range[1] = end < last ? end - positions[i] + 1
                         : last - positions[i] + 1;
                     matched[i].ranges.push(range);
                 }
             }
             i--;
        }
        this.matchedNodes = matched;
    },
    show: function() {
        var c = this.constructor;
        if (!c.loaded) return;
        this.makeMatchedNodes();
        var matched = this.matchedNodes;
        if (!matched) return;
        if (Ten.Highlight.highlighted) Ten.Highlight.highlighted.hide();
        var nodes = c.textNodes;
        if (!this.containers) this.containers = {};
        var containers = this.containers;
        for (var i in matched) {
            if (!i.match(/^\d+$/)) continue;
            if (!this.containers[i]) {
                var node = nodes[i];
                if (!node) continue;
                var text = nodes[i].nodeValue;
                var container = document.createElement('span');
                container.style.padding = '0';
                container.style.margin = '0';
                var pos = 0;
                var ranges = matched[i].ranges;
                for (var j = 0; j < ranges.length; j++) {
                    var range = ranges[j];
                    if (pos < range[0]) {
                        container.appendChild(document.createTextNode(text.substring(pos,range[0])));
                    }
                    var span = this.createSpan(i);
                    if (!span) continue;
                    span.appendChild(document.createTextNode(text.substring(range[0],range[1])));
                    container.appendChild(span);
                    pos = range[1];
                }
                if (pos < text.length) container.appendChild(document.createTextNode(text.substring(pos)));
                this.containers[i] = container;
            }
            this.replaceNode(i,true);
        }
        Ten.Highlight.highlighted = this;
    },
    createSpan: function(i) {
        var c = this.constructor;
        if (!c.bgColors) c.bgColors = {};
        if (!c.bgColors[i]) {
            if (!c.textNodes[i]) return;
            var node = c.textNodes[i].parentNode;
            var back = Ten.Color.parseFromElementColor(node,'backgroundColor')
                || new Ten.Color(255,255,255);
            c.bgColors[i] = back.overlay(c.Color).asHexString();
        }
        var span = document.createElement('span');
        span.style.backgroundColor = c.bgColors[i];
        if (c.ClassName) span.className = c.ClassName;
        return span;
    },
    hide: function() {
        var matched = this.matchedNodes;
        if (!matched) return;
        Ten.Highlight.highlighted = null;
        var c = this.constructor;
        for (var i in matched) {
            if (!i.match(/^\d+$/)) continue;
            this.replaceNode(i,false);
        }
    },
    replaceNode: function(i, show) {
        var c = this.constructor;
        if (c._lock[i]) return;
        if (c.textNodes[i].parentNode && c.textNodes[i].parentNode.tagName.toLowerCase() == 'textarea') {
            return;
        }
        c._lock[i] = true;
        var newNode, oldNode;
        if (show) {
            newNode = this.containers[i], oldNode = c.textNodes[i];
        } else {
            newNode = c.textNodes[i], oldNode = this.containers[i];
        }
        if (newNode) Ten.DOM.replaceNode(newNode, oldNode);        
        c._lock[i] = false;
    },
    containers: null,
    matchedNodes: null
});
/*
// require Ten.js
*/

/* Hatena */
if (typeof(Hatena) == 'undefined') {
    Hatena = {};
}

/* Hatena.User */
Hatena.User = new Ten.Class({
    initialize: function(args) {
        if (typeof(args) == 'string') {
            this.name = args;
        } else {
            for (var key in args) {
                this[key] = args[key];
            }
        }
    },
    getProfileIcon: function(name) {
        if (!name) name = 'user';
        var pre = name.match(/^[\w-]{2}/)[0];
        var img = document.createElement('img');
        img.src = 'https://www.hatena.ne.jp/users/' + pre + '/' + name + '/profile_s.gif';
        img.setAttribute('alt', name);
        img.setAttribute('title', name);
        img.setAttribute('width','16px');
        img.setAttribute('height','16px');
        img.className =  'profile-icon';
        with (img.style) {
            margin = '0 3px';
            border = 'none';
            verticalAlign = 'middle';
        }
        return img;
    }
}, {
    profileIcon: function() {
        return Hatena.User.getProfileIcon(this.name);
    }
});
/*
// require Ten.js
// require Ten/SubWindow.js
// require Ten/Highlight.js
// require Hatena.js
*/

/* Hatena.Star */
if (typeof(Hatena.Star) == 'undefined') {
    Hatena.Star = {};
}
Hatena.Star.VERSION = 1.97;

/*
// Hatena.Star.* classes //
*/
Hatena.Star.BaseURL = 'http://s.hatena.ne.jp/';
if (!Hatena.Star.BaseURLProtocol) {
    Hatena.Star.BaseURLProtocol = ( location.protocol === "http:" ? "http:" : "https:" );
}
Hatena.Star.PortalURL = 'http://www.hatena.ne.jp/';
Hatena.Star.ProfileURL = 'http://profile.hatena.ne.jp/';
Hatena.Star.UgoMemoURL = 'http://ugomemo.hatena.ne.jp/';
Hatena.Star.HaikuURL   = 'http://h.hatena.ne.jp/';
Hatena.Star.HatenaHostRegexp = /(\.hatena\.ne\.jp|\.hatelabo.jp|\.hatena\.com)$/;
Hatena.Star.Token = null;
Hatena.Star.UseAnimation = false;

Hatena.Star.isTouchUA = Ten.Browser.isTouch || Ten.Browser.isIPad;

// ---- user setting ----
Hatena.Star.Config = {
    isColorPalletAvailable: true,
    isStarDeletable: true,
    isCommentButtonAvailable: true
}

Hatena.Star.Delayed = new Ten.Class({
    initialize: function () {
        this.waiting = [];
    }
}, {
    isReady : false,
    ready : function (value) {
        this.value = value;
        while (this.waiting.length) {
            this.waiting.shift()(value);
        }
        this.isReady = true;
    },
    required : function (fun) {
        var self = this;
        if (typeof(this.value) == "undefined") {
            this.waiting.push(fun);
        } else {
            fun(this.value);
        }
    }
});

/* Hatena.Star.User */
Hatena.Star.User = new Ten.Class({
    base: [Hatena.User],
    initialize: function(name) {
        if (Hatena.Star.User._cache[name]) {
            return Hatena.Star.User._cache[name];
        } else {
            this.name = name;
            Hatena.Star.User._cache[name] = this;
            return this;
        }
    },
    profileIconType: 'icon',
    getProfileIcon: function(name,src) {
        if (!name) name = 'user';
        var img = document.createElement('img');
        if (src) {
            img.src = src;
        } else {
            if (this.profileIconType == 'icon' &&
                !/\@/.test(name)) {
                var pre = name.match(/^[\w-]{2}/)[0];
                var pp = pre + '/' + name + '/profile_s.gif';
                if ( location.protocol == 'https:' ) {
                    img.src = 'https://www.hatena.com/users/' + pp;
                } else {
                    img.src = 'http://cdn1.www.st-hatena.com/users/' + pp;
                }
            } else {
                img.src = 'http://n.hatena.com/' + name + '/profile/image?size=16&type=' + encodeURIComponent(this.profileIconType);
            }
        }
        img.setAttribute('alt', name);
        img.setAttribute('title', name);
        img.setAttribute('width','16px');
        img.setAttribute('height','16px');
        img.className =  'profile-icon';
        var s = img.style;
        s.margin = '0 3px';
        s.border = 'none';
        s.verticalAlign = 'middle';
        s.width = '16px';
        s.height = '16px';
        return img;
    },
    RKS : new Hatena.Star.Delayed(),
    _cache: {},
    _nicknames: {},
    useHatenaUserNickname: false,
    withNickname: function (urlName, nextCode) {
        var cached = urlName ? Hatena.Star.User._nicknames[urlName] : null;
        if (!urlName) {
            cached = null;
        } else if (!Hatena.Star.User.useHatenaUserNickname && urlName) {
            // ニックネームを使わない設定の場合は、urlName をそのままニックネームに
            cached = urlName;
        }
        if (cached !== undefined) {
            setTimeout(function () {
                nextCode.apply(Hatena.Star.User, [cached]);
            }, 10);
            return;
        }
        this._getNickname(urlName, nextCode);
    },
    _getNicknames: {},
    _getNickname: function (urlName, nextCode) {
      if (location.protocol === 'https:') {
        // https: なページでは http: API を叩かないようにする。念の為。
        nextCode.apply(Hatena.Star.User, [ urlName ]);
        return;
      }

      this._getNicknames[urlName] = this._getNicknames[urlName] || [];
      this._getNicknames[urlName].push(nextCode);
      clearTimeout(this._getNicknameTimer);
      this._getNicknameTimer = setTimeout(function () {
        var names = Hatena.Star.User._getNicknames;
        Hatena.Star.User._getNicknames = {};
        var url = 'http://h.hatena.com/api/friendships/show.json?url_name=sample';
        for (var n in names) {
          url += '&url_name=' + encodeURIComponent(n);
        }
        new Ten.JSONP(url, function (users) {
          for (var n in users) {
            var user = users[n];
            var codes = names[n] || [];
            for (var i = 0; i < codes.length; i++) {
              Hatena.Star.User._nicknames[n] = user.name || null;
              var nickname = user.name;
              if (nickname) nickname += ' (id:' + n + ')';
              codes[i].apply(Hatena.Star.User, [nickname]);
            }
          }
        });
      }, 500);
    }
},{
    userPage: function() {
        var hostname = location.hostname || '';
        if (this.name.match(/@(.*)/)) {
            return Hatena.Star.ProfileURL + this.name + '/';
        } else {
            if (Hatena.Star.HatenaHostRegexp.test(hostname)) {
                return 'http://' + location.host + '/' + this.name + '/';
            } else {
                return Hatena.Star.ProfileURL + this.name + '/';
            }
        }
    }
});

/* Hatena.Star.Entry */
Hatena.Star.Entry = new Ten.Class({
    initialize: function(e) {
        this.entry = e;
        this.uri = e.uri;
        this.title = e.title;
        this.star_container = e.star_container;
        this.comment_container = e.comment_container;
        this.entryNode = e.entryNode;
        this.stars = [];
        this.colored_stars = [];
        this.comments = [];
        this._hasBoundToStarEntry = false;
    },
    maxStarCount: 11
},{
    flushStars: function() {
        this.stars = [];
        this.star_container.innerHTML = '';
    },
    hasBoundToStarEntry: function () {
        return this._hasBoundToStarEntry;
    },
    bindStarEntry: function(se) {
        this._hasBoundToStarEntry = true;
        if (se.colored_stars) {
            var colored_star_hash = {};
            for (var i = 0, len = se.colored_stars.length; i < len ; i++){
                colored_star_hash[se.colored_stars[i].color] = se.colored_stars[i].stars;
            }
            var cs = [ "purple", "blue", "red", "green" ];
            for (var i = 0, len = cs.length; i < len ; i++){
                var csh = colored_star_hash[cs[i]];
                if (csh) this.pushStars(csh,cs[i]);
            }
        }
        this.pushStars(se.stars);
        if (se.comments && !this.comments.length) {
            for (var i = 0; i < se.comments.length; i++) {
                this.comments.push(new Hatena.Star.Comment(se.comments[i]));
            }
        }
        this.can_comment = se.can_comment;
    },
    pushStars: function(s,c) {
        for (var i = 0; i < s.length; i++) {
            if (typeof(s[i]) == 'number') {
                this.stars.push(new Hatena.Star.InnerCount(s[i],this,c));
            } else if(s[i]) {
                var args = s[i];
                args.entry = this.entry;
                args.container = this.star_container;
                args.color = c;
                this.stars.push(new Hatena.Star.Star(args));
            }
        }
    },
    setCanComment: function(v) {
        this.can_comment = v;
    },
    showButtons: function() {
        this.addAddButton();
        this.addCommentButton();
    },
    addAddButton: function() {
        var addButtonClass =
            this.constructor.AddButtonClass || (
                (Hatena.Star.useSmartPhoneStar && Hatena.Star.isTouchUA)
                    ? Hatena.Star.AddButton.SmartPhone
                    : Hatena.Star.AddButton
            );

        var sc = this.star_container;
        if (sc) {
            this.addButton = new addButtonClass(this,sc);
            sc.appendChild(this.addButton);
        }
    },
    addCommentButton: function() {
        var cc = this.comment_container;
        if (cc) {
            this.commentButton = new Hatena.Star.CommentButton(this,cc);
            cc.appendChild(this.commentButton.img);
        }
    },
    showStars: function() {
        var sc = this.star_container;
        for (var i = 0; i < this.stars.length; i++) {
            sc.appendChild(this.stars[i].asElement());
        }
    },
    showCommentButton: function() {
        if ( this.can_comment && Hatena.Star.Config.isCommentButtonAvailable ) {
            this.commentButton.show();
            if (this.comments.length) this.commentButton.activate();
        } else {
            // this.commentButton.hide();
        }
    },
    addTemporaryStar: function(args) {
        if (!this.temporaryStars) this.temporaryStars = [];
        var star = new Hatena.Star.Star({
            color: 'temp',
            name: '',
            entry: this,
            container: this.star_container
        }).asElement();
        this.temporaryStars.push(star);
        this.star_container.appendChild(star);
    },
    removeTemporaryStar: function() {
        if (this.temporaryStars) {
            var star = this.temporaryStars.shift();
            if (star) this.star_container.removeChild(star);
            return star;
        }
        return null;
    },
    addStar: function(args) {
        var star = new Hatena.Star.Star({
            color: args.color,
            name: args.name,
            quote: args.quote,
            entry: this,
            container: this.star_container
        });
        this.stars.push(star);
        if (this.temporaryStars && this.temporaryStars.length) {
            this.star_container.insertBefore(star.asElement(), this.temporaryStars[0]);
        } else {
            this.star_container.appendChild(star.asElement());
        }
        this.constructor.dispatchEvent('starAdded', this);
    },
    addComment: function(com) {
        if (!this.comments) this.comments = [];
        if (this.comments.length == 0) {
            this.commentButton.activate();
        }
        this.comments.push(com);
    },
    showCommentCount: function() {
        this.comment_container.innerHTML += this.comments.length;
    }
});
Ten.EventDispatcher.implementEventDispatcher(Hatena.Star.Entry);

/* Hatena.Star.Button */
Hatena.Star.Button = new Ten.Class({
    createButton: function(args) {
        var img = document.createElement('img');
        for (var attr in args) {
            img.setAttribute(attr, args[attr]);
        }
        var s = img.style;
        s.cursor = 'pointer';
        s.margin = '0 3px';
        s.padding = '0';
        s.border = 'none';
        s.verticalAlign = 'middle';
        return img;
    },
    getImgSrc: function(c,container) {
        var sel = c.ImgSrcSelector;
        if (container) {
            var cname = sel.replace(/\./,'');
            var span = new Ten.Element('span',{
                className: cname
            });
            container.appendChild(span);
            var bgimage = Ten.Style.getElementStyle(span,'backgroundImage');
            container.removeChild(span);
            if (bgimage) {
                var url = Ten.Style.scrapeURL(bgimage);
                if (url) return url;
            }
        }
        if (sel) {
            var prop = Ten.Style.getGlobalStyle(sel,'backgroundImage');
            if (prop) {
                var url = Ten.Style.scrapeURL(prop);
                if (url) return url;
            }
        }
        return c.ImgSrc;
    }
});

/* Hatena.Star.AddButton */
Hatena.Star.AddButton = new Ten.Class({
    base: [Hatena.Star.Button],
    initialize: function(entry,container) {
        this.entry = entry;
        this.lastPosition = null;
        this.selectedText = null;
        this.showSelectedColorTimerId = null;
        this.hideSelectedColorTimerId = null;
        var src = Hatena.Star.Button.getImgSrc(this.constructor,container);
        var img = this.constructor.createButton({
            src: src,
            tabIndex: 0,
            alt: 'Add Star',
            title: 'Add Star'
        });
        if (!img.className) {
            img.className = 'hatena-star-add-button';
        }
        this.img = img;
        this.setupObservers();
        return img;
    },
    ImgSrcSelector: '.hatena-star-add-button-image',
    ImgSrc: Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + 'images/add.gif',
    AddStarPath: 'star.add.json'
},{
    setupObservers: function () {
        new Ten.Observer(this.img,'onclick',this,'addStar');
        new Ten.Observer(this.img,'onkeyup',this,'handleKeyUp');
        new Ten.Observer(this.img,'onmouseover',this,'copySelectedText');
        if ( Hatena.Star.Config.isColorPalletAvailable ) {
            new Ten.Observer(this.img,'onclick',this,'hideColorPallet');
            new Ten.Observer(this.img,'onmouseover',this,'showColorPalletDelay');
//          new Ten.Observer(this.img,'onmouseover',this,'showSelectedColor');
//          new Ten.Observer(this.img,'onmouseout',this,'hideSelectedColor');
            new Ten.Observer(this.img,'onmouseout',this,'clearSelectedColorTimer');
        }
    },
    handleKeyUp: function(e) {
        if (!e.isKey('enter')) return;
        this.addStar(e);
    },
    clearSelectedColorTimer : function() {
        try{ clearTimeout(this.showSelectedColorTimerId); }catch(e){};
        try{ clearTimeout(this.hideSelectedColorTimerId); }catch(e){};
    },
    showSelectedColor : function(e) {
        var self = this;
        this.clearSelectedColorTimer();
        this.showSelectedColorTimerId = setTimeout(function(){
            //if (!self.pallet || (self.pallet && self.pallet.isColorPallet()) ) self._showSelectedColor();
            self._showSelectedColor();
        },300);
    },
    _showSelectedColor : function(e) {
        if (this.pallet) {
        } else {
            this.pallet = new Hatena.Star.Pallet();
        }
        if (this.pallet.isNowLoading) return;
        var pos = Ten.Geometry.getElementPosition(this.img);
        if (Ten.Browser.isFirefox || Ten.Browser.isOpera) {
            pos.y += 15;
            pos.x += 2;
        } else {
            pos.y += 13;
        }
        this.pallet.showSelectedColor(pos, this);
    },
    hideColorPallet : function(e) {
        try {
            this.pallet.hide();
        } catch(e) {}
    },
    hideSelectedColor : function(e) {
        var self = this;
        this.clearSelectedColorTimer();
        this.hideSelectedColorTimerId = setTimeout(function(){
            if (self.pallet.isSelectedColor) {
                //if (!self.pallet || (self.pallet && self.pallet.isSelectedColor()) ) self._showSelectedColor();
                self.pallet.hide();
            }
        },2000);
    },
    showColorPalletDelay : function(e) {
        var self = this;
        this.clearSelectedColorTimer();
        this.showSelectedColorTimerId = setTimeout(function(){
            //if (!self.pallet || (self.pallet && self.pallet.isColorPallet()) ) self._showSelectedColor();
            self.showColorPallet();
        },800);
    },
    showColorPallet : function(e) {
        this.clearSelectedColorTimer();
        if (!this.pallet) this.pallet = new Hatena.Star.Pallet();
        var pos = Ten.Geometry.getElementPosition(this.img);
        if (Ten.Browser.isFirefox || Ten.Browser.isOpera) {
            pos.y += 15;
            pos.x += 2;
        } else {
            pos.y += 13;
        }
        this.pallet.showPallet(pos, this);
    },
    copySelectedText: function(e) {
        try {
        this.selectedText = Ten.DOM.getSelectedText().substr(0,200);
        } catch (e) {  }
    },
    addStar: function(e) {
        this.clearSelectedColorTimer();
        this.color = (this.color) ? this.color : 'yellow';
        this.entry.addTemporaryStar({color: this.color});
        this.lastPosition = e.mousePosition();
        var quote = this.selectedText || '';
        var uri = Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + this.constructor.AddStarPath + '?uri=' + encodeURIComponent(this.entry.uri) +
            '&title=' + encodeURIComponent(this.entry.title) +
            '&quote=' + encodeURIComponent(quote) +
            '&location=' + encodeURIComponent(document.location.href);
        if (Hatena.Star.Token) {
            uri += '&token=' + Hatena.Star.Token;
        }

        if (Hatena.Visitor) {
            if (Hatena.Visitor.RKS) {
                Hatena.Star.User.RKS.ready(Hatena.Visitor.RKS);
            }
            if (Hatena.Visitor.sessionParams) {
                var params = Hatena.Visitor.sessionParams;
                for (var key in params) {
                    uri += '&' + key + '=' + encodeURIComponent(params[key]);
                }
            }
        }

        var self = this;
        Hatena.Star.User.RKS.required(function (rks) {
            uri += '&rks=' + rks;
            new Ten.JSONP(uri, self, 'receiveResult');
        });
    },
    receiveResult: function(args) {
        this.entry.removeTemporaryStar();
        var name = args ? args.name : null;
        var color = args ? args.color : '';
        var pos = this.lastPosition;
        pos = (pos) ? pos : Ten.Geometry.getElementPosition(this.img);
        pos.x -= 10;
        pos.y += 25;
        if (name) {
            this.entry.addStar({
                color: color,
                name: name,
                quote: args.quote
            });
            //alert('Succeeded in Adding Star ' + args);
        } else if (args.is_guest && args.html) {
            var win = new Hatena.LoginWindow();
            win.addLoginForm(args.html);
            win.show(pos);
        } else if (args.errors) {
            var scroll = Ten.Geometry.getScroll();
            var scr = new Hatena.Star.AlertScreen();
            var alert = args.errors[0];
            scr.showAlert(alert, pos);
        }
    }
});

/* Hatena.Star.Pallet */
Hatena.Star.Pallet = new Ten.Class({
    base: [Ten.SubWindow],
    style: {
        padding: '0px',
        textAlign: 'center',
        border: '0px'
    },
    containerStyle: {
        textAlign: 'left',
        margin: 0,
        padding: 0
    },
    handleStyle: null,
    showScreen: false,
    closeButton: null,
    draggable: false,
    SELECTED_COLOR_ELEMENT_ID: 'hatena-star-selected-color',
    PALLET_ELEMENT_ID: 'hatena-star-color-pallet',
    PALLET_PATH: 'colorpalette',
    PALLET_STYLE: 'width:16px;height:51px;overflow:hidden;'
},{
    isSelectedColor : function() {
        return (this.container && this.container.getElementById && this.container.getElementById(Hatena.Star.Pallet.SELECTED_COLOR_ELEMENT_ID)) ? true : false;
    },
    isColorPallet : function() {
        return (this.container && this.container.getElenentById && this.container.getElementById(Hatena.Star.Pallet.PALLET_ELEMENT_ID)) ? true : false;
    },
    showSelectedColor: function(pos, addButton) {
        this.hide();
        this.container.innerHTML = '';
        if (addButton) this.addButton = addButton;
        if (pos) this.selected_color_pos = pos;
        var iframeStyle;
        if (Ten.Browser.isIE) iframeStyle = "width:16px;height:5px;border:1px solid #bbbbbb;";
        else iframeStyle = "width:14px;height:3px;border:1px solid #bbbbbb;";
        this.container.innerHTML = '<iframe id="' + Hatena.Star.Pallet.SELECTED_COLOR_ELEMENT_ID + '" src="' + 
        Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + 'colorpalette.selected_color?uri=' + encodeURIComponent(this.addButton.entry.uri) +
            '" frameborder="0" border="0" scrolling="no" style="' + iframeStyle + 'position:absolute;margin:0;padding:0;overflow:hidden;"/>';
        var clickhandlerStyle = {
            position: "absolute",
            top: "0px",
            left: "0px",
            width: "16px",
            height: "5px",
            margin: "0",
            padding: "0",
            display: "block",
            cursor: "pointer"
        }; 
        var E = Ten.Element;
        var div = E('div',{
                title : 'select color',
                alt   : 'select color',
                style : clickhandlerStyle
            });
        this.container.appendChild(div);
        this.selectedColor =this.container.childNodes[0];
        this.isNowLoading = true;
        new Ten.Observer(this.selectedColor,'onload',this , 'showSelectedColorDelay');
        new Ten.Observer(this.container.childNodes[1],'onclick',this.addButton,'showColorPallet');
        //this.show(this.selected_color_pos);
    },
    showSelectedColorDelay: function() {
        this.show(this.selected_color_pos);
        this.isNowLoading = false;
        this.screen.style.display = 'none';
    },
    getPalletFrameURL: function () {
        return Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + this.constructor.PALLET_PATH + '?uri=' + encodeURIComponent(this.addButton.entry.uri) + '&location=' + encodeURIComponent(document.location.href);
    },
    showPallet: function(pos, addButton) {
        this.hide();
        this.container.innerHTML = '';
        if (addButton) this.addButton = addButton;
        if (pos) this.pallet_pos = pos;
        this.addButton.clearSelectedColorTimer();
        this.container.innerHTML = '<iframe id="' + Hatena.Star.Pallet.PALLET_ELEMENT_ID + '" src="' + this.getPalletFrameURL() + '" frameborder="0" border="0" scrolling="no" style="' + this.constructor.PALLET_STYLE +'"/>';
        this.pallet =this.container.childNodes[0];
        this.isNowLoading = true;
        this._pallet_onloaded = 0;
        new Ten.Observer(this.pallet,'onload',this , 'observerSelectColor');
//        new Ten.Observer(this.pallet,'onmouseout',this , 'hidePallet');
//        this.show(this.pallet_pos);
    },
    hidePallet: function() {
        var self = this;
        setTimeout(function() {
            if( self.isColorPallet) self.showSelectedColor();
        },2000);
    },
    selectColor: function(e){
        this.addButton.color = e.target.className.split('-')[2];
        this.showSelectedColor();
//        this.hide();
    },
    observerSelectedColor: function(){
        this.show(this.pallet_pos);
    },
    observerSelectColor: function(e){
        this._pallet_onloaded = (this._pallet_onloaded) ? this._pallet_onloaded : 0;
        this._pallet_onloaded ++;
        if (this._pallet_onloaded == 1){
            this.show(this.pallet_pos);
            this.isNowLoading = false;
        } else if (this._pallet_onloaded > 1) {
            this._pallet_onloaded = 0;
            this.hide();
            this.addButton.addStar(e);
            this._pallet_onloaded = 0;
//            this.hide();
//            this.showSelectedColor();
//            this.isNowLoading = true;
//            this.addButton.hideSelectedColor();
        }
    }
});

/* Hatena.Star.AddButton.SmartPhone */
Hatena.Star.AddButton.SmartPhone = new Ten.Class({
    base: [Hatena.Star.AddButton],
    AddStarPath: 'star.add_multi.json',
    createButton: function (args) {
        var a = document.createElement('a');
        var img = this.SUPER.createButton(args);
        img.className = 'hatena-star-add-button';
        a.className = 'hatena-star-add-button-link-smartphone';
        a.href = 'javascript:void(0)';
        a.appendChild(img);
        return a;
    }
}, {
    setupObservers: function () {
        if ( Hatena.Star.Config.isColorPalletAvailable ) {
            new Ten.Observer(this.img, 'onclick', this, 'showColorPallet');
            //new Ten.Observer(this.img, 'onclick', this, 'hideColorPallet');
        }
    },
    receiveResult: function (args) {
        if (args.silent_error) {
            this.entry.removeTemporaryStar();
            return;
        }

        if (args.stars instanceof Array) {
            this.entry.removeTemporaryStar();
            var stars = args.stars;
            for (var i = 0, len = stars.length; i < len; i++) {
                var star = stars[i];
                for (var j = 0; j < (star.count || 1); j++) {
                    this.entry.addStar({
                        color: star.color,
                        name:  star.name,
                        quote: star.quote
                    });
                }
            }
        } else {
            this.constructor.SUPER.prototype.receiveResult.apply(this, arguments);
        }
    },
    showColorPallet: function (e) {
        this.clearSelectedColorTimer();

        if (!this.pallet) {
            this.pallet = new Hatena.Star.Pallet.SmartPhone();
        }

        var pos = Ten.Geometry.getElementPosition(this.img);
        pos.x = Ten.Browser.isDSi ? 5 : 15;
        pos.y += 18;
        this.pallet.showPallet(pos, this);
        this.pallet.show(Hatena.Star.UseAnimation ? { x: 0, y: 0 } : pos);
    },
    getPalletFrameURL: function () {
        return Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + this.constructor.PALLET_PATH + '?uri=' + encodeURIComponent(this.addButton.entry.uri) + '&location=' + encodeURIComponent(document.location.href) + '&colorscheme=' + this.constructor.getColorScheme();
    }
});

/* Hatena.Star.Pallet.SmartPhone */
Hatena.Star.Pallet.SmartPhone_BASE_WIDTH = Ten.Browser.isDSi ? 230 : 45 * 6 + 5 * 2;
Hatena.Star.Pallet.SmartPhone = new Ten.Class({
    base: [Hatena.Star.Pallet],
    PALLET_PATH: 'colorpalette.smartphone',
    PALLET_STYLE: 'top: 0px; left: 0px; width:100px; height:80px; overflow:hidden;' + (!Ten.Browser.isDSi ? 'background:transparent;' : ''),
    closeButton: null,
    style: {
        padding: '0px',
        textAlign: 'center',
        border: '0px',
        background: (!Ten.Browser.isDSi ? 'transparent' : '')
    },
    containerStyle: {
        color: function () { return Hatena.Star.Pallet.SmartPhone.getColorSchemeItem('color') },
        textAlign: 'left',
        margin: 0,
        padding: 0,
        width: Hatena.Star.Pallet.SmartPhone_BASE_WIDTH + 'px',
        height: '125px',
        background: (!Ten.Browser.isDSi ? 'transparent' : '')
    },
    backgroundContainerStyle: {
        margin: 0,
        padding: 0,
        width: Hatena.Star.Pallet.SmartPhone_BASE_WIDTH + 'px',
        height: '125px',
        background: function () { return Hatena.Star.Pallet.SmartPhone.getColorSchemeItem('backgroundContainerBackground') },
        border: function () { return Hatena.Star.Pallet.SmartPhone.getColorSchemeItem('backgroundContainerBorder') },
        borderRadius: function () { return Hatena.Star.Pallet.SmartPhone.getColorSchemeItem('backgroundContainerBorderRadius') },
        MozBorderRadius: function () { return Hatena.Star.Pallet.SmartPhone.getColorSchemeItem('backgroundContainerBorderRadius') },
        WebkitBorderRadius: function () { return Hatena.Star.Pallet.SmartPhone.getColorSchemeItem('backgroundContainerBorderRadius') },
        position: 'absolute',
        display: 'inline',
        zIndex: 10000
    },
    closeIframeStyle: {
        position: 'absolute',
        zIndex: 5,
        width: '19px',
        height: '19px',
        background: 'rgba(0, 0, 0, 0)',
        border: '0px'
    },
    closeButtonStyle: {
        position: 'absolute',
        margin: 0,
        padding: 0,
        top: '0px',
        left: '0px',
        cursor: 'pointer'
    },

    // Color schems
    // Hatena.Star.Pallet.SmartPhone.ColorScheme = 'dark';
    COLOR_SCHEME_DEFINITIONS: {
        dark: {
            backgroundContainerBackground: (!Ten.Browser.isDSi ? 'rgba(10, 10, 10, 0.7)' : '#505050'),
            color: 'white',
            closeButtonColor: 'white',
            closeButtonImagePadding: '0 3px 0 0',
            closeButtonTop: '8px',
            closeButtonRight: '10px',
            getCloseButtonImage: function () { return Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + 'images/close_wh.png' }
        },
        light: {
            backgroundContainerBackground: '#FFF',
            backgroundContainerBorder: '1px solid #BBB',
            backgroundContainerBorderRadius: '6px',
            color: 'black',
            closeButtonColor: 'rgb(187,187,187)',
            closeButtonImagePadding: '0 1px 3px 0',
            closeButtonTop: '5px',
            closeButtonRight: (Ten.Browser.isDSi ? '5px' : '15px'),
            getCloseButtonImage: function () { return Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + 'images/close.gif' }
        }
    },
    DEFAULT_COLOR_SCHEME: 'light',
    getColorScheme: function () {
        return this.ColorScheme || this.DEFAULT_COLOR_SCHEME;
    },
    getColorSchemeItem: function (name) {
        var schemeName = this.getColorScheme();
        var scheme = this.COLOR_SCHEME_DEFINITIONS[schemeName] || this.COLOR_SCHEME_DEFINITIONS[this.DEFAULT_COLOR_SCHEME];
        return scheme[name];
    }
}, {
    showPallet: function (pos, addButton) {
        if (Hatena.Star.UseAnimation) {
            this.container.style.width = Ten.Geometry.getDocumentSize().w + 'px';
            this.container.style.height = Ten.Geometry.getDocumentSize().h + 'px';
        }

        this.hide();
        this.container.innerHTML = '';
        if (addButton) this.addButton = addButton;
        if (pos) this.pallet_pos = pos;
        this.addButton.clearSelectedColorTimer();
        this.container.innerHTML =
            '<div id="hatena-star-pallet-container">' + 
                '<div id="touch-instruction" class="message">' + Hatena.Star.Text.colorstar_for_smartphone + '</div>' +
                '<div id="sending-message" class="message" style="display: none">' + Hatena.Star.Text.sending + '</div>' +
                '<div class="pallet-container">' +
                    '<div class="pallet">' +
                        '<a href="#"><img src="' + Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + '/images/spacer.gif" id="hatena-star-yellow" class="star yellow post" alt="Add Yellow Star" title="Add Yellow Star" /></a>' +
                        '<div class="star"><span class="star yellow unlimited">' + Hatena.Star.Text.unlimited + '</span></div>' +
                    '</div>' +
                    '<div class="iframe-loading-message">' + Hatena.Star.Text.loading + '</div>' +
                    '<iframe id="' + Hatena.Star.Pallet.PALLET_ELEMENT_ID + '" src="' + this.getPalletFrameURL() + '" frameborder="0" border="0" scrolling="no"></iframe>' +
                '</div>' + 
                '<a href="' + Hatena.Star.PortalURL.replace(/http/, 'https') + '/shop/star?location=' + encodeURIComponent(location.href) + '" id="buy" target="' + (Ten.Browser.isDSi ? '_top' : '_blank' ) + '"><img src="' + Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + 'images/buy_star_cart_purple.gif" class="cart">' + Hatena.Star.Text.for_colorstar_shop + '</a>' +
            '</div>' + 
            '<style type="text/css">' +
                '#hatena-star-pallet-container {' +
                    'color: ' + (Hatena.Star.Pallet.SmartPhone.ColorScheme == 'dark' ? 'white' : 'black') + ';' +
                '}' +
                '#hatena-star-pallet-container .message {' +
                    'padding: 7px 10px;' +
                    'font-size: 14px;' +
                '}' +
                '#hatena-star-pallet-container .pallet-container {' +
                    'position: relative;' + 
                    'margin: 0 5px 0 45px;' + 
                    'height: 65px;' +
                    (Ten.Browser.isDSi ? 'margin: 0 10px 0 10px;' : '') +
                '}' +
                '#hatena-star-pallet-container .pallet {' +
                    'position: absolute;' +
                    'top: 0;' +
                    'left: 0;' +
                    'width: 39px;' +
                    'height: 60px;' +
                    'text-align: center;' +
                    'color: #FECD69;' + 
                    'font-weight: bold;' + 
                '}' +
                '#hatena-star-pallet-container #hatena-star-yellow {' +
                    'background: url(' + Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + (Hatena.Star.Pallet.SmartPhone.ColorScheme == 'dark' ? '/images/add_star_for_smartphone_bk.gif' : '/images/add_star_for_smartphone_wh.gif') + ') 0 0;' +
                    'width: 39px;' +
                    'height: 39px;' +
                    'border: 0;' +
                '}' +
                '#hatena-star-pallet-container a.active #hatena-star-yellow {' +
                    'background: url(' + Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + (Hatena.Star.Pallet.SmartPhone.ColorScheme == 'dark' ? '/images/add_star_for_smartphone_bk.gif' : '/images/add_star_for_smartphone_wh.gif') + ') 0 39px;' +
                    'width: 39px;' +
                    'height: 39px;' +
                    'border: 0;' +
                '}' +
                '#hatena-star-pallet-container iframe ,' +
                '#hatena-star-pallet-container .iframe-loading-message {' +
                    'position: absolute;' +
                    'top: 0;' +
                    'left: 42px;' +
                    'width: 173px;' +
                    'height: 65px;' +
                '}' +
                '#hatena-star-pallet-container .iframe-loading-message {' +
                    'text-align: left;' +
                    'padding: 12px 40px 12px 40px;' +
                '}' +
                '#hatena-star-pallet-container #buy {' +
                    'text-align: right;' +
                    'float: right;' +
                    'color: #ff7000;' +
                    'text-decoration:none;' +
                    'margin-top: 5px;' +
                    'margin-right: 12px;' +
                '}' +
            '</style>'
        ;
        this.pallet =this.container.getElementsByTagName('iframe')[0];
        this.pallet.style.visibility = 'hidden';
        this.isNowLoading = true;
        this._pallet_onloaded = 0;
        this.loadingMessage = Ten.querySelector('div.iframe-loading-message', this.container);

        var star_yellow = document.getElementById('hatena-star-yellow');
        new Ten.Observer(star_yellow, 'onclick', function (e) {
            e.stop();
            Hatena.Star.AddButton.SmartPhone.AddStarPath = 'star.add.json';
            addButton.addStar(e);
            Hatena.Star.AddButton.SmartPhone.AddStarPath = 'star.add_multi.json';
        });
        if (Ten.Browser.isDSi) {
            var img = star_yellow;
            new Ten.Observer(star_yellow, 'onmousedown', function (e) {
                if (img._activeTimer) {
                    clearTimeout(img._activeTimer);
                }
                img.parentNode.className = 'active';
            });
            new Ten.Observer(star_yellow, 'onmouseup', function (e) {
                img._activeTimer = setTimeout(
                    function () { img.parentNode.className = '' },
                    100
                );
            });
        }

        new Ten.Observer(this.pallet, 'onload', this, 'observerSelectColor');

        var self = this;
        window.addEventListener("message", function (e) { if (e.data == 'sending') self.sending() }, false);

        this.showBackgroundContainer(this.pallet_pos);
        this.showCloseButton();
        if (Ten.Browser.isAndroid) {
            var self = this;
//            var listener = function (e) {
//                e.preventDefault();
//                e.stopPropagation();
//                self.hide();
//                document.body.removeEventListener('click', listener, true);
//            };
//            document.body.addEventListener('click', listener, true);
        } else {
            this.showScreen();
        }

        if (Ten.Browser.isAndroid) {
            var self = this;
            setTimeout(function () { try {

            // var time = new Date().getTime();

            var xs = self.pallet_pos.x - document.body.scrollLeft;
            var ys = self.pallet_pos.y - document.body.scrollTop;
            var xe = xs + (self.container.offsetWidth  || 500);
            var ye = ys + (self.container.offsetHeight || 300);

            // alert([xs, ys, xe, ye, self.container.offsetWidth, self.container.offsetHeight, document.elementFromPoint(0, 0)]);

            self._checkedElements = [];

            self.backgroundContainer.style.display = 'none';
            self.container.style.display = 'none';
            for (var y = ys; y < ye; y += 5) {
                for (var x = xs; x < xe; x += 5) {
                    var e = document.elementFromPoint(x, y);
                    if (!e) continue;
                    if (e._checked) continue;

                    if (e.nodeName == 'INPUT' || e.nodeName == 'TEXTAREA') {
                        e._orig_disabled = e.disabled;
                        e.disabled = true;
                    } else
                    if ((a = ancestor(e, 'A', 3))) {
                        if (a._checked) continue; a._checked = true; self._checkedElements.push(a);
                        a._orig_style = a.getAttribute('style');
                        a.setAttribute('style', document.defaultView.getComputedStyle(a, "").cssText);
                        // a.style.outline = "1px solid red";

                        a.setAttribute('xhref', a.getAttribute('href'));
                        a.removeAttribute('href');
                    }

                    e._checked = true; self._checkedElements.push(e);
                }
            }
            self.backgroundContainer.style.display = 'block';
            self.container.style.display = 'block';

            function ancestor(e, name, deep) {
                if (e.nodeName == name) return e;
                if (e.parentNode) {
                    if (deep < 0) return null;
                    return ancestor(e.parentNode, name, deep - 1);
                } else {
                    return null;
                }
            }

            // console.log((new Date()).getTime() - time + 'msec');
            } catch (e) { alert(e) } }, 10);
        }

    },
    hide: function (e) {
        if (e && e.stop) {
            e.stop();
        }

        if (Ten.Browser.isAndroid) {
            try {
            var links  = document.querySelectorAll('a[xhref]');
            for (var i = 0, len = links.length; i < len; i++) {
                var a = links[i];
                a.setAttribute('href', a.getAttribute('xhref'));
                a.removeAttribute('xhref');

                a.setAttribute('style', a._orig_style);
            }
            var inputs = document.querySelectorAll('input, textarea');
            for (var i = 0, len = inputs.length; i < len; i++) {
                inputs[i].disabled = inputs[i]._orig_disabled;
            }

            if (this._checkedElements) for (var i = 0, len = this._checkedElements.length; i < len; i++) {
                this._checkedElements[i]._checked = false;
            }
            } catch (e) { alert(e) }
        }


        this.hideBackgroundContainer();
        this.hideCloseIframe();
        this.constructor.SUPER.prototype.hide.apply(this, arguments);

    },
    showScreen: function() {
        if (!this.screen) {
            var c = this.constructor;
            var screen = document.createElement('div');
            Ten.Style.applyStyle(screen, Ten.SubWindow._baseScreenStyle);
            Ten.Style.applyStyle(screen, c.screenStyle);
            document.body.appendChild(screen);
            screen.style.position = 'fixed';
            screen.style.height = document.body.scrollHeight + 'px';
            this.screen = screen;
            new Ten.Observer(screen, 'click', this, 'hide');
        } else {
            Ten.DOM.show(this.screen);
        }
    },
    hideScreen: function () {
        if (this.screen) {
            Ten.DOM.hide(this.screen);
        }
    },
    showBackgroundContainer: function(pos) {
        if (!this.backgroundContainer) {
            var div = document.createElement('div');
            Ten.Style.applyStyle(div, this.constructor.backgroundContainerStyle);
            this.backgroundContainer = div;
            document.body.appendChild(div);
        }
        this.backgroundContainer.style.left = pos.x + 'px';
        this.backgroundContainer.style.top  = pos.y + 'px';
        Ten.DOM.show(this.backgroundContainer);
    },
    hideBackgroundContainer: function() {
        if (this.backgroundContainer) {
            Ten.DOM.hide(this.backgroundContainer);
        }
    },
    showCloseButton: function () {
        if (!this.closeButton) {
            var closeButton = Ten.Element(
                'a', { href: 'javascript:void(0)' },
                Ten.Element('img', { src: this.constructor.getColorSchemeItem('getCloseButtonImage')(), style: { verticalAlign: 'middle', padding: this.constructor.getColorSchemeItem('closeButtonImagePadding') } }),
                Hatena.Star.Text.close || 'Close'
            );
            new Ten.Observer(closeButton, 'onclick', this, 'hide');
            with (closeButton.style) {
                overflow      = 'hidden';
                position      = 'absolute';
                top           = this.constructor.getColorSchemeItem('closeButtonTop');
                right         = this.constructor.getColorSchemeItem('closeButtonRight');
                color         = this.constructor.getColorSchemeItem('closeButtonColor');
                verticalAlign = 'middle';
                lineHeight    = '19px';
                fontSize      = '12px';
            }
            this.window.appendChild(closeButton);
            this.closeButton = closeButton;
        }
    },
    showCloseIframe: function(pos) {
        if (!this.closeIframes) {
            var iframes = {  };
            var setupIframe = function(callback) {
                var iframe = document.createElement('iframe');
                document.body.appendChild(iframe);
                var doc = frames[frames.length-1].window.document;
                doc.open();
                doc.write('<h1>dummy</h1>');
                Ten.DOM.removeAllChildren(doc.body);
                if (callback) { callback(doc); };
                doc.close();
                return iframe;
            };
            var self = this;
            // var iframe = setupIframe(function(doc) {
            //     var btn = doc.createElement('img');
            //     btn.src = self.constructor.getColorSchemeItem('getCloseButtonImage')();
            //     btn.alt = 'close';
            //     //Ten.Style.applyStyle(btn, self.constructor.closeButtonStyle);
            //     btn.style.cursor = 'pointer';
            //     new Ten.Observer(doc.body, 'onclick', self, 'hide');
            //     doc.body.style.color = self.constructor.getColorSchemeItem('color');
            //     doc.body.appendChild(btn);
            //     doc.body.appendChild(
            //         document.createTextNode(Hatena.Star.Text.close || 'Close')
            //     );
            // });
            // iframes.button = iframe;
            this.showCloseButton();
            this.closeButton.style.right = Ten.Geometry.getWindowSize().w - (pos.x + Hatena.Star.Pallet.SmartPhone_BASE_WIDTH) + 'px';
            this.closeButton.style.top = pos.y + 12 + 'px';
            for(var i = 0;i < 4 && Hatena.Star.UseAnimation; i++) {
                iframes[i] = setupIframe(function(doc) {
                    new Ten.Observer(doc, 'onclick', self, 'hide');
                });
            }
            this.closeIframes = iframes;
        } else {
            var iframes = this.closeIframes;
        }
        var max = function(a, b) {
            return a > b ? a : b;
        };
        var docSize = {
            w: max(Ten.Geometry.getDocumentSize().w, Ten.Geometry.getWindowSize().w),
            h: max(Ten.Geometry.getDocumentSize().h, Ten.Geometry.getWindowSize().h)
        };
        var styles = [{
            // k
            top: '0px',
            left: '0px',
            width: docSize.w + 'px',
            height: pos.y + 'px'
        },{
            // l
            top: '0px',
            left: pos.x + Hatena.Star.Pallet.SmartPhone_BASE_WIDTH + 'px',
            width: docSize.w - Hatena.Star.Pallet.SmartPhone_BASE_WIDTH - pos.x + 'px',
            height: docSize.h + 'px'
        },{
            // h
            top: '0px',
            left: '0px',
            width: (Ten.Browser.isDSi ? 5 : 15 ) + 'px',
            height: docSize.h + 'px'
        },{
            // j
            top: pos.y + 140 + 'px',
            left: '0px',
            width: docSize.w + 'px',
            height: docSize.h - pos.y - 140 + 'px'
        }];
        for (var key in iframes) if (iframes.hasOwnProperty(key)) {
            var iframe = iframes[key];
            if (key == 'button') {
                Ten.Style.applyStyle(iframe, this.constructor.closeIframeStyle);
                Ten.Style.applyStyle(iframe, {
                    left: pos.x + Hatena.Star.Pallet.SmartPhone_BASE_WIDTH - 19 - 12 + 'px',
                    top: pos.y + 12 + 'px'
                });
            } else {
                Ten.Style.applyStyle(iframe, styles[key]);
                Ten.Style.applyStyle(iframe, {
                    position: 'absolute',
                    margin: '0px',
                    padding: '0px',
                    border: '0px',
                    zIndex: 100
                });
            }
            Ten.DOM.show(iframe);
        }
        this.closeIframes = iframes;
    },
    hideCloseIframe: function() {
        if (this.closeIframes) {
            var iframes = this.closeIframes;
            for (key in iframes) if (iframes.hasOwnProperty(key)) {
                var iframe = iframes[key];
                Ten.DOM.hide(iframe);
            }
        }
    },
    getPalletFrameURL: function () {
        var pos = this.pallet_pos;
        return this.constructor.SUPER.prototype.getPalletFrameURL.apply(this, arguments) + (Hatena.Star.UseAnimation ? '&left=' + pos.x + '&top=' + pos.y + '&anime=1' : '') + '&colorscheme=' + this.constructor.getColorScheme();
    },
    observerSelectColor: function (e) {
        this.pallet.style.visibility = 'visible';
        this.loadingMessage.style.display = 'none';
        this._pallet_onloaded = this._pallet_onloaded ? this._pallet_onloaded : 0;
        this._pallet_onloaded++;

        this.isNowLoading = false;
        if (this._pallet_onloaded > 1) {
            this.addButton.addStar(e);
        }

        Ten.DOM.show(document.getElementById('touch-instruction'));
        Ten.DOM.hide(document.getElementById('sending-message'));
    },
    sending : function () {
        Ten.DOM.hide(document.getElementById('touch-instruction'));
        Ten.DOM.show(document.getElementById('sending-message'));
    }
});

/* Hatena.Star.CommentButton */
Hatena.Star.CommentButton = new Ten.Class({
    base: [Hatena.Star.Button],
    initialize: function(entry,container) {
        this.entry = entry;
        this.lastPosition = null;
        this.container = container;
        var src = Hatena.Star.Button.getImgSrc(this.constructor,container);
        var img = Hatena.Star.Button.createButton({
            src: src,
            tabIndex: 0,
            alt: 'Comments',
            title: 'Comments'
        });
        img.className = 'hatena-star-comment-button';
        new Ten.Observer(img,'onclick',this,'showComments');
        new Ten.Observer(img,'onkeyup',this,'handleKeyUp');
        this.img = img;
        this.hide();
    },
    ImgSrcSelector: '.hatena-star-comment-button-image',
    ImgSrc: Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + 'images/comment.gif'
}, {
    handleKeyUp: function(e) {
        if (!e.isKey('enter')) return;
        var pos = Ten.Geometry.getElementPosition(this.img);
        e.mousePosition = function() {return pos};
        this.showComments(e);
    },
    showComments: function(e) {
        if (!this.screen) this.screen = new Hatena.Star.CommentScreen();
        this.screen.bindEntry(this.entry);
        var pos = e.mousePosition();
        pos.y += 25;
        this.screen.showComments(this.entry, pos);
    },
    hide: function() {
        this.img.style.margin = '0';
        this.img.style.display = 'none';
    },
    show: function() {
        this.img.style.margin = '0 3px';
        this.img.style.display = 'inline';
    },
    activate: function() {
        this.show();
        this.constructor = Hatena.Star.CommentButtonActive;
        this.img.src = Hatena.Star.Button.getImgSrc(this.constructor,this.container);
        Ten.DOM.addClassName(this.container, 'hatena-star-comment-active');
    }
});

/* Hatena.Star.CommentButtonActive */
Hatena.Star.CommentButtonActive = new Ten.Class({
    base: [Hatena.Star.CommentButton],
    ImgSrcSelector: '.hatena-star-comment-button-image-active',
    ImgSrc: Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + 'images/comment_active.gif'
});

/* Hatena.Star.Star */
Hatena.Star.Star = new Ten.Class({
    initialize: function(args) {
        if (args.img) {
            this.img = args.img;
            this.name = this.img.getAttribute('alt');
        } else {
            this.name = args.name;
            this.screen_name = args.screen_name || args.name;
            this.profile_icon = args.profile_icon;
            this.container = args.container;
            this.container._starColor = args.color;
            this.color = args.color;
            this.generateImg();
        }
        this.quote = args.quote;
        this.entry = args.entry;
        this.setImgObservers();

        this.user = new Hatena.Star.User(this.name);
        if (!this.screen_name || this.screen_name == this.name) {
            var self = this;
            Hatena.Star.User.withNickname(this.name, function (name) {
                self.screen_name = name;
            });
        }
        this.anchor = document.createElement('a');
        this.anchor.href = this.getAnchor();
        this.anchor.appendChild(this.img);

        this.count = args.count;

        if (this.quote && this.quote.length >= 3) {
            this.highlight = new Hatena.Star.Highlight(this.quote);
        }
    },
    gotImage: {},
    getImage: function(container) {
        var color = this.ColorPallet[container._starColor];
        color = (color) ? color : this.ColorPallet['yellow'];
        if (!this.gotImage[color.ImgSrc]) {
            var img = document.createElement('img');
            img.src = Hatena.Star.Button.getImgSrc(color,container);
            img.setAttribute('tabIndex', 0);
            img.className = 'hatena-star-star';
            var s = img.style;
            s.padding = '0';
            s.border = 'none';
            this.gotImage[color.ImgSrc] = img;
        }
        return this.gotImage[color.ImgSrc].cloneNode(false);
    },
//    ImgSrcSelector: '.hatena-star-star-image',
//    ImgSrc: Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + 'images/star.gif',
    ColorPallet : {
        'yellow' : {
            ImgSrcSelector: '.hatena-star-star-image',
            ImgSrc: Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + 'images/star.gif'
        },
        'green' : {
            ImgSrcSelector: '.hatena-star-green-star-image',
            ImgSrc: Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + 'images/star-green.gif'
        },
        'red' : {
            ImgSrcSelector: '.hatena-star-red-star-image',
            ImgSrc: Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + 'images/star-red.gif'
        },
        'blue' : {
            ImgSrcSelector: '.hatena-star-blue-star-image',
            ImgSrc: Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + 'images/star-blue.gif'
        },
        'purple' : {
            ImgSrcSelector: '.hatena-star-purple-star-image',
            ImgSrc: Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + 'images/star-purple.gif'
        },
        'temp' : {
            ImgSrcSelector: '.hatena-star-temp-star-image',
            ImgSrc: Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + 'images/star-temp.gif'
        }
    }
},{
    generateImg: function () {
        var img = Hatena.Star.Star.getImage(this.container);
        img.alt = this.screen_name;
        img.title = '';
        if (this.color && this.color != 'yellow' && this.color != 'temp') {
            img.alt = img.alt + ' (' + this.color  + ')';
        }
        this.img = img;
    },
    setImgObservers: function () {
        new Ten.Observer(this.img,'onmouseover',this,'showName');
        new Ten.Observer(this.img,'onmouseout',this,'hideName');
        if ( Hatena.Star.Config.isStarDeletable ) {
            new Ten.Observer(this.img,'onmouseover',this,'setTimerStarDeletion');
            new Ten.Observer(this.img,'onmouseout',this,'clearTimerStarDeletion');
        }
    },
    asElement: function() {
        if (this.count && this.count > 1) {
            var c = document.createElement('span');
            c.className = 'hatena-star-inner-count';
            var style = Hatena.Star.InnerCount.getStyle();
            if (style) Ten.Style.applyStyle(c, style);
            c.innerHTML = this.count;
            var s = document.createElement('span');
            s.appendChild(this.anchor);
            s.appendChild(c);
            return s;
        } else {
            return this.anchor;
        }
    },
    setTimerStarDeletion: function(e) {
        var self = this;
        if (this.deleteTimer) return;
        if (!this.name || !this.entry) return;
        if (!Hatena.Visitor) return;
        if (!Hatena.Visitor.RKS) return;
        this.deleteTimer = setTimeout(function() {
            self.deleteTimer = null;
            var uri = Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + 'star.deletable.json?name='
                + self.name + '&uri=' + encodeURIComponent(self.entry.uri);
            if (self.color) uri += '&color=' + self.color;
            if (self.quote) {
                uri += '&quote=' + encodeURIComponent(self.quote);
            }
            new Ten.JSONP(uri, self, 'confirmDeletable');
        }, 4000);
    },
    clearTimerStarDeletion: function() {
        if (this.deleteTimer) {
            clearTimeout(this.deleteTimer);
            this.deleteTimer = null;
        }
    },
    confirmDeletable: function(res) {
        if (res.result && res.confirm_html) {
          var pos = Ten.Geometry.getElementPosition(this.anchor);
          var scr = new Hatena.Star.DeleteConfirmScreen();
          scr.showConfirm(res.confirm_html, this, pos);
        } else if (res.result && res.message && confirm(res.message)) {
            this.deleteStar();
        }
    },
    deleteStar: function() {
        var uri = Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + 'star.delete.json?name='
            + this.name + '&uri=' + encodeURIComponent(this.entry.uri)
            + '&rks=' + Hatena.Visitor.RKS;
        if (this.color) uri += '&color=' + this.color;
        if (this.quote) {
            uri += '&quote=' + encodeURIComponent(this.quote);
        }
        new Ten.JSONP(uri, this, 'receiveDeleteResult');
    },
    receiveDeleteResult: function(res) {
        if (res && res.result) {
            this.anchor.style.display = 'none';
        }
    },
    showName: function(e) {
        if (!this.screen) this.screen = new Hatena.Star.NameScreen();
        var pos = e.mousePosition();
        pos.x += 10;
        pos.y += 25;
        if (this.highlight) this.highlight.show();
        this.screen.showName(this.screen_name, this.quote, pos, this.profile_icon, this.name);
    },
    hideName: function() {
        if (!this.screen) return;
        if (this.highlight) this.highlight.hide();
        this.screen.hide();
    },
    getAnchor: function () {
        if (Hatena.Star.isTouchUA) {
            if (Hatena.Star.getSmartPhoneDetailURL) {
                var url = Hatena.Star.getSmartPhoneDetailURL(this);
                if (url) {
                    return url;
                }
            }
            return Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + '/mobile/entry?uri=' + encodeURIComponent(this.entry.uri);
        } else {
            return this.user.userPage();
        }
    }
});

/* Hatena.Star.Highlight */
Hatena.Star.Highlight = new Ten.Class({
    base: [Ten.Highlight],
    ClassName: 'hatena-star-highlight'
});

/* from Hatena::Bookmark */
/* thx id:amachang / id:Yuichirou / id:os0x */
Hatena.Star.Highlight._show = Hatena.Star.Highlight.show;
Hatena.Star.Highlight.show = function() {
    setTimeout(function() {
        if (Hatena.Star.Highlight.asyncMakeTextNode) 
            Hatena.Star.Highlight.asyncMakeTextNode();
        Hatena.Star.Highlight._show();
    }, 10);
};

Hatena.Star.Highlight._makeTextNodes = Hatena.Star.Highlight.makeTextNodes;
Hatena.Star.Highlight.makeTextNodes = function(c) {
    if (c.asyncMakeTextNode || c.textNodes || c.textNodePositions || c.documentText) return;
    if (Ten.Highlight.highlighted) Ten.Highlight.highlighted.hide();
    
    if (!c.loaded && !c.prototype._show) {
        c.prototype._show = c.prototype.show;
        c.prototype.show = function() {
            c.prototype.show = c.prototype._show;
            var _self = this;
            var exec = function() {
                if (c.asyncMakeTextNode) {
                    c.asyncMakeTextNode();
                }
                _self.show();
            };
            exec();
        }
    }
    c.asyncMakeTextNode = function() {
        var textNodes = c.textNodes = [];
        var textNodePositions = c.textNodePositions = [];

        var pos = 0; 

        if (Ten.Browser.isSupportsXPath) {
            var result = document.evaluate('descendant::text()', document.body, null, 7, null);

            for (var i = 0, len = result.snapshotLength; i < len ; i ++) {
                var node = result.snapshotItem(i);
                textNodes.push(node);
                textNodePositions.push(pos);
                pos += node.length;
            }

            c.documentText = document.body.textContent || document.body.innerText;

        } else {
            var isIE = Ten.Browser.isIE;
            var texts = [];

            var fn = function(node, parent) {
                if (isIE && parent && parent != node.parentNode) return;
                if (node.nodeType == 3) {
                    textNodes.push(node);
                    texts.push(node.nodeValue);
                    textNodePositions.push(pos);
                    pos += node.nodeValue.length;
                } else {
                    var childNodes = node.childNodes;
                    for (var i = 0, len = childNodes.length; i < len; ++i) {
                        fn(childNodes[i], node);
                    }
                }
            };
            fn(document.body);

            c.documentText = texts.join('');
        }
        c.loaded = true;
        c.asyncMakeTextNode = null;
    };
    return;
}

/* Hatena.Star.InnerCount */
Hatena.Star.InnerCount = new Ten.Class({
    initialize: function(count, e, color) {
        this.count = count;
        this.entry = e;
        this.color = (color) ? color : '';
        var c = document.createElement('span');
        c.className = Hatena.Star.InnerCount.className(this.color);
        c.setAttribute('tabIndex', 0);
        var style = Hatena.Star.InnerCount.getStyle(color);
        if (style) Ten.Style.applyStyle(c, style);
        c.style.cursor = 'pointer';
        c.innerHTML = count;
        new Ten.Observer(c,'onclick',this,'showInnerStars');
        new Ten.Observer(c,'onkeyup',this,'handleKeyUp');
        this.container = c;
    },
    selectorName: function(color) {
        color = (color) ? color : '';
        var base = '.hatena-star-inner-count';
        if (color) base += '-';
        return base + color;
    },
    getStyle: function(color) {
        color = (color) ? color : '';
        var c = Hatena.Star.InnerCount;
        if (Ten.Style.getGlobalRule(c.selectorName(color))) {
            return null;
        } else {
            color = (color) ? color : 'yellow';
            var fontColor = Hatena.Star.InnerCount.fontColor[color];
            if (fontColor) c.style.color = fontColor;
            return c.style;
        }
    },
    className: function(color){
        return Hatena.Star.InnerCount.selectorName(color).substr(1);
    },
    style: {
        fontWeight: 'bold',
        fontSize: '80%',
        fontFamily: '"arial", sans-serif',
        margin: '0 2px'
    },
    fontColor: {
        yellow: '#f4b128',
        green: '#8ed701',
        red: '#ea475c',
        purple: '#cd34e3',
        blue: '#57b1ff'
    }
},{
    asElement: function() {
        return this.container;
    },
    handleKeyUp: function(e) {
        if (!e.isKey('enter')) return;
        this.showInnerStars(e);
    },
    showInnerStars: function() {
        var url = Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + 'entry.json?uri=' +
        encodeURIComponent(this.entry.uri);
        new Ten.JSONP(url, this, 'receiveStarEntry');
    },
    receiveStarEntry: function(res) {
        var se = res.entries[0];
        var e = this.entry;
        if (encodeURIComponent(se.uri) != encodeURIComponent(e.uri)) return;
        e.flushStars();
        e.bindStarEntry(se);
        e.addAddButton();
        e.showStars();
    }
});

/* Hatena.Star.Comment */
Hatena.Star.Comment = new Ten.Class({
    initialize: function(args) {
        this.name = args.name;
        this.body = args.body;
        this.id = args.id;
    }
},{
    asElement: function() {
        var div = new Ten.Element('div', {
            style: {
                margin: '0px 0',
                padding: '5px 0 5px 22px',
                lineHeight: '1.3',
                borderBottom: '1px solid #ddd'
            }
        });
        var ico = Hatena.Star.User.getProfileIcon(this.name);
        ico.style.marginLeft = '-22px';
        Hatena.Star.User.withNickname(this.name, function (name) {
            ico.title = name;
        });
        div.appendChild(ico);
        var span = document.createElement('span');
        span.style.fontSize = '90%';
        span.innerHTML = this.body;
        div.appendChild(span);
        if (this.deletable()) {
            new Hatena.Star.CommentDeleteButton(div, this);
        }
        return div;
    },
    deletable: function() {
        if (typeof(Hatena.Visitor) != 'undefined' &&
            typeof(Hatena.Visitor.name) != 'undefined' &&
            Hatena.Visitor.name == this.name) {
                return true;
            }
        return false;
    },
    deleteComment: function(callback) {
        if (!this.deletable()) return;
        if (!this.id) return;
        if (!Hatena.Visitor.RKS) return;
        var uri = Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + 'comment.delete.json?comment_id=' + this.id
            + '&rks=' + Hatena.Visitor.RKS;
        new Ten.JSONP(uri, callback);
    }
});

/* Hatena.Star.CommentDeleteButton */
Hatena.Star.CommentDeleteButton = new Ten.Class({
    initialize: function(parent, comment) {
        this.parent = parent;
        this.comment = comment;
        this.button = new Ten.Element('img', {
            src: Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + 'images/delete2.gif',
            alt: 'Delete',
            title: 'Delete',
            style: {
                margin: '0 3px',
                verticalAlign: 'middle',
                cursor: 'pointer',
                display: 'none'
            }
        });
        new Ten.Observer(this.parent, 'onmouseover', this, 'showButton');
        new Ten.Observer(this.button, 'onclick', this, 'deleteComment');
        this.parent.appendChild(this.button);
    }
}, {
    showButton: function() {
        this.button.style.display = 'inline';
        if (!this.hideObserver) {
            this.hideObserver = new Ten.Observer(this.parent, 'onmouseout', this, 'hideButton');
        }
    },
    hideButton: function() {
        this.button.style.display = 'none';
    },
    deleteComment: function() {
        var self = this;
        this.comment.deleteComment(function(res) {
            if (res.result) self.parent.style.display = 'none';
        });
    }
});

/* Hatena.Star.NameScreen */
Hatena.Star.NameScreen = new Ten.Class({
    base: [Ten.SubWindow],
    style: {
        padding: '2px',
        textAlign: 'center'
    },
    containerStyle: {
        textAlign: 'left',
        margin: 0,
        padding: 0
    },
    quoteStyle: {
        margin: '.3em .2em',
        padding: '.5em 0 0 0',
        fontSize: '80%',
        borderTop: '1px solid #bbb',
        color: '#777'
    },
    handleStyle: null,
    showScreen: false,
    closeButton: null,
    draggable: false
},{
    showName: function(name, quote, pos, src, urlName) {
        this.container.innerHTML = '';
        this.container.appendChild(Hatena.Star.User.getProfileIcon(urlName || name, src));
        this.container.appendChild(document.createTextNode(name || urlName));
        if (quote) {
            var blockquote = document.createElement('blockquote');
            Ten.Style.applyStyle(blockquote, this.constructor.quoteStyle);
            blockquote.innerHTML = '&quot; ' + quote + ' &quot;';
            this.container.appendChild(blockquote);
        }
        this.show(pos);
    }
});

/* Hatena.LoginWindow */
Hatena.LoginWindow = new Ten.Class({
    base: [Ten.SubWindow],
    style: {
        padding: '2px',
        textAlign: 'left',
        borderRadius: '6px',
        MozBorderRadius: '6px'
    },
    handleStyle: {
        position: 'absolute',
        top: '0px',
        left: '0px',
        backgroundColor: '#f3f3f3',
        borderBottom: '1px solid #bbb',
        width: '100%',
        height: '30px',
        borderRadius: '6px 6px 0 0',
        MozBorderRadius: '6px 6px 0 0'
    }
},{
    addLoginForm: function(html) {
        this.container.innerHTML = html;
        var form = this.container.getElementsByTagName('form')[0];
        var input = new Ten.Element('input',{
            type: 'hidden',
            name: 'location',
            value: document.location.href
        });
        form.appendChild(input);
    },
    hide: function () {
        var script = document.createElement('script');
        script.src = Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + 'js/HatenaStar.js';
        Hatena.Star = undefined;
        document.body.appendChild(script);
        Ten.SubWindow.prototype.hide.apply(this, arguments);
    }
});

/* Hatena.Star.AlertScreen */
Hatena.Star.AlertScreen = new Ten.Class({
    base: [Ten.SubWindow],
    style: {
        padding: '2px',
        textAlign: 'center',
        borderRadius: '6px',
        MozBorderRadius: '6px',
        width: '240px',
        height: '120px'
    },
    handleStyle: {
        position: 'absolute',
        top: '0px',
        left: '0px',
        backgroundColor: '#f3f3f3',
        borderBottom: '1px solid #bbb',
        width: '100%',
        height: '30px',
        borderRadius: '6px 6px 0 0',
        MozBorderRadius: '6px 6px 0 0'
    }
},{
    showAlert: function(msg, pos) {
        this.container.innerHTML = msg;
        var win = Ten.Geometry.getWindowSize();
        var scr = Ten.Geometry.getScroll();
        var w = parseInt(this.constructor.style.width) + 20;
        if (pos.x + w > scr.x + win.w) pos.x = win.w + scr.x - w;
        this.show(pos);
    }
});

/* Hatena.Star.DeleteConfirmScreen */
Hatena.Star.DeleteConfirmScreen = new Ten.Class({
    base: [Ten.SubWindow],
    style: {
        padding: '2px',
        textAlign: 'center',
        borderRadius: '6px',
        MozBorderRadius: '6px',
        width: '320px',
        height: '170px'
    },
    handleStyle: {
        position: 'absolute',
        top: '0px',
        left: '0px',
        backgroundColor: '#f3f3f3',
        borderBottom: '1px solid #bbb',
        width: '100%',
        height: '30px',
        borderRadius: '6px 6px 0 0',
        MozBorderRadius: '6px 6px 0 0'
    }
},{
  showConfirm: function(msg, star, pos) {
        this.container.innerHTML = msg;
        var win = Ten.Geometry.getWindowSize();
        var scr = Ten.Geometry.getScroll();
        var w = parseInt(this.constructor.style.width) + 20;
        if (pos.x + w > scr.x + win.w) pos.x = win.w + scr.x - w;
        this.show(pos);
    }

    // XXX star.receiveDeleteResult({result: 1})
});

/* Hatena.Star.CommentScreen */
Hatena.Star.CommentScreen = new Ten.Class({
    base: [Ten.SubWindow],
    initialize: function() {
        var self = this.constructor.SUPER.call(this);
        if (!self.commentsContainer) self.addCommentsContainer();
        return self;
    },
    style: {
        width: '280px',
        height: '280px',
        // overflow: 'auto',
        // overflowX: 'hidden',
        backgroundColor: '#f3f3f3',
        padding: '0',
        textAlign: 'center',
        borderRadius: '6px',
        MozBorderRadius: '6px'
    },
    handleStyle: {
        position: 'absolute',
        top: '0px',
        left: '0px',
        backgroundColor: '#f3f3f3',
        borderBottom: '1px solid #bbb',
        width: '100%',
        height: '30px',
        borderRadius: '6px 6px 0 0',
        MozBorderRadius: '6px 6px 0 0'
    },
    containerStyle: {
        backgroundColor: '#fff',
        overflow: 'auto',
        overflowX: 'hidden',
        height: '248px',
        margin: '32px 0 0 0',
        textAlign: 'left',
        padding: '0 10px'
    },
    getLoadImage: function() {
        var img = document.createElement('img');
        img.src = Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + 'images/load.gif';
        img.setAttribute('alt', 'Loading');
        var s = img.style;
        s.verticalAlign = 'middle';
        s.margin = '0 2px';
        return img;
    }
},{
    addCommentsContainer: function() {
        var div = document.createElement('div');
        Ten.Style.applyStyle(div, {
            margin: '0'
        });
        this.container.appendChild(div);
        this.commentsContainer = div;
    },
    showComments: function(e, pos) {
        var comments = e.comments;
        if (!comments) comments = [];
        this.commentsContainer.innerHTML = '';
        var cc = this.commentsContainer;
        for (var i=0; i<comments.length; i++) {
            cc.appendChild(comments[i].asElement());
        }
        if ( e.hasBoundToStarEntry() && !e.can_comment ) {
            this.hideCommentForm();
        } else {
            this.addCommentForm();
        }
        var win = Ten.Geometry.getWindowSize();
        var scr = Ten.Geometry.getScroll();
        var w = parseInt(this.constructor.style.width) + 20;
        var h = parseInt(this.constructor.style.height) + 20;
        if (pos.x + w > scr.x + win.w) pos.x = win.w + scr.x - w;
        if (pos.y + h > scr.y + win.h) pos.y = win.h + scr.y - h;
        this.show(pos);
    },
    bindEntry: function(e) {
        this.entry = e;
    },
    resizeCommentInput: function(e) {
        var ci = this.commentInput;
        if (ci.scrollHeight && (ci.clientHeight < ci.scrollHeight) && (ci.scrollHeight < 100)) {
            var h = ci.scrollHeight + 10;
            ci.style.height = h + 'px';
        }
    },
    sendComment: function(e) {
        var ci = this.commentInput;
        var body = ci.value;
        if (!body) return;
        ci.disabled = 'true';
        this.showLoadImage();
        var url = Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + 'comment.add.json?body=' + encodeURIComponent(body) +
            '&uri=' + encodeURIComponent(this.entry.uri) +
            '&title=' + encodeURIComponent(this.entry.title);
        if (Hatena.Visitor && Hatena.Visitor.RKS) {
            url += '&rks=' + Hatena.Visitor.RKS;
        }
        new Ten.JSONP(url, this, 'receiveResult');
    },
    handleKeyPress: function(e) {
        if (e.isKey('enter') && e.ctrlKey) {
            this.sendComment();
        }
    },
    receiveResult: function(args) {
        if (!args.name || !args.body) return;
        this.commentInput.value = ''; 
        this.commentInput.disabled = '';
        this.commentInput.style.height = '3em';
        this.commentInput.focus();
        this.hideLoadImage();
        var com = new Hatena.Star.Comment(args);
        this.entry.addComment(com);
        this.commentsContainer.appendChild(com.asElement());
    },
    showLoadImage: function() {
        if (!this.loadImage) return; 
        this.loadImage.style.display = 'inline';
    },
    hideLoadImage: function() {
        if (!this.loadImage) return; 
        this.loadImage.style.display = 'none';
    },
    hideCommentForm: function() {
        if (!this.commentForm) return;
        this.commentForm.style.display = 'none';
    },
    addCommentForm: function() {
        if (this.commentForm) {
            this.commentForm.style.display = 'block';
            return;
        }
        var form = new Ten.Element('div', {
            style : {
                margin: '0px 0',
                padding: '5px 0'
            }
        });
        this.container.appendChild(form);
        this.commentForm = form;
        var input = new Ten.Element('textarea', {
            style: {
                width: '220px',
                height: '3em',
                border: '1px solid #bbb',
                padding: '3px',
                overflow: 'auto'
            }
        });
        form.appendChild(input);
        this.commentInput = input;
        this.commentInputHeight = input.scrollHeight;
        form.appendChild(new Ten.Element('br'));
        var submit = new Ten.Element('input', {
            type: 'button',
            value: 'send'
        });
        form.appendChild(submit);
        this.submit = submit;
        var img = this.constructor.getLoadImage();
        this.loadImage = img;
        this.hideLoadImage();
        form.appendChild(img);
        new Ten.Observer(submit,'onclick',this,'sendComment');
        new Ten.Observer(input,'onkeypress',this,'handleKeyPress');
        new Ten.Observer(input,'onkeyup',this,'resizeCommentInput');
    }
});

/* Hatena.Star.EntryLoader */
Hatena.Star.EntryLoader = new Ten.Class({
    initialize: function() {
        var c = Hatena.Star.EntryLoader;
        c.loadNewEntries();
        c.finishLoad();
    },
    loadNewEntries: function(node) {
        var c = Hatena.Star.EntryLoader;
        if (!node) node = document.body;
        var entries_org = c.entries;
        c.entries = null;
        var entries;
        if (c.headerTagAndClassName) {
            entries = c.loadEntriesByHeader(node);
        } else if (c.loadEntries) {
            entries = c.loadEntries(node);
        } else {
            entries = c.loadEntriesByConfig(node);
        }
        c.entries = [];
        if (entries && typeof(entries.length) == 'number') {
            for (var i = 0; i < entries.length; i++) {
                var e = new Hatena.Star.Entry(entries[i]);
                e.showButtons();
                c.entries.push(e);
            }
        }
        c.getStarEntries();
        if (entries_org) {
            c.entries.push(entries_org);
            c.entries = Ten.Array.flatten(c.entries);
        }
    },
    createStarContainer: function() {
        var sc = document.createElement('span');
        sc.className = 'hatena-star-star-container';
        return sc;
    },
    createCommentContainer: function() {
        var cc = document.createElement('span');
        cc.className = 'hatena-star-comment-container';
        return cc;
    },
    scrapeTitle: function(node) {
        var rval = [];
        (function (node) {
            if (node.className == 'sanchor' || node.className == 'timestamp' ||
                node.className == 'edit') {
                    return;
            } else if (node.nodeType == 3 && !/\S/.test(node.nodeValue)) {
                return;
            }
            var cn = node.childNodes;
            if (cn) {
                for (var i = 0; i < cn.length; i++) {
                    arguments.callee.call(this, cn[i]);
                }
            }
            var nodeValue = node.nodeValue;
            if (typeof(nodeValue) == 'string') {
                rval.push(nodeValue);
            }
        })(node);
        var title = rval.join('');
        title = title.replace(/^[\s\n\r]+/, '');
        title = title.replace(/[\s\n\r]+$/, '');
        title = title.replace(/[\n\r]/g, '');
        return title;
    },
    getHeaders: function(node) {
        var t = Hatena.Star.EntryLoader.headerTagAndClassName;
        if (typeof(t[0]) == 'string') {
            return Ten.DOM.getElementsByTagAndClassName(t[0],t[1],node || document);
        } else {
            var elements = [];
            for (var i = 0; i < t.length; i++) {
                var elems = Ten.DOM.getElementsByTagAndClassName(t[i][0],t[i][1],node || document);
                for (var j = 0; j < elems.length; j++) {
                    elements.push(elems[j]);
                }
            }
            return elements;
        }
    },
    loadEntriesByHeader: function(node) {
        var c = Hatena.Star.EntryLoader;
        if (c.entries) return c.entries;
        var entries = [];
        var headers = c.getHeaders(node);
        for (var i = 0; i < headers.length; i++) {
            var header = headers[i];
            var a = header.getElementsByTagName('a')[0];
            if (!a) continue;
            var uri = a.href;
            var title = '';
            // Ten.DOM.removeEmptyTextNodes(header);
            var cns = header.childNodes;
            title = c.scrapeTitle(header);
            var cc = c.createCommentContainer();
            header.appendChild(cc);
            var sc = c.createStarContainer();
            header.appendChild(sc);
            entries.push({
                uri: uri,
                title: title,
                star_container: sc,
                comment_container: cc
            });
        }
        c.entries = entries;
        return entries;
    },
    loadEntriesByConfig: function(node) {
        var c = Hatena.Star.EntryLoader;
        if (c.entries) return c.entries;
        var entries = [];
        if (!Hatena.Star.SiteConfig) return null;
        var conf = Hatena.Star.SiteConfig.entryNodes;
        if (!conf) return null;
        for (var eselector in conf) {
            var enodes = Ten.Selector.getElementsBySelector(eselector,node);
            if (!enodes) continue;
            var sels = conf[eselector];
            if (!Ten.Array.isArray(sels)) sels = [sels];
            for (var i = 0; i < sels.length; i++) {
                var selectors = sels[i];
                for (var j = 0; j < enodes.length; j++) {
                    var enode = enodes[j];
                    var e = c.getEntryByENodeAndSelectors(enode, selectors);
                    if (e) entries.push(e);
                }
            }
        }
        c.entries = entries;
        return entries;
    },
    getEntryByENodeAndSelectors: function(enode,selectors) {
        var c = Hatena.Star.EntryLoader;
        var e = {entryNode: enode};
        var a = c.getElementByConfigSelector(selectors.uri, enode);
        if (!a) return null;
        e.uri = a.href;
        if (!e.uri) return null;
        var title = c.getElementByConfigSelector(selectors.title, enode);
        if (!title) return null;
        if (typeof(title) == 'string') {
            e.title = title;
        } else {
            e.title = c.scrapeTitle(title) || title.title || title.alt || '';
        }
        var cont = c.getElementByConfigSelector(selectors.container, enode);
        if (!cont) return null;
        e.comment_container = c.createCommentContainer();
        cont.appendChild(e.comment_container);
        e.star_container = c.createStarContainer();
        cont.appendChild(e.star_container);
        return e;
    },
    getElementByConfigSelector: function(selector,parent) {
        var truncate = false;
        selector = selector.replace(/::-ten-truncate$/, function () {
            truncate = true; return '';
        });

        var result = null;
        if (selector.match(/^document\.(location|title)$/)) {
            result = document[RegExp.$1];
        } else if (selector == 'window.location') {
            result = window.location;
        } else if (selector == 'parent') {
            result = parent;
        } else if (selector.match(/^link\[rel~?="?canonical"?\]$/)) {
            result = Ten.querySelector(selector);
        } else {
            result = Ten.Selector.getElementsBySelector(selector,parent)[0];
        }

        if (truncate && result && result.nodeType == 1) {
            result = Hatena.Star.EntryLoader.scrapeTitle(result) || result.title || result.alt || '';
            if (result.length > 30) {
                result = result.substring(0, 30) + '...';
            }
        }

        return result;
    },
    finishLoad: function() {
        var c = Hatena.Star.EntryLoader;
        c.dispatchEvent('load');
        c.loaded = true;
    },
    getStarEntries: function() {
        var c = Hatena.Star.EntryLoader;
        var entries = c.entries;
        if (!entries.length) return;
        var url = Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + 'entries.json?';
        if (Hatena.Star.noComments) {
          url += 'no_comments=1&';
        }
        for (var i = 0; i < entries.length; i++) {
            if (url.length > Ten.JSONP.MaxBytes) {
                new Ten.JSONP(url, c, 'receiveStarEntries');
                url = Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + 'entries.json?';
            }
            url += 'uri=' + encodeURIComponent(entries[i].uri) + '&';
        }
        if (!Hatena.Visitor) url += 'timestamp=1';
        new Ten.JSONP(url, c, 'receiveStarEntries');
    },
    receiveStarEntries: function(res) {
        var c = Hatena.Star.EntryLoader;
        var entries = res.entries;
        var encodedUriToEntryInfoMap = {};
        if (!entries) entries = [];
        for ( var i = 0, len = entries.length; i < len; ++i ) {
            var entryInfo = entries[i];
            if ( !entryInfo.uri ) continue;
            var eURI = entryInfo.eURI;
            if ( !eURI ) eURI = entryInfo.eURI = encodeURIComponent( entryInfo.uri );
            encodedUriToEntryInfoMap[eURI] = entryInfo;
        }
        for ( var i = 0, len = c.entries.length; i < len; ++i ) {
            var e = c.entries[i];
            var entryInfo;
            if ( e.hasBoundToStarEntry() ) continue;
            if ( !e.eURI ) e.eURI = encodeURIComponent(e.uri);
            if ( entryInfo = encodedUriToEntryInfoMap[e.eURI] ) {
                e.bindStarEntry( entryInfo );
            }
            if (typeof(e.can_comment) == 'undefined') {
                e.setCanComment(res.can_comment);
            }
            e.showStars();
            e.showCommentButton();
        }
        if (res.rks) {
            if (!Hatena.Visitor || typeof(Hatena.Visitor) == 'undefined') {
                Hatena.Visitor = {};
            }
            if (!Hatena.Visitor.RKS) {
                Hatena.Visitor.RKS = res.rks;
            }
        }
        Hatena.Star.User.RKS.ready(res.rks);
    },
    loaded: false,
    entries: null
});
Ten.EventDispatcher.implementEventDispatcher(Hatena.Star.EntryLoader);

/* Hatena.Star.ConfigLoader */
Hatena.Star.ConfigLoader = new Ten.Class({
    initialize: function() {
        var c = Hatena.Star.ConfigLoader;
        if (c.loaded) return true;
        if (Hatena.Star.SiteConfig ||
            Hatena.Star.EntryLoader.headerTagAndClassName ||
            Hatena.Star.EntryLoader.loadEntries) {
                c.finishLoad();
                return true;
            } else {
                c.loadConfig();
                return null;
            }
    },
    loadConfig: function() {
        var uri = Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol) + 'siteconfig.json?host=' + location.hostname;
        new Ten.JSONP(uri, Hatena.Star.ConfigLoader, 'setConfig');
    },
    setConfig: function(data) {
        var host = location.hostname;
        var conf = data[host];
        if (!conf && host.match(/^[\w-]+(\..+)$/)) {
            var host = '*' + RegExp.$1;
            conf = data[host] || [];
        }
        var path = location.pathname;
        for (var i = 0; i < conf.length; i++) {
            var c = conf[i];
            if (path.match(new RegExp(c.path))) {
                Hatena.Star.SiteConfig = c;
                Hatena.Star.ConfigLoader.finishLoad();
                return true;
            }
        }
        Hatena.Star.ConfigLoader.finishLoad();
        return null;
    },
    finishLoad: function() {
        var c = Hatena.Star.ConfigLoader;
        c.dispatchEvent('load');
        c.loaded = true;
    },
    loaded: false
});
Ten.EventDispatcher.implementEventDispatcher(Hatena.Star.ConfigLoader);

/* Hatena.Star.WindowObserver */
Hatena.Star.WindowObserver = new Ten.Class({
    initialize: function() {
        var c = Hatena.Star.WindowObserver;
        if (c.observer) return;
        Hatena.Star.loaded = true;
        if (Hatena.Star.onLoadFunctions) {
            for (var i = 0; i < Hatena.Star.onLoadFunctions.length; i++) {
                Hatena.Star.onLoadFunctions[i]();
            }
            Hatena.Star.onLoadFunctions = [];
        }
        c.observer = Ten.DOM.addEventListener('onload', function() {
            c.finishLoad();
            if (!Ten.Browser.isFirefox || parseInt(Ten.Browser.version) > 2) {
                new Ten.Observer(document.body, 'onclick', function(event){
                    try{
                        var pallet = new Hatena.Star.Pallet();
                        pallet.hide();
                    } catch(e) {}
                });
            }
            Hatena.Star.ConfigLoader.addEventListener('load', function() {
                new Hatena.Star.EntryLoader();
            });
            new Hatena.Star.ConfigLoader();
        });
    },
    finishLoad: function() {
        var c = Hatena.Star.WindowObserver;
        c.dispatchEvent('load');
        c.loaded = true;
    },
    observer: null
});
Ten.EventDispatcher.implementEventDispatcher(Hatena.Star.WindowObserver);

/* Hatena.Star.Text */
Hatena.Star.Text = {};

Hatena.Star.useSmartPhoneStar = true;


/* start */
new Hatena.Star.WindowObserver();

/* Hatena.Star.SiteConfig */
/* sample configuration for Hatena Diary */
/*
// Hatena.Star.SiteConfig = {
//     entryNodes: {
//         'div.section': {
//             uri: 'h3 a',
//             title: 'h3',
//             container: 'h3'
//         }
//     }
// };
*/

/*
=head1 NAME

HatenaStar.js - Make your blog more fun!

=head1 SYNOPSIS

In your blog header or body,

  <script type="text/javascript" src="http://s.hatena.com/js/HatenaStar.js"></script>

You may have to configure these settings for your blog if you don't use
major  blog hosting service.

  <script type="text/javascript" src="http://s.hatena.com/js/HatenaStar.js"></script>
  <script type="text/javascript>
    Hatena.Star.SiteConfig = {
      entryNodes: {
        'div.entry': {
          uri: 'a.permalink',
          title: 'h3.title',
          container: 'h3.title'
        }
      }
    };
  </script>

You can also register your Hatena ID by adding your blog's url at

  http://s.hatena.com/ (English)
  http://s.hatena.ne.jp/ (Japanese)

You can receive comments from your favorite users if you register your ID.

=head1 SITE CONFIGURATION

Site configuration style changed in Sep. 2007. To configure Hatena Star
for your site, please specify your html element structure as below.

  <script type="text/javascript>
    Hatena.Star.SiteConfig = {
      entryNodes: {
        'div.entry': {
          uri: 'a.permalink',
          title: 'h3.title',
          container: 'h3.title'
        }
      }
    };
  </script>

(to be continued..)

=head1 CUTOMIZE IMAGES

You can customize the default image settings for your page if you want.

  // change the images of stars, buttons by editing your style sheets
  .hatena-star-add-button-image {
    background-image: url(http://exapmle.com/add.gif);
  }
  .hatena-star-comment-button-image {
    background-image: url(http://exapmle.com/comment.gif);
  }
  .hatena-star-star-image {
    background-image: url(http://exapmle.com/star.gif);
  }

=head1 CHANGES

Please see E<lt>http://s.hatena.com/js/Hatena/Star/HatenaStar.ChangesE<gt>.

=head1 AUTHOR

Junya Kondo, E<lt>http://d.hatena.ne.jp/jkondo/E<gt>
Yuichi Tateno, motemen, nagayama

=head1 COPYRIGHT AND LICENSE

Copyright (C) Hatena Inc. All Rights Reserved.

This library is free software; you may redistribute it and/or modify
it under the same terms as the Perl programming language.

=cut
*/
Hatena.Star.BaseURL = 'http://s.hatena.ne.jp/';
Hatena.Star.PortalURL = 'http://www.hatena.ne.jp/';
Hatena.Star.ProfileURL = 'http://profile.hatena.ne.jp/';
Hatena.Star.Text.loading = '\u8AAD\u307F\u8FBC\u307F\u4E2D\u2026';
Hatena.Star.Text.close   = '\u9589\u3058\u308B';
Hatena.Star.Text.colorstar_for_smartphone = "\u4ED8\u3051\u305F\u3044\u8272\u306E\u30B9\u30BF\u30FC\u3092\u30BF\u30C3\u30C1";
Hatena.Star.Text.for_colorstar_shop = "\u30AB\u30E9\u30FC\u30B9\u30BF\u30FC\u30B7\u30E7\u30C3\u30D7\u3078";
Hatena.Star.Text.unlimited = "\u7121\u9650";
Hatena.Star.Text.sending   = "\u9001\u4FE1\u4E2D...";
Hatena.Star.UgoMemoURL = 'http://ugomemo.hatena.ne.jp/';
Hatena.Star.HaikuURL   = 'http://h.hatena.ne.jp/';
