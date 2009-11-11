
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
    loadStarBeforeOnLoad: function(cssSelector, parentNode) {
        if (Ten.Browser.isFirefox) {
            Ten.DOM.addEventListener('onload', function() {
                Hatena.Bookmark.Star.loadStar(cssSelector, parentNode);
            });
        } else {
            Hatena.Bookmark.Star.loadStar(cssSelector, parentNode);
        }
    },
    loadElements: function(elements) {
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
        var res = eval('(' + res + ')');
        var c = Hatena.Star.EntryLoader;
        c.receiveStarEntries(res);
    },
    getStarEntries: function() {
        // テスト中
        var c = Hatena.Star.EntryLoader;
        var entries = c.entries;
        if (!entries.length) return;
        var endpoint = 'entries.simple.json?';
        
        var url = Hatena.Star.BaseURL + endpoint;
        var crossdomain = Hatena.Bookmark.XHR.canCrossDomainXHR();
        if (crossdomain) {
            // Ten.JSONP.MaxBytes = 100000000;
            // あまりにロードを大きくするとそれはそれで遅い
        } 
        if (entries.length > 5 && location.pathname.indexOf('/entry/') != -1) {
            // それなりの entry 数があるときは
            // b.hatena.ne.jp/username/permalink への star とする
            var regex = /^(http?:\/\/b.hatena.ne.jp\/)([^\/]+\/\d+)#bookmark\-(\d+)/;
            var matched = entries[1].uri.match(regex);
            var eid;
            if (matched) {
                endpoint = 'entries.bookmark.json?';
                url = Hatena.Star.BaseURL + endpoint;

                if (location.pathname.indexOf('/entry/') != -1) {
                    // entry ページは eid を省略して発行できるように
                    eid = matched[3];
                    if (eid) {
                        url += '&eid=' + eid;
                    }
                }

                for (var i = 0; i < entries.length; i++) {
                     if (url.length > Ten.JSONP.MaxBytes) {
                         new Ten.JSONP(url, c, 'receiveStarEntries');
                         url = Hatena.Star.BaseURL + endpoint;
                         if (eid) {
                            url += '&eid=' + eid;
                         }
                     }
                     matched = entries[i].uri.match(regex) || [];
                     var u = matched[2];
                     var e = matched[3];
                     if (u && e) {
                         url += '&u=' + encodeURIComponent(u);
                         if (!eid) {
                             url += '&e=' + encodeURIComponent(e);
                         }
                     } else {
                         url += '&uri=' + encodeURIComponent(entries[i].uri);
                     }
                }
                if (crossdomain) {
                    var tmp = url.split('?', 2);
                    var xhr = new Hatena.Bookmark.XHR(tmp[0], 'POST');
                    xhr.timeout = 60 * 1000;
                    xhr.crossdomain = true;
                    xhr.onComplete(function(res) {
                        var obj = eval('(' + res.responseText + ')');
                        c.receiveStarEntries(obj);
                    });
                    xhr.load(tmp[1]);
                } else {
                    new Ten.JSONP(url, c, 'receiveStarEntries');
                }
                return;
            }
        }

        // normal loading
        for (var i = 0; i < entries.length; i++) {
            if (url.length > Ten.JSONP.MaxBytes) {
                new Ten.JSONP(url, c, 'receiveStarEntries');
                url = Hatena.Star.BaseURL + endpoint;
            }
            url += 'uri=' + encodeURIComponent(entries[i].uri) + '&';
        }
        if (crossdomain) {
            var tmp = url.split('?', 2);
            var xhr = new Hatena.Bookmark.XHR(tmp[0], 'POST');
            xhr.timeout = 60 * 1000;
            xhr.crossdomain = true;
            xhr.onComplete(function(res) {
                var obj = eval('(' + res.responseText + ')');
                c.receiveStarEntries(obj);
            });
            xhr.load(tmp[1]);
        } else {
            new Ten.JSONP(url, c, 'receiveStarEntries');
        }
    }
}

