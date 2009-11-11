

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
    loadElements: function(elements) {
        p('load');
        var entries = [];
        for (var i = 0;  i < elements.length; i++) {
            var element = elements[i];
            var entry = new Hatena.Bookmark.Star.createCommentEntry(element)
            if (!(entry && entry.uri)) {
                entry = new Hatena.Bookmark.Star.createArticleEntry(element);
            }
            if (entry && entry.uri)
                entries.push(entry);
        }
        if (entries.length)
            Hatena.Bookmark.Star.addEntries(entries);
    },
    addEntries: function(entries) {
        var c = Hatena.Star.EntryLoader;
        var entries_org = c.entries;
        c.entries = null;
        c.entries = [];
        if (entries && typeof(entries.length) == 'number') {
            var len = entries.length;
            for (var i = 0; i < len; i++) {
                var e = new Hatena.Star.Entry(entries[i]);
                e.showButtons();
                c.entries.push(e);
            }
        }
        c.getStarEntries(entries);
        if (entries_org) {
            c.entries.push(entries_org);
            c.entries = Ten.Array.flatten(c.entries);
        }
    },
    createArticleEntry: function(el) {
        var entry = {};
        var a = el.getElementsByTagName('a')[0];
        if (!a) return;
    
        entry.uri = a.href;
        var title = Ten.DOM.scrapeText(el);
        entry.title = title;
    
        Hatena.Bookmark.Star.addStarElement(entry, el);
        return entry;
    },
    createCommentEntry: function(el) {
        // コメントの li に対する Entry の作成
        var entry = {};
        var a = Ten.DOM.getElementsByTagAndClassName('a', 'username', el)[0];
        if (!a) return null;
        var pathname = a.pathname.replace(/^\//, '');
        entry.uri = 'http://b.hatena.ne.jp/' + pathname + a.hash;
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
        if (document.getElementById('entry_star_count')) {
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
    receiveStarEntries: function(res) {
        var res = JSON.parse(res);
        var c = Hatena.Star.EntryLoader;
        c.receiveStarEntries(res);
    },
    getStarEntries: function(entries) {
        var c = Hatena.Star.EntryLoader;
        // var entries = c.entries;
        if (!entries || !entries.length) return;
        var endpoint = 'entries.simple.json?';

        var url = Hatena.Star.BaseURL + endpoint;

        // normal loading
        var len = entries.length;
        for (var i = 0; i < len; i++) {
            url += 'uri=' + encodeURIComponent(entries[i].uri) + '&';
        }
        jQuery.get(url).next(function(res) {
            c.receiveStarEntries(JSON.parse(res));
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

