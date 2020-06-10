

Hatena.Bookmark = {};
Hatena.Bookmark.Star = {
    loadStar: function(cssSelector, parentNode) {
        var elements;
        try {
            elements = Ten.Selector.getElementsBySelector(cssSelector, parentNode || document.body);
        } catch(e) {};
        if (!elements) return;
        Hatena.Bookmark.Star.loadElements( elements );
    },
    loadElements: function(elements, options) {
        var entries = [];
        if (options) {
            var title = document.getElementById('comment-title-star-container');
            var entry = {
                title: options.title,
                uri: options.uri
            };
            this.addStarElement(entry, title);
            entries.push(entry);
        }
        for (var i = 0;  i < elements.length; i++) {
            var element = elements[i];
            var entry = Hatena.Bookmark.Star.createCommentEntry(element)
            if (entry && entry.uri)
                entries.push(entry);
        }
        if (entries.length) {
            return Hatena.Bookmark.Star.addEntries(entries);
        } else {
            return Deferred.next();
        }
    },
    addEntries: function(entries) {
        var starElements = [];
        if (entries && typeof(entries.length) == 'number') {
            var len = entries.length;
            for (var i = 0; i < len; i++) {
                var e = new Hatena.Star.Entry(entries[i]);
                e.showButtons();
                starElements.push(e);
            }
        }
        return Hatena.Bookmark.Star.getStarEntries(entries, starElements);
    },
    createCommentEntry: function(el) {
        // コメントの li に対する Entry の作成
        var entry = {};
        var a = Ten.DOM.getElementsByTagAndClassName('a', 'username', el)[0];
        if (!a) return null;
        var pathname = a.pathname.replace(/^\//, '');
        entry.uri = 'https://b.hatena.ne.jp/' + pathname + a.hash;
        var title = '';
        var tags = Ten.DOM.getElementsByTagAndClassName('a', 'user-tag', el);
        for (var i = 0; i < tags.length; i++) {
            title += '[' + Ten.DOM.scrapeText(tags[i]) + ']';
        }
        var comments = Ten.DOM.getElementsByTagAndClassName('span', 'comment', el)[0];
        if (comments) {
            title += Ten.DOM.scrapeText(comments);
        }
        if (!title) {
            title =  Ten.DOM.scrapeText(a) + 'のブックマーク';
        }
        entry.title = title;
        Hatena.Bookmark.Star.addStarElement(entry, el);
        return entry;
    },
    addStarElement: function(entry, el) {
        entry.comment_container = Hatena.Star.EntryLoader.createCommentContainer();
        entry.star_container = Hatena.Star.EntryLoader.createStarContainer();
        entry.comment_container.style.display = 'none';
        el.appendChild(entry.comment_container);
        el.appendChild(entry.star_container);
    },
    createByArticleTitle: function() {
    },
    createByEntryTitle: function() {
        var title = document.getElementById('comment-title');
        if (title) {
            var li = document.getElementById('entry_star_count');
            var h2 = Ten.DOM.getElementsByTagAndClassName('h2', 'entrytitle', document)[0];
            var entries = [];
            if(li && h2) {
                var a = h2.getElementsByTagName('a')[0];
                var entry = {
                    title: Ten.DOM.scrapeText(h2),
                    uri: a.href
                };
                Hatena.Bookmark.Star.addStarElement(entry, li);
                entries.push(entry);
                Hatena.Bookmark.Star.addEntries(entries);
            }
        }
    },
    receiveStarEntries: function(res, starElements) {
        var entries = res.entries;
        if (!entries) entries = [];
        for (var i = 0, cLen = starElements.length ; i < cLen ; i++) {
            var e = starElements[i];
            if (e.starEntry) continue;
            if (!e.eURI) e.eURI = encodeURIComponent(e.uri);
            for (var j = 0, eLen = entries.length ; j < eLen ; j++) {
                var se = entries[j];
                if (!se.uri) continue;
                if ((se.eURI || (se.eURI = encodeURIComponent(se.uri))) == e.eURI) {
                    e.bindStarEntry(se);
                    entries.splice(j,1);
                    break;
                }
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
            if (!Hatena.Visitor.RKS) Hatena.Visitor.RKS = res.rks;
        }
        Hatena.Star.User.RKS.ready(res.rks);
    },
    getStarEntries: function(entries, starElements) {
        if (!entries || !entries.length) return;
        var endpoint = 'entries.json?';
        var baseURL = Hatena.Star.BaseURL.replace(/^http:/, Hatena.Star.BaseURLProtocol);
        var url = baseURL + endpoint;

        // normal loading
        var len = entries.length;
        for (var i = 0; i < len; i++) {
            url += 'uri=' + encodeURIComponent(entries[i].uri) + '&';
        }
        url += 'no_comments=1';
        return jQuery.get(url,void 0,void 0,'text').next(function(res) {
            res = JSON.parse(res);
            var len = res.entries ? res.entries.length : 0;
            Hatena.Bookmark.Star.receiveStarEntries(res, starElements);
            return len;
        });
    }
}

Hatena.Star.EntryLoader.loadEntries = function() {};
Hatena.Star.EntryLoader.getStarEntries = Hatena.Bookmark.Star.getStarEntries;

Ten.Style.getGlobalRule = function(selector) {
    return null;
};

Hatena.Star.Button = new Ten.Class({
    _buttons: {},
    createButton: function(args) {
        var img;
        if (args.src && (img = Hatena.Star.Button._buttons[args.src])) {
            return img.cloneNode(false);
        }
        var img = document.createElement('img');
        for (var attr in args) {
            img.setAttribute(attr, args[attr]);
        }
        with (img.style) {
            cursor = 'pointer';
            margin = '0 3px';
            padding = '0';
            border = 'none';
            verticalAlign = 'middle';
        }
        if (args.src) Hatena.Star.Button._buttons[args.src] = img.cloneNode(false);
        return img;
    },
    sels: {},
    getImgSrc: function(c,container) {
        return c.ImgSrc;
    }
});
