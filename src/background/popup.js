

Deferred.debug = true;
var BG = chrome.extension.getBackgroundPage();
import(BG, ['UserManager', 'User', 'HTTPCache', 'URI', 'Manager', 'Model']);

var request_uri = URI.parse('http://chrome/' + location.href);
var popupMode = request_uri.param('url') ? false : true;

if (popupMode) {
    // XXX
    p = function(msg) {
        BG.console.log(JSON.stringify(Array.prototype.slice.call(arguments, 0, arguments.length)));
    }
}


function initBookmark() {
    var user = UserManager.user;
    if (!UserManager.user) {
       $('#bookmark-container').hide();
       $('#login-container').show();
    }

    getInformation().next(function(info) {
        $('#usericon').attr('src', user.view.icon);
        $('#username').text(user.name);
        if (user.plususer) {
            $('#plus-inputs').removeClass('none');
        } else {
            $('#plus-inputs').remove();
        }
        $('#title-text').text(info.title);
        $('#favicon').attr('src', info.faviconUrl);

        var url = info.url;

        if (!url || info.url.indexOf('http') != 0) {
            $('#form').hide();
            $('#bookmark-message').text('この URL ははてなブックマークに追加できません');
            $('#bookmark-message').show();
            return;
        }

        setURL(url);

        $('#form').show();
        $('#comment').focus();
        HTTPCache.entry.get(url).next(setEntry);
        Model.Bookmark.findByUrl(url).next(setByBookmark);
    });
}

function setByBookmark(b) {
    if (b) {
        $('#bookmarked-notice').text('このエントリーは ' + b.dateYMDHM + ' にブックマークしました')
        .removeClass('none');
        $('#delete-button').removeClass('none');
        $('#comment').attr('value', b.comment);
    }
}

function setURL(url) {
    $('#input-url').attr('value', url);
    $('#url').text(url);
    $('#url').attr('href', url);

    if (!$('#favicon').attr('src')) {
        var favicon= new URI('http://favicon.st-hatena.com');
        favicon.param({url: url});
        $('#favicon').attr('src', favicon);
    }
}

function setEntry(entry) {
    $('body').removeClass('data-loading');
    if (entry.title) $('#title-text').text(entry.title);
    setURL(entry.original_url);
    var count = parseInt(entry.count);
    if (count) {
        var uc = $('#users-count');
        uc.text(String(count) + (count == 1 ? ' user' : ' users'));
        uc.attr('href', entry.entry_url);
        $('#users-count-container').removeClass('none');
    }
}

function closeWin() {
    if (popupMode) {
        window.close();
        // BG.chrome.experimental.extension.getPopupView().close();
    } else {
        Deferred.chrome.windows.getCurrent().next(function(win) {
            saveWindowPositions(win);
            // chrome.windows.remove(currentWin.id);
        });
    }
}

function saveWindowPositions(win) {
    localStorage.bookmarkEditWindowPositions = JSON.stringify({
        left: win.left,
        top: win.top,
        width: Math.max(100, win.width),
        height: Math.max(100, win.height),
    });
}

function loadWindowPosition(win) {
    var pos;
    try { pos = JSON.parse(localStorage.bookmarkEditWindowPositions) } catch (e) {};
    if (!pos) {
        pos = {
            width: 500,
            height: 400,
        }
    }

    // Deferred.chrome.windows.update(win.id, pos).next();
}

function getInformation() {
    var d = new Deferred();
    if (popupMode) {
        BG.chrome.tabs.getSelected(null, function(tab) {
            d.call({
                url: tab.url,
                faviconUrl: tab.faviconUrl,
                winId: tab.windowId,
                tabId: tab.id,
                title: tab.title,
            });
        });
    } else {
        setTimeout(function() {
            d.call({
                url: request_uri.param('url'),
                faviconUrl: request_uri.param('faviconUrl'),
                winId: request_uri.param('windowId'),
                tabId: request_uri.param('tabId'),
                title: request_uri.param('title'),
            })
        }, 0);
    }
    return d;
}

function deleteBookmark() {
    getInformation().next(function(info) {
        var url = info.url;
        UserManager.user.deleteBookmark(url);
        closeWin();
    });
}

function formSubmitHandler(ev) {
    var form = $(this);

    var user = UserManager.user;
    user.saveBookmark(form.serialize());
    setTimeout(function() {
        closeWin();
    }, 0);
    return false;
}

