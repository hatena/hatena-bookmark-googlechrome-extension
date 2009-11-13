

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
    getInformation().next(function(info) {
        var user = UserManager.user;
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
        if (!url) return;
        setURL(url);

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
        var faviconURI = new URI('http://favicon.st-hatena.com');
        faviconURI.param({url: url});
        $('#favicon').attr('src', faviconURI);
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

var View = {
    search: {
        get container() {
            return $('#search-container');
        },
        init: function() {
        },
        search: function(word) {
            ViewManager.show('search');
            this.container.text('search:' + word);
        }
    },
    comment: {
        get container() {
            return $('#comment-container');
        },
        get list() {
            return $('#comment-list');
        },
        get tab() {
            return $('#comment-tab');
        },
        init: function() {
            if (this.inited) return;
            var self = this;
            getInformation().next(function(info) {
                HTTPCache.comment.get(info.url).next(function(r) {
                    self.list.html('');
                    self.showComment(r);
                });
            });
        },
        showComment: function(data) {
            var eid = data.eid;
            var self = this;
            var bookmarks = data.bookmarks;
            var i = 0;
            Deferred.loop({begin:0, end: bookmarks.length, step:100}, function(n, o) {
                var frag = document.createDocumentFragment();
                var elements = [];
                for (var j = 0;  j < o.step; j++) {
                    var b = bookmarks[i++];
                    if (!b) continue;
                    var v = new User.View(b.user);
                    var permalink = sprintf("http://b.hatena.ne.jp/%s/%d#bookmark-%d", b.user, b.timestamp.substring(0, 10).replace(/\//g, ''), eid);
                    var li = Utils.createElementFromString(
                        '<li class="userlist"><img title="#{user}" alt="#{user}" src="#{icon}" /><a class="username" href="#{permalink}">#{user}</a><span class="comment">#{comment}</span><span class="timestamp">#{timestamp}</span></li>',
                     {
                         data: {
                             permalink: permalink,
                             icon: v.icon,
                             user: b.user,
                             comment: b.comment,
                             timestamp: b.timestamp.substring(0, 10),
                             document: document
                         }
                     });
                    frag.appendChild(li);
                    elements.push(li);
                }
                Hatena.Bookmark.Star.loadElements(elements);
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
                    if (current.tab) current.tab.addClass('current');
                    current.init();
                }, 0);
            }
        });
    }
}


// $(document).bind('click', function(ev) {
//     ev.metaKey = true;
// });

var currentWin;
Deferred.chrome.windows.getCurrent().next(function(win) {
    currentWin = win;
    loadWindowPosition(win);
}).error(function(e) { console.log(e) });

$(document).bind('ready', function() {
    $('#form').bind('submit', formSubmitHandler);
    $('#search-form').bind('submit', searchFormSubmitHandler);
    $('a').live('click', function() {
        this.target = '_blank';
    });
    // $('a').each(function() { this.target = '_blank' });
    ViewManager.show('comment');
});




