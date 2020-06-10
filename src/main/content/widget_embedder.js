// widget_embedder.js

// XXX ToDo: Consider about namespaces.

const B_HOST = 'b.hatena.ne.jp';
const B_HTTP  = 'http://' + B_HOST;
const B_HTTPS = 'https://' + B_HOST;

const B_STATIC_HOST = 'b.st-hatena.com';
const B_STATIC_HTTP  = 'http://' + B_STATIC_HOST;
const B_STATIC_HTTPS = 'https://' + B_STATIC_HOST;

var SiteinfoRequestor = {
    init: function SR_init() {
        var self = SiteinfoRequestor;
        self.port = chrome.runtime.connect();
        self.port.onMessage.addListener(self.onMessage);
        self.port.postMessage({
            message: 'get_siteinfo_for_url',
            data: { url: location.href },
        });
    },

    destroy: function SR_destroy() {
        var self = SiteinfoRequestor;
        // XXX Can we remove the listener 'onMessage'?
        self.port = null;
    },

    onMessage: function SR_onMessage(info) {
        var self = SiteinfoRequestor;
        switch (info.message) {
        case 'siteinfo_for_url':
            self.onGotSiteinfo(info.siteinfo);
            break;
        case 'siteinfos_with_xpath':
            self.onGotXPathSiteinfos(info.siteinfos);
            break;
        }
    },

    onGotSiteinfo: function SR_onGotSiteinfo(siteinfo) {
        var self = SiteinfoRequestor;
        if (siteinfo) {
            if (!siteinfo.disable)
                new WidgetEmbedder(siteinfo);
            self.destroy();
            return;
        }
        self.port.postMessage({ message: 'get_siteinfos_with_xpath' });
    },

    onGotXPathSiteinfos: function SR_onGotXPathSiteinfos(siteinfos) {
        var self = SiteinfoRequestor;
        for (var i = 0, n = siteinfos.length; i < n; i++) {
            var siteinfo = siteinfos[i];
            if (queryXPathOfType(siteinfo.domain, document,
                                 XPathResult.BOOLEAN_TYPE)) {
                if (!siteinfo.disable)
                    new WidgetEmbedder(siteinfo);
                break;
            }
        }
        self.destroy();
    },
};

function WidgetEmbedder(siteinfo) {
    this.siteinfo = siteinfo;
    if (document.readyState === 'complete') {
        this.embedLater(WidgetEmbedder.INITIAL_DELAY);
    }
    else {
        var self = this;
        window.addEventListener('load', function() { self.embedLater(WidgetEmbedder.INITIAL_DELAY); } , false);
    }
}

extend(WidgetEmbedder, {
    INITIAL_DELAY:   20,
    MUTATION_DELAY: 100,

    locales: {
        en: {
            SHOW_ENTRY_TEXT:  '[Show on Hatena Bookmark]',
            SHOW_ENTRY_TITLE: 'Show This Entry on Hatena Bookmark',
        },
        ja: {
            SHOW_ENTRY_TEXT:  '[はてなブックマークで表示]',
            SHOW_ENTRY_TITLE: 'このエントリーをはてなブックマークで表示',
        },
    },
});

WidgetEmbedder.messages =
    WidgetEmbedder.locales[navigator.language] ||
    WidgetEmbedder.locales[navigator.language.substring(0, 2)] ||
    WidgetEmbedder.locales['en'];