function searchFormSubmitHandler(ev) {
    View.search.search($('#search-word').attr('value'));
    return false;
}

var E = Utils.createElementSimply;

var createBookmarkList = function(bookmark) {
    var html = E('li', {className: 'bookmark'});
    html.appendChild(
       html.head = E('h3', {title: bookmark.title, className: 'entry-search'},
           E('img', {src: Utils.faviconUrl(bookmark.url)}),
           html.link = E('a', { target: '_blank' }, Utils.truncate(bookmark.title, 56)))
    );
    html.appendChild(
       html.commentDiv = E('div', {className: 'comment'},
         html.tags      = E('span', {className: 'tags'}, bookmark.tags.join(', ')), ' ',
         html.comment   = E('span', {className: 'comment'}, bookmark.body)
       )
    );
    html.appendChild(
       html.urlDiv = E('div', {className: 'infos'},
         html.url = E('a', {className: 'url'}, Utils.coolURL(bookmark.url)), ' ',
         E('span', {className: 'timestamp'}, bookmark.dateYMD),
         ' ', E('a', {href: Utils.entryURL(bookmark.url)}, E('img', {src: Utils.entryImage(bookmark.url), height:'13'}))
       )
    );
    html.url.href = html.link.href = bookmark.url;
    return html;
};