extend(WidgetEmbedder.prototype, {
    embedLater: function WE_embedLater(delay) {
        if (this.timerId) return;
        this.timerId = setTimeout(function (self) {
            self.embed();
            self.timerId = 0;
            document.addEventListener('DOMNodeInserted', self, false);
        }, delay, this);
    },

    embed: function WE_embed() {
        queryXPathAll(this.siteinfo.paragraph)
            .forEach(this.embedInParagraph, this);
    },

    embedInParagraph: function WE_embedInParagraph(paragraph) {
        if (paragraph._hb_isWidgetEmbedded) return;
        paragraph._hb_isWidgetEmbedded = true;

        var link = this.getLink(paragraph);
        if (!link || !/^https?:/.test(link.href)) return;
        var point = this.getAnnotationPoint(paragraph, link);
        if (!point) return;
        var widgets = this.createWidgets(link);
        point.insertNode(widgets);
        point.detach();
    },

    getLink: function WE_getLink(paragraph) {
        var xpath = this.siteinfo.link || '.';
        if (xpath === '__location__') {
            var url = location.href;
            for (var node = paragraph; node; node = node.parentNode) {
                if (node._hb_baseURL) {
                    url = node._hb_baseURL;
                    break;
                }
            }
            var a = document.createElement('a');
            a.href = url;
            return a;
        }
        var link = queryXPath(xpath, paragraph);
        return (link && link.href) ? link : null;
    },

    getAnnotationPoint: function WE_getAnnotationPoint(paragraph, link) {
        var existing = this.getExistingWidgets(paragraph, link);
        if (existing.counter) return null;
        var point = document.createRange();
        var anchor = existing.entry || existing.comments || existing.addButton;
        if (anchor) {
            point.selectNode(anchor);
            point.collapse(anchor !== existing.entry);
            return point;
        }

        var annotation = this.siteinfo.annotation
                         ? queryXPath(this.siteinfo.annotation, paragraph)
                         : link;
        if (!annotation) return null;
        var position = (this.siteinfo.annotationPosition || '').toLowerCase();
        if (!position) {
            switch (annotation.localName) {
            case 'a': case 'br': case 'hr': case 'img': case 'canvas':
            case 'object': case 'input': case 'button': case 'select':
            case 'textarea':
                position = 'after';
                break;
            default:
                position = 'last';
            }
        }
        if (position === 'before' || position === 'after')
            point.selectNode(annotation);
        else
            point.selectNodeContents(annotation);
        point.collapse(position === 'before' || position === 'start');
        return point;
    },

    getExistingWidgets: function WE_getExistingWidgets(paragraph, link) {
        const url = link.href;
        const sharpEscapedURL = url.replace(/#/g, '%23');
        const entryPath = getEntryPath(url);
        const entryURLHTTP  = B_HTTP + entryPath;
        const entryURLHTTPS = B_HTTPS + entryPath;
        const oldEntryURLHTTP  = B_HTTP + '/entry/' + sharpEscapedURL;
        const oldEntryURLHTTPS = B_HTTPS + '/entry/' + sharpEscapedURL;
        const imageAPIHTTPPrefix  = B_STATIC_HTTP + 'entry/image/';
        const imageAPIHTTPSPrefix = B_STATIC_HTTPS + 'entry/image/';
        const oldImageAPIHTTPPrefix  = B_HTTP + 'entry/image/';
        const oldImageAPIHTTPSPrefix = B_HTTPS + 'entry/image/';
        const addURLHTTP  = B_HTTP + 'my/add.confirm?url=' + encodeURIComponent(url);
        const addURLHTTPS = B_HTTPS + 'my/add.confirm?url=' + encodeURIComponent(url);
        const oldAddURLHTTP  = B_HTTP + 'append?' + sharpEscapedURL;
        const oldAddURLHTTPS = B_HTTPS + 'append?' + sharpEscapedURL;
        const entryImagePrefix = 'http://d.hatena.ne.jp/images/b_entry';
        var widgets = {
            entry:     null,
            counter:   null,
            comments:  null,
            addButton: null,
        };
        queryXPathAll('descendant::a[@href]', paragraph).forEach(function (a) {
            switch (a.href) {
            case entryURLHTTP:
            case entryURLHTTPS:
            case oldEntryURLHTTP:
            case oldEntryURLHTTPS:
                var content = a.firstChild;
                if (!content) break;
                if (content.nodeType === Node.TEXT_NODE) {
                    if (content.nodeValue.indexOf(' user') !== -1) {
                        var parentName = a.parentNode.localName;
                        widgets.counter =
                            (parentName === 'em' || parentName === 'strong')
                            ? a.parentNode : a;
                        break;
                    }
                    if (!content.nextSibling) break;
                    content = content.nextSibling;
                }
                if (content.localName === 'img') {
                    var src = content.src || '';
                    if (src.indexOf(imageAPIHTTPPrefix) === 0 ||
                        src.indexOf(imageAPIHTTPSPrefix) === 0 ||
                        src.indexOf(oldImageAPIHTTPPrefix) === 0 ||
                        src.indexOf(oldImageAPIHTTPSPrefix) === 0) {
                        widgets.counter = a;
                    } else if (src.indexOf(entryImagePrefix) === 0) {
                        widgets.entry = a;
                    }
                }
                break;

            case addURLHTTP:
            case addURLHTTPS:
            case oldAddURLHTTP:
            case oldAddURLHTTPS:
                widgets.addButton = a;
                break;
            }
        }, this);
        widgets.comments = paragraph.querySelector('.hatena-bcomment-view-icon');
        return widgets;
    },

    createWidgets: function WE_createWidgets(link) {
        var widgets = document.createDocumentFragment();
        widgets.appendChild(document.createTextNode(' '));
        var url = link.href;
        var sharpEscapedURL = url.replace(/#/g, '%23');
        var img = E('img', {
            src: '//b.st-hatena.com/entry/image/' + sharpEscapedURL,
            alt: WidgetEmbedder.messages.SHOW_ENTRY_TEXT,
            style: 'display: none;',
        });
        img.addEventListener('load', this._onImageLoad, false);
        widgets.appendChild(E('a', {
            href: getEntryURL(url),
            title: WidgetEmbedder.messages.SHOW_ENTRY_TITLE,
            'class': 'hBookmark-widget-counter'
        }, img));
        return widgets;
    },

    _onImageLoad: function WE__onImageLoad(event) {
        var img = event.target;
        if (img.naturalWidth > 1)
            img.style.display = '';
        img.removeEventListener('load', arguments.callee, false);
    },

    handleEvent: function WE_handleEvent(event) {
        switch (event.type) {
        case 'DOMNodeInserted':
            document.removeEventListener('DOMNodeInserted', this, false);
            this.embedLater(WidgetEmbedder.MUTATION_DELAY);
            break;
        }
    },
});

function extend(dest, src) {
    for (var i in src)
        dest[i] = src[i];
    return dest;
}

function queryXPath(xpath, context) {
    return queryXPathOfType(xpath, context,
                            XPathResult.FIRST_ORDERED_NODE_TYPE);
}

function queryXPathAll(xpath, context) {
    return queryXPathOfType(xpath, context,
                            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE);
}

function queryXPathOfType(xpath, context, type) {
    context = context || document;
    var doc = context.ownerDocument || context;
    var result = doc.evaluate(xpath, context, null, type, null);

    switch (result.resultType) {
    case XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE:
    case XPathResult.ORDERED_NODE_SNAPSHOT_TYPE:
        var nodes = [];
        for (var i = 0, n = result.snapshotLength; i < n; i++)
            nodes.push(result.snapshotItem(i));
        return nodes;
    case XPathResult.ANY_UNORDERED_NODE_TYPE:
    case XPathResult.FIRST_ORDERED_NODE_TYPE:
        return result.singleNodeValue;

    case XPathResult.NUMBER_TYPE:  return result.numberValue;
    case XPathResult.STRING_TYPE:  return result.stringValue;
    case XPathResult.BOOLEAN_TYPE: return result.booleanValue;
    case XPathResult.UNORDERED_NODE_ITERATOR_TYPE:
    case XPathResult.ORDERED_NODE_ITERATOR_TYPE:
        return result;
    }
    throw new Error("Unknown XPath result type.");
}

function E(name, attrs) {
    var element = document.createElement(name);
    for (var a in attrs)
        element.setAttribute(a, attrs[a]);
    for (var i = 2, n = arguments.length; i < n; i++) {
        var child = arguments[i];
        if (!child.nodeType)
            child = document.createTextNode(child);
        element.appendChild(child);
    }
    return element;
}

function getEntryPath(url) {
    var suffix = url.replace(/#/g, '%23');
    if (suffix.indexOf('http://') === 0)
        suffix = suffix.substring(7);
    else if (suffix.indexOf('https://') === 0)
        suffix = 's/' + suffix.substring(8);
    return '/entry/' + suffix;
}

function getEntryURL(url) {
    return B_HTTPS + getEntryPath(url);
}

if (window.top == window.self)
    SiteinfoRequestor.init();