var View = {
    search: {
        get container() {
            return $('#search-container');
        },
        get list() {
            return $('#search-result');
        },
        get tab() {
            return $('#search-tab');
        },
        init: function() {
        },
        search: function(word) {
            ViewManager.show('search');
            var list = this.list;
            list.empty();
            if (this.current) {
                this.current.cancel();
                delete this.current;
            }
            var self = this;
            var start = 0;

            var loop = function() {
                self.current = Model.Bookmark.search(word, {
                    limit: 100,
                    offset: start,
                    order: 'date desc',
                }).next(function(res) {
                    res.forEach(function(r) {
                        // try {
                            list.append(createBookmarkList(r));
                        // } catch(e) { p(e) }
                        // var m = $('<li/>').text(r.title + r.url);
                        // m.appendTo(list);
                    });
                    start += 100;
                    if (start < 1000) {
                        loop();
                    }
                });
            }
            loop();

            // this.container.text('search:' + word);
        }
    },
    comment: {
        get container()       { return $('#comment-container') },
        get list()            { return $('#comment-list') },
        get tab()             { return $('#comment-tab') },
        get title()           { return $('#comment-title') },
        get titleContainer()  { return $('#comment-title-container') },
        get starLoadingIcon() { return $('#star-loading-icon') },
        get commentUsers()    { return $('#comment-users') },
        get commentCount()    { return $('#comment-count-detail') },
        get commentInfos()    { return $('#comment-infos') },
        get commentToggle()   { return $('#comment-toggle') },
        get commentMessage()   { return $('#comment-message') },

        init: function() {
            if (this.inited) return;
            var self = this;
            getInformation().next(function(info) {
                var title = self.title;
                title.text(info.title || info.url);
                self.titleContainer.css('background-image', info.faviconUrl ? info.faviconUrl : sprintf('url(%s)', Utils.faviconUrl(info.url)));
                HTTPCache.comment.get(info.url).next(function(r) {
                    if (r) {
                        self.commentMessage.hide();
                        title.text(Utils.truncate(r.title, 60));
                        title.attr('title', r.title);
                        self.list.empty();
                        self.list.html('');
                        self.showComment(r);
                    } else {
                        self.commentMessage.text('表示できるブックマークコメントはありません');
                    }
                });
            });
        },
        showNoComment: function() {
            this.list.removeClass('hide-nocomment');
            this.commentToggle.attr('src', '/images/comment-viewer-toggle-on.png');
            this.commentToggle.attr('title', 'コメントがないユーザを非表示');
            this.commentToggle.attr('alt', 'コメントがないユーザを非表示');
        },
        hideNoComment: function() {
            this.list.addClass('hide-nocomment');
            this.commentToggle.attr('src', '/images/comment-viewer-toggle-off.png');
            this.commentToggle.attr('title', 'すべてのユーザを表示');
            this.commentToggle.attr('alt', 'すべてのユーザを表示');
        },
        toggleNoComment: function() {
            if (this.list.hasClass('hide-nocomment')) {
                this.showNoComment();
            } else {
                this.hideNoComment();
            }
        },
        showComment: function(data) {
            var eid = data.eid;
            var self = this;
            var bookmarks = data.bookmarks;

            if (UserManager.user && UserManager.user.ignores) {
                var ignoreRegex = UserManager.user.ignores;
                bookmarks = bookmarks.filter(function(b) { return ! ignoreRegex.test(b.user) });
            }
            var publicLen = bookmarks.length;

            if (Config.get('commentviewer.autoHideComment') &&
                Config.get('commentviewer.autoHideThreshold') < publicLen)
            {
                self.hideNoComment();
            }

            self.commentUsers.text(sprintf('%d %s', data.count, data.count > 1 ? 'users' : 'user'));
            self.commentUsers.attr('href', data.entry_url);
            if (data.count > 3) {
                self.commentUsers.wrap($('<em/>'));
            }
            self.commentCount.text(sprintf('(%s + %s)', publicLen, data.count - publicLen));
            self.commentInfos.show();

            var i = 0;
            var step = 100;
            var starLoaded = 0;
            var starLoadedCheck = function(entriesLen) {
                starLoaded++;
                if (publicLen/step <= starLoaded) {
                    self.starLoadingIcon.hide();
                }
            }

            var options = {
                title: data.title,
                uri: data.url,
            };

            Deferred.loop({begin:0, end:publicLen, step:step}, function(n, o) {
                var frag = document.createDocumentFragment();
                var elements = [];
                for (var j = 0;  j < o.step; j++) {
                    var b = bookmarks[i++];
                    if (!b) continue;
                    var v = new User.View(b.user);
                    var permalink = sprintf("http://b.hatena.ne.jp/%s/%d#bookmark-%d",
                                            b.user, b.timestamp.substring(0, 10).replace(/\//g, ''),
                                            eid);

                    var li = Utils.createElementFromString(
                        '<li class="#{klass}"><img title="#{user}" alt="#{user}" src="#{icon}" /><a class="username" href="#{permalink}">#{user}</a><span class="comment">#{comment}</span><span class="timestamp">#{timestamp}</span></li>',
                     {
                         data: {
                             permalink: permalink,
                             icon: v.icon,
                             user: b.user,
                             klass: b.comment.length == 0 ? 'userlist nocomment' : 'userlist',
                             comment: b.comment,
                             timestamp: b.timestamp.substring(0, 10),
                             document: document
                         }
                     });
                    frag.appendChild(li);
                    elements.push(li);
                }
                Hatena.Bookmark.Star.loadElements(elements, (n == 0 ? options : null)).next(starLoadedCheck);
                self.list.append(frag);
                return Deferred.wait(0.25);
            });
            this.inited = true;
        }
    },
    bookmark: {
        get container() {
            return $('#bookmark-container');
        },
        get tab() {
            return $('#bookmark-tab');
        },
        init: function() {
            initBookmark();
        },
    }
};

var ViewManager = {
    show: function (name) {
        Object.keys(View).forEach(function(key) {
            if (key != name) {
                var current = View[key];
                current.container.hide();
                if (current.tab) current.tab.removeClass('current');
            } else {
                setTimeout(function() {
                    var current = View[name];
                    current.container.show();
                    Config.set('popup.lastView', name);
                    if (current.tab) current.tab.addClass('current');
                    current.init();
                }, 0);
            }
        });
    }
}

// var currentWin;
// Deferred.chrome.windows.getCurrent().next(function(win) {
//     currentWin = win;
//     loadWindowPosition(win);
// }).error(function(e) { console.log(e) });

/*
if (popupMode) {
    chrome.windows.getCurrent(function(win) {
        BG.console.log(win);
        var height = Math.max(300, win.height - 150);
        document.getElementById('comment-list').style.maxHeight = sprintf('%spx', height);
        document.getElementById('search-container').style.maxHeight = sprintf('%spx', height);
    });
}
*/

$(document).bind('ready', function() {
    if (popupMode) {
        document.body.style.width = '500px';
    }
    $('#form').bind('submit', formSubmitHandler);
    $('#search-form').bind('submit', searchFormSubmitHandler);
    $('a').live('click', function() {
        this.target = '_blank';
    });
    // $('a').each(function() { this.target = '_blank' });
    if (Config.get('popup.lastView') == 'bookmark') {
        ViewManager.show('bookmark');
    } else {
        ViewManager.show('comment');
    }
});




