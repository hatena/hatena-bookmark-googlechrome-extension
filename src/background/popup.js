

Deferred.debug = true;
var BG = chrome.extension.getBackgroundPage();
importFeature(BG, ['UserManager', 'User', 'HTTPCache', 'URI', 'Manager', 'Model']);

var request_uri = URI.parse('http://chrome/' + location.href);
var popupMode = request_uri.param('url') ? false : true;

if (popupMode) {
    // XXX
    p = function(msg) {
        BG.console.log(JSON.stringify(Array.prototype.slice.call(arguments, 0, arguments.length)));
    }
} else if (request_uri.param('debug')) {
} else {
    chrome.tabs.getSelected(null, function(tab) {
        chrome.windows.get(tab.windowId, function(win) {
            window.currentWin = win;
            BG.popupWinInfo = {
                windowId: win.id,
                tabId: tab.id,
            }
            loadWindowPosition(win);
        });
    });
    chrome.windows.onRemoved.addListener(function(windowId) {
        if (BG.popupWinInfo)
            delete BG.popupWinInfo;
        delete window.currentWin;
    });
    chrome.self.onConnect.addListener(function(port, name) {
        port.onMessage.addListener(function(info, con) {
            if (info.message == 'popup-reload') {
                if (info.data.url) {
                    // XXX
                    location.href = '/background/popup.html?url=' + encodeURIComponent(info.data.url);
                }
            }
        });
    });
    if (window.currentWin) {
        setInterval(function() {
            chrome.windows.get(currentWin.id, function(win) {
                saveWindowPositions(win);
            });
        }, 50);
    }
}


function closeWin() {
    if (popupMode) {
        window.close();
        // BG.chrome.experimental.extension.getPopupView().close();
    } else {
        // if (window.currentWin) {
        //     chrome.windows.get(currentWin.id, function(win) {
        //         delete BG.popupWinInfo;
        //         saveWindowPositions(win);
        //         chrome.windows.remove(currentWin.id);
        //     });
        // } else {
            window.close();
        // }
    }
}

function saveWindowPositions(win) {
    if (request_uri.param('debug')) return;
    localStorage.bookmarkEditWindowPositions = JSON.stringify({
        left: win.left,
        top: win.top,
        width: Math.max(100, win.width),
        height: Math.max(100, win.height),
    });
}

function loadWindowPosition(win) {
    if (request_uri.param('debug') || request_uri.param('error')) return;
    var pos;
    try { pos = JSON.parse(localStorage.bookmarkEditWindowPositions) } catch (e) {};
    if (!pos) {
        pos = {
            width: Config.get('popup.window.height'),
            height: 400,
        }
    }

    chrome.windows.update(win.id, pos);
};

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
    var form = $('#form');

    var user = UserManager.user;
    var url = form.serialize();
    url = View.bookmark.setSubmitData(url);

    url = url.replace(new RegExp('\\+', 'g'), '%20'); // for title
    console.log(url);
    user.saveBookmark(url);
    setTimeout(function() {
        closeWin();
    }, 0);
    return false;
}

function searchFormSubmitHandler(ev) {
    View.search.search($('#search-word').attr('value'));
    return false;
}

var _searchIncD = null;
function searchIncSearchHandler(ev) {
    if (_searchIncD) _searchIncD.cancel();
    _searchIncD = Deferred.wait(0.2).next(function() {
        _searchIncD = null;
        View.search.search($('#search-word').attr('value'));
    });
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
        get container() { return $('#search-container'); },
        get list() { return $('#search-result'); },
        get tab() { return $('#search-tab'); },
        get searchWord() { return $('#search-word'); },
        get wordPreview() { return $('#search-word-preview'); },
        get totalCount() { return $('#search-total-count'); },
        init: function() {
        },
        search: function(word) {
            if (!UserManager.user) {
                this.container.hide();
                $('#login-container').show();
                return;
            }
            Config.set('popup.search.lastWord', word);
            this.searchWord.focus();

            document.getElementById('hatena-websearch').href = 'http://b.hatena.ne.jp/search?q=' + encodeURIComponent(word);
            ViewManager.show('search');
            var list = this.list;
            list.empty();
            if (this.current) {
                this.current.cancel();
                delete this.current;
            }
            var self = this;
            var start = 0;

            self.wordPreview.empty();
            self.wordPreview.append(E('span',{},  E('em', {}, word), 'での検索結果'));

            var max = Config.get('popup.search.result.threshold');
            var el = list.get(0);
            var loop = function() {
                self.current = Model.Bookmark.search(word, {
                    limit: 100,
                    offset: start,
                    order: 'date desc',
                }).next(function(res) {
                    res.forEach(function(r) {
                        // try {
                            if (el.children.length < max)
                                list.append(createBookmarkList(r));
                        // } catch(e) { p(e) }
                        // var m = $('<li/>').text(r.title + r.url);
                        // m.appendTo(list);
                    });
                    var rLen = el.children.length;
                    self.totalCount.text(rLen >= (max-1) ? sprintf('%d件以上', max) : sprintf('%d件', rLen));
                    start += 100;
                    if (start < max && !(rLen >= (max-1))) {
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
                self.setTitle(info.title || info.url);
                self.titleContainer.css('background-image', info.faviconUrl ? info.faviconUrl : sprintf('url(%s)', Utils.faviconUrl(info.url)));
                if (info.url.indexOf('http') != 0) {
                    self.commentMessage.text('表示できるブックマークコメントはありません');
                    return;
                }
                HTTPCache.comment.get(info.url).next(function(r) {
                    if (r) {
                        self.commentMessage.hide();
                        self.setTitle(r.title);
                        self.list.empty();
                        self.list.html('');
                        self.showComment(r);
                    } else {
                        self.commentMessage.text('表示できるブックマークコメントはありません');
                    }
                });
            });
        },
        setTitle: function(title) {
            this.title.text(Utils.truncate(title, 60));
            this.title.attr('title', title);
        },
        showNoComment: function() {
            this.list.removeClass('hide-nocomment');
            Config.set('popup.commentviewer.togglehide', true);
            this.commentToggle.attr('src', '/images/comment-viewer-toggle-on.png');
            this.commentToggle.attr('title', 'コメントがないユーザを非表示');
            this.commentToggle.attr('alt', 'コメントがないユーザを非表示');
        },
        hideNoComment: function() {
            this.list.addClass('hide-nocomment');
            Config.set('popup.commentviewer.togglehide', false);
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

            if (Config.get('popup.commentviewer.autodetect.enabled')) {
                if (Config.get('popup.commentviewer.autodetect.threshold') < publicLen) {
                    self.hideNoComment();
                }
            } else if (!Config.get('popup.commentviewer.togglehide')) {
                self.hideNoComment();
            }

            self.commentUsers.text(sprintf('%d %s', data.count, data.count > 1 ? 'users' : 'user'));
            self.commentUsers.attr('href', data.entry_url);
            if (data.count > 3) {
                self.commentUsers.wrap($('<em/>'));
            }
            self.commentCount.text(sprintf('(%s + %s)', publicLen, data.count - publicLen));
            self.commentInfos.show();

            if (publicLen == 0) {
                self.commentMessage.text('表示できるブックマークコメントはありません');
                self.commentMessage.show();
                this.inited = true;
                return;
            }

            var i = 0;
            var step = 100;
            var starLoaded = 0;
            self.starLoadingIcon.show();
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

            var httpRegexp = /(.*?)((?:https?):\/\/(?:[A-Za-z0-9~\/._?=\-%#+:;,@\'*$!]|&(?!lt;|gt;|quot;))+)(.*)/;
            Deferred.loop({begin:0, end:publicLen, step:step}, function(n, o) {
                var frag = document.createDocumentFragment();
                var elements = [];
                for (var j = 0;  j < o.step; j++) {
                    var b = bookmarks[i++];
                    if (!b) continue;
                    var permalink = sprintf("http://b.hatena.ne.jp/%s/%d#bookmark-%d",
                                            b.user, b.timestamp.substring(0, 10).replace(/\//g, ''),
                                            eid);

                    var li = Utils.createElementFromString(
                        '<li class="#{klass}"><a href="#{userlink}"><img width="16" height="16" title="#{user}" alt="#{user}" src="#{icon}" /></a><a class="username" href="#{permalink}">#{user}</a><span class="comment">#{comment}</span><span class="timestamp">#{timestamp}</span></li>',
                    {
                        data: {
                            userlink: B_HTTP + b.user + '/',
                            permalink: permalink,
                            icon: User.View.prototype.getProfileIcon(b.user),
                            user: b.user,
                            klass: b.comment.length == 0 ? 'userlist nocomment' : 'userlist',
                            comment: b.comment,
                            timestamp: b.timestamp.substring(0, 10),
                            document: document
                        }
                    });
                    if (httpRegexp.test(b.comment)) {
                        var matches = [];
                        var match;
                        var str = b.comment;
                        while (str && (match = httpRegexp.exec(str))) {
                            matches.push(match[1]);
                            matches.push(match[2]);
                            str = match[3] || '';
                        }
                        if (str) matches.push(str);
                        var cEL = li.comment;
                        cEL.innerHTML = '';
                        matches.forEach(function(match) {
                            if (httpRegexp.test(match)) {
                                var link = E('a', {
                                    target: '_blank',
                                    href: match,
                                }, match);
                                cEL.appendChild(link);
                            } else {
                                cEL.appendChild(document.createTextNode(match));
                            }
                        });
                        console.log(matches);
                    }
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
        get confirmBookmark()        { return $('#confirm-bookmark'); },
        get postTwitterContainer()   { return $('#post-twitter-container'); },
        get postTwitter()            { return $('#post-twitter'); },
        get postTwitterHelp()        { return $('#post-twitter-help'); },
        get postMixiCheckContainer() { return $('#post-mixi-check-container'); },
        get postMixiCheck()          { return $('#post-mixi-check'); },
        get postMixiCheckHelp()      { return $('#post-mixi-check-help'); },
        get container()              { return $('#bookmark-container'); },
        get tab()                    { return $('#bookmark-tab'); },
        get usericon()               { return $('#usericon') },
        get usernameEL()             { return $('#username') },
        get plusInputs()             { return $('#plus-inputs') },
        get privateHelp()            { return $('#private-help') },
        get optionHelpContainer()    { return $('#option-help-container') },
        get titleText()              { return $('#title-text') },
        get faviconEL()              { return $('#favicon') },
        get form()                   { return $('#form') },
        get message()                { return $('#bookmark-message') },
        get commentEL()              { return $('#comment') },
        get allTagsContainer()       { return $('#all-tags-container') },
        get allTags()                { return $('#all-tags') },
        get recommendTagsContainer() { return $('#recommend-tags-container') },
        get recommendTags()          { return $('#recommend-tags') },
        get typeCount()              { return $('#type-count') },
        get port() {
            if (!this._port) {
                var self = this;
                var _port = chrome.extension.connect();
                // ToDO もう一段階簡略化できそう
                _port.onMessage.addListener(function(info, con) {
                    if (info.message == 'bookmarkedit_bridge_recieve')
                        self.updatePageData(info.data);
                });
                this._port = _port;
            }
            return this._port;
        },
        updatePageData: function(data) {
            if (data.images) {
                this.setImages(data.images);
            }
            if (data.canonical) {
                this.setCanonical(data.canonical);
            }
            if (data.title) {
                this.setTitle(data.title);
            }
        },
        setImages: function(images) {
            if (this.images) {
                this.images = this.images.concat(images);
            } else {
                this.images = images;
            }
            $('#image-table-container').show();
        },
        setSubmitData: function(data) {
            var selectedImage = $('#current-image').attr('updated');
            if (selectedImage) {
                var noImage = selectedImage.indexOf('/images/noimages') != -1;
                if (noImage) selectedImage = '/images/noimages.gif'; // set const noimage
                if (this.currentEntry && this.currentEntry.image_url) {
                    // 元画像がある
                    if (this.currentEntry.image_url != selectedImage ||
                        noImage) {
                        // 変更があった
                        data += '&image=' + encodeURIComponent(selectedImage);
                    }
                } else if (!noImage) {
                    // 元画像が無く、変更があった
                    data += '&image=' + encodeURIComponent(selectedImage);
                }
            }
            return data;
        },
        imageDetectClose: function() {
            $('#image-detect-container').hide();
        },
        imageSelect: function(img) {
            this.updateCurrentImage(img.src);
            this.imageDetectClose();
        },
        updateCurrentImage: function(src) {
            $('#current-image').attr('src', src);
            $('#current-image').attr('updated', src);
        },
        imageDetect: function() {
            var images = this.images;
            if (images && images.length) {
                images = $.unique(images.concat(['/images/noimages.png']));
                var list = $('#image-detect-container-list').empty();
                images.forEach(function(image) {
                    list.append($('<img/>').attr('src', image));
                });
                $('#image-detect-container').show();
            }
        },
        setCurrentImage: function(url, lastEditor) {
            $('#current-image').attr('src', url);
            if (this.images) {
                this.images.push(url);
            } else {
                this.images = [url];
            }
            if (lastEditor) {
                $('#image-detect-notice-user-container').text('最終変更: ').append(createUserLink(lastEditor)).
                show();
            }
        },
        setCanonical: function(url) {
            $('#link-canonical').attr('href', url).text(Utils.truncate(url, 40)).attr('title', url);
            $('#canonical-users').empty().attr('href', Utils.entryURL(url)).append(
                $('<img/>').attr('src', Utils.entryImage(url))
            );
            $('#bookmark-canonical').show();
        },
        canonicalClick: function() {
            this.loadByInformation({
                url: $('#link-canonical').attr('href')
            });
        },
        init: function() {
            var user = UserManager.user;
            if (!UserManager.user) {
               $('#bookmark-edit-container').hide();
               $('#login-container').show();
                return;
            }

            var self = this;
            getInformation().next(function(info) {
                self.loadByInformation(info);
            });
        },
        clearView: function() {
            this.container.empty();
            this.container.append(this.defaultHTML);
        },
        loadByInformation: function(info) {
            if (this.lastLoadedURL && this.lastLoadedURL != info.url) {
                this.clearView();
            } else if (this.lastLoadedURL == info.url) {
                return;
            }
            var self = this;
            this.lastLoadedURL = info.url;
            if (!this.defaultHTML) {
                this.defaultHTML = this.container.get(0).cloneNode(true);
                this.images = null;
                this.selectedImage = null;
                this.currentEntry = null;
                this.titleLoaded = false;
            }

            var user = UserManager.user;
            this.usericon.attr('src', user.view.icon);
            this.usernameEL.text(user.name);
            if (user.plususer) {
                this.plusInputs.removeClass('none');
                this.privateHelp.remove();
            } else {
                this.plusInputs.remove();
            }
            if (user.canUseTwitter) {
                if (user.postTwitterChecked === 'on' ||
                    (user.postTwitterChecked === 'inherit' &&
                     Config.get('popup.bookmark.postTwitter'))) {
                    this.postTwitter.attr('checked', 'checked');
                }
                this.postTwitter.bind('change', function() {
                    Config.set('popup.bookmark.postTwitter', this.checked);
                });
                this.postTwitterHelp.remove();
            } else {
                this.postTwitterContainer.remove();
            }
            if (user.canUseMixiCheck) {
                if (user.postMixiCheckChecked === 'on' ||
                    (user.postMixiCheckChecked === 'inherit' &&
                     Config.get('popup.bookmark.postMixiCheck'))) {
                    this.postMixiCheck.attr('checked', 'checked');
                }
                this.postMixiCheck.bind('change', function() {
                    Config.set('popup.bookmark.postMixiCheck', this.checked);
                });
                this.postMixiCheckHelp.remove();
            } else {
                this.postMixiCheckContainer.remove();
            }
            if (user.plususer && (user.canUseTwitter || user.canUseMixiCheck)) {
                $('#private').click(Ten.Function.method(this, 'privateClickHandler'));
                this.privateClickHandler();
            }
            if (!this.privateHelp.length && !this.postTwitterHelp.length && !this.postMixiCheckHelp.length) {
                this.optionHelpContainer.remove();
            }
            if (info.title) {
                this.setTitle(info.title);
            } else {
                this.setTitleByURL(info.url);
            }
            this.faviconEL.attr('src', info.faviconUrl);

            var url = info.url;

            this.port.postMessage({
                message: 'bookmarkedit_bridge_get',
                data: {
                    url: url,
                }
            });

            var lastCommentValueConf = Config.get('popup.bookmark.lastCommentValue');
            if (lastCommentValueConf && lastCommentValueConf.url == url) {
                // Config.set('popup.bookmark.lastCommentValue', {});
                this.commentEL.attr('value', lastCommentValueConf.comment);
                var cLength = lastCommentValueConf.comment.length;
                this.commentEL.get(0).setSelectionRange(cLength, cLength);
            }

            if (request_uri.param('error')) {
                $('#bookmark-error').text('申し訳ありません、以下の URL のブックマークに失敗しました。しばらく時間をおいていただき、再度ブックマークください。')
                .removeClass('none');
                this.commentEL.attr('value', request_uri.param('comment'));
            }

            // debug /
            /*
            setTimeout(function() {
                self.updatePageData({
                    'canonical': 'http://www.hatena.ne.jp/',
                    'images': ['http://www.hatena.ne.jp/images/badge-u-hover.gif', 'http://www.hatena.ne.jp/images/badge-u-hover.gif', 'http://www.hatena.ne.jp/images/badge-u-hover.gif', 'http://www.hatena.ne.jp/images/badge-u-hover.gif', 'http://www.hatena.ne.jp/images/badge-u-hover.gif', 'http://www.hatena.ne.jp/images/badge-u-hover.gif', 'http://www.hatena.ne.jp/images/badge-u-hover.gif', 'http://www.hatena.ne.jp/images/badge-d-used-hover.gif'],
                });
            }, 100);
            */

            if (!url || info.url.indexOf('http') != 0) {
                this.form.hide();
                this.message.text('この URL ははてなブックマークに追加できません');
                this.message.show();
                return;
            }

            if (url.indexOf('http://b.hatena.ne.jp/entry/') == 0) {
                var canURL = url;
                if (url.indexOf('http://b.hatena.ne.jp/entry/s/') == 0) {
                    canURL = canURL.replace('/s/', '/').replace('http://', 'https://');
                }
                canURL = canURL.replace('b.hatena.ne.jp/entry/', '');
                $('#canonical-tips').text('エントリーページをブックマークしようとしています。');
                this.setCanonical(canURL);
            }

            if (Config.get('popup.bookmark.confirmBookmark')) {
                this.confirmBookmark.attr('checked', 'checked');
            }
            this.confirmBookmark.bind('change', function() {
                Config.set('popup.bookmark.confirmBookmark', this.checked);
            });

            this.setURL(url);
            this.tagCompleter = TagCompleter;
            this.tagCompleter.register(this.commentEL, {
                updatedHandler: function(inputLine) {
                    // darty...
                    var m = inputLine.value;
                    var byte = Utils.countCommentToBytes(m);
                    byte = Math.floor(byte / 3);
                    self.typeCount.text(byte);
                    if (byte > 100) {
                        self.typeCount.addClass('red');
                    } else {
                        self.typeCount.removeClass('red');
                    }
                    $('dd span.tag').each(function(i, el) {
                        if (m.indexOf('[' + el.textContent + ']') == -1) {
                            $(el).removeClass('selected');
                        } else {
                            $(el).addClass('selected');
                            console.log(el.parentNode);
                            console.log(el.className);
                        }
                    });
                    rememberLastComment(m);
                    setTimeout(function() {
                        self.commentEL.focus();
                    }, 10);
                }
            });

            var lastCommentValue;
            function rememberLastComment(value) {
                if (lastCommentValue != value) {
                    lastCommentValue = value;
                    Config.set('popup.bookmark.lastCommentValue', {
                        url: url,
                        comment: lastCommentValue,
                    });
                }
            }

            $('dd span.tag').live('click', function() {
                var tag = this.textContent;
                var input = self.commentEL.get(0);
                var index = 0;
                if (this.className.indexOf('selected') == -1) {
                    index = input.selectionEnd + tag.length + 2;
                    self.tagCompleter.inputLine.addTag(tag);
                } else {
                    index = input.value.length - tag.length - 2;
                    self.tagCompleter.inputLine.deleteTag(tag);
                }
                input.setSelectionRange(index, index);
                return false;
            });

            var form = this.form;
            if (!form.data('keypressBound')) {
                form.data('keypressBound', true);
                form.keypress(function(e) {
                    if (e.keyCode !== 13 || e.target !== self.commentEL.get(0))
                        return;
                    $('#edit-submit').click();
                    return false;
                });
            }

            this.form.show();
            this.commentEL.focus();
            if (Config.get('popup.tags.allTags.enabled') || Config.get('popup.tags.complete.enabled')) {
                HTTPCache.usertags.get(user.name).next(function(res) {
                    if (Config.get('popup.tags.complete.enabled')) {
                        self.tagCompleter.addSuggestTags(res.tagsKeys);
                        self.tagCompleter.tagsObject = res.tags;
                    }
                    if (Config.get('popup.tags.allTags.enabled')) {
                        self.setUserTags(res)
                    }
                });
            }

            HTTPCache.entry.get(url).next(function(res) { self.setEntry(res) });
            Model.Bookmark.findByUrl(url).next(function(res) { self.setByBookmark(res) });
        },

        setUserTags: function(tags) {
            if (!tags || (tags.tagsCountSortedKeys && tags.tagsCountSortedKeys.length == 0)) return;

            var toggle = $('#show-all-tags-toggle');
            var conf = Config.bind('popup.tags.showAllTags');
            var updateText = function() {
                toggle.text(conf.get() ? '一部のタグのみ表示' : 'すべてのタグを表示');
            };

            var self = this;
            var update = function() {
                if (conf.get()) {
                    var target = tags.tagsKeys;
                } else {
                    var target = tags.tagsCountSortedKeys.slice(0, 20);
                }
                self.showTags(target, self.allTagsContainer, self.allTags);
            }

            toggle.bind('click', function() {
                conf.set(!conf.get());
                updateText();
                update();
                self.tagCompleter.update();
            });

            updateText();
            update();
        },

        setRecomendTags: function(tags) {
           this.showTags(tags, this.recommendTagsContainer, this.recommendTags);
           this.tagCompleter.update();
        },

        showTags: function(tags, container, tagsList) {
            if (!tags) return;
            var len = tags.length;
            if (len) {
                container.show();
                tagsList.empty();
                var frag = document.createDocumentFragment();
                for (var i = 0; i < len; i++) {
                    frag.appendChild(E('span', {
                        className: 'tag',
                    }, tags[i]));
                }
                tagsList.get(0).appendChild(frag);
            }
        },

        getMatchedTextNode: function(text, target) {
            return document.evaluate(
               'descendant::text()[contains(., "' + text.replace(/\"/g, '\\"') + '")]',
               target || document.body, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
            ).singleNodeValue;
        },

        setByBookmark: function(b) {
            if (b) {
                $('#bookmarked-notice').text('このエントリーは ' + b.dateYMDHM + ' にブックマークしました')
                .removeClass('none');
                $('#delete-button').removeClass('none');
                $('#edit-submit').attr('value', '編集');
                this.updateComment(b.comment);
            }
        },

        updateComment: function(text) {
            this.tagCompleter.updateComment(text);
        },

        setURL: function(url) {
            $('#input-url').attr('value', url);
            $('#url').text(Utils.truncate(url, 50)).attr('title', url).attr('href', url);

            if (!$('#favicon').attr('src')) {
                var favicon= new URI('http://cdn-ak.favicon.st-hatena.com/');
                favicon.param({url: url});
                this.faviconEL.attr('src', favicon);
            }
        },

        titleEditToggle: function() {
            var img = $('#title-editable-toggle');
            if (img.attr('src').indexOf('/images/edit-lock.png') == -1) {
                img.attr('src', '/images/edit-lock.png');
                $('#title-text-container').show();
                $('#title-text-edit-container').addClass('none');
                $('#title-input').attr('disabled', 'disabled');
                $('#title-notice').hide();
            } else {
                img.attr('src', '/images/edit-cancel.png');
                $('#title-text-container').hide();
                $('#title-text-edit-container').removeClass('none');
                $('#title-input').attr('disabled', null);
                $('#title-notice').show();
                if (this.currentEntry && this.currentEntry.title_last_editor) {
                    $('#title-notice-user-container').text('最終変更: ').append(createUserLink(this.currentEntry.title_last_editor)).
                    show();
                }
            }
        },

        setTitle: function(title, force) {
            if (force || !this.titleLoaded) {
                this.titleText.text(Utils.truncate(title, 60));
                this.titleText.attr('title', title);
               $('#title-input').attr('value', title);
            }
            this.titleLoaded = true;
        },

        setTitleByURL: function(title) {
            this.titleText.text(Utils.truncate(title, 70));
            this.titleText.attr('title', title);
           $('#title-input').attr('value', title);
        },

        setEntry: function(entry) {
            this.currentEntry = entry;
            $('body').removeClass('data-loading');
            if (entry.bookmarked_data && !$('#bookmarked-notice').text()) {
                var data = entry.bookmarked_data;
                data = {
                    dateYMDHM: data.timestamp,
                    comment: data.comment_raw,
                }
                this.setByBookmark(data);
            }

            if (entry.title) this.setTitle(entry.title, true);
            this.setURL(entry.url);
            if (Config.get('popup.tags.recommendTags.enabled'))
                this.setRecomendTags(entry.recommend_tags);
            var count = parseInt(entry.count);
            if (count) {
                var uc = $('#users-count');
                uc.text(String(count) + (count == 1 ? ' user' : ' users'));
                uc.attr('href', entry.entry_url);
                $('#users-count-container').removeClass('none');
            }
            if (entry.image_url) {
                this.setCurrentImage(entry.image_url, entry.image_last_editor);
            }
            if (entry.favorites && entry.favorites.length) {
                var f = $('#favorites');
                entry.favorites.reverse().forEach(function(fav) {
                    var permalink = sprintf("http://b.hatena.ne.jp/%s/%d#bookmark-%d",
                                            fav.name, fav.timestamp.replace(/\//g, ''),
                                            entry.eid);

                    var title;
                    if (fav.body) {
                        title = sprintf('%s: %s', fav.name, fav.body);
                    } else {
                        title = sprintf('%s', fav.name);
                    }
                    var link = Utils.createElementFromString(
                        '<a href="#{permalink}"><img title="#{title}" alt="#{title}" src="#{icon}" /></a>',
                    {
                        data: {
                            permalink: permalink,
                            icon: User.View.prototype.getProfileIcon(fav.name),
                            title:title
                        }
                    });
                    // ToDo: Tooltip にする
                    f.append(link);
                });
                f.show();
            }
            if (entry.is_private) {
                $('#private').attr('checked', 'true');
            }
            if (entry.has_asin) {
                var addAsin = $('#add-asin').attr('disabled', null);
                $('#asin').attr('disabled', null).attr('value', entry.asin);

                if (Config.get('popup.bookmark.addAsin')) {
                    addAsin.attr('checked', 'checked');
                }
                addAsin.bind('change', function() {
                    Config.set('popup.bookmark.addAsin', this.checked);
                });

                $('#asin-container').show();
            }
        },

        privateClickHandler: function() {
            [this.postTwitter[0] || null, this.postMixiCheck[0] || null].forEach(function (input) {
                if (!input) return;
                var label = input.parentNode;
                if (!label.enabledTitle) {
                    label.enabledTitle = label.title;
                    label.disabledTitle = label.title + '(非公開ブックマークは' + (input.name === 'post_twitter' ? ' Twitter ' : 'mixiチェック') + 'へ投稿されません。)';
                    input.defaultChecked = input.checked;
                }
                if ($('#private').get(0).checked) {
                    input.defaultChecked = input.checked;
                    input.checked = false;
                    input.disabled = true;
                    label.title = label.disabledTitle;
                    label.className = 'disabled';
                } else {
                    input.checked = input.defaultChecked;
                    input.disabled = false;
                    label.title = label.enabledTitle;
                    label.className = '';
                }
            });
        },
    }
};

function createUserLink(username) {
    var permalink = sprintf("http://b.hatena.ne.jp/%s/", username);
    return Utils.createElementFromString(
        '<span><img class="usericon" title="#{title}" alt="#{title}" src="#{icon}" /> <a href="#{permalink}">#{username}</a></span>',
    {
        data: {
            permalink: permalink,
            icon: User.View.prototype.getProfileIcon(username),
            username: username,
            title: username
        }
    });
}

var ViewManager = {
    show: function (name) {
        $('#login-container').hide();
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

var eulaAccept = function() {
    localStorage.eula = true;
    UserManager.loginWithRetry(15 * 1000);
    $('#eula').hide();
    setTimeout(function() {
        ready();
        setTimeout(function() {
            $('#main').show();
        }, 20);
    }, 1000);
}

/*
var setWindowSize = function(w, h) {
    document.getElementById('search-container').style.maxHeight = '' + h + 'px';
    document.getElementById('comment-list').style.maxHeight = '' + h + 'px';

    document.getElementById('search-container').style.maxWidth = '' + w + 'px';
    document.getElementById('comment-list').style.maxWidth = '' + w + 'px';
}
*/

var ready = function() {
    if (!localStorage.eula) {
        $('#main').hide();
        // 何故かレンダリングされないタイミングがあるのでずらす
        setTimeout(function() {
            $('#eula').show();
        }, 20);
        return;
    }

    if (window.popupMode) {
        if (request_uri.param('error')) {
            //
        } else {
            if (Config.get('popup.window.autosize')) {
                document.body.style.width = '' + 500 + 'px';
            } else {
                document.body.style.width = '' + Math.max(100, Config.get('popup.window.width')) + 'px';
            }
            // 同期実行だとうまく幅を調整できないので遅らせる
            setTimeout(function () {
                var overflow = $('#header').width() - $('body').width();
                if (overflow > 0) {
                    var search = $('#search-word');
                    search.width(Math.max(search.width() - overflow, 100));
                }
            }, 35);
            /*
            if (Config.get('popup.window.autosize')) {
                chrome.windows.getLastFocused(function(w) {
                    var width = 500;
                    var height = w.height - 300;
                    height = Math.max(height, 300);
                    setWindowSize(width, height);
                });
            } else {
                setWindowSize(Config.get('popup.window.width'), Config.get('popup.window.height'));
            }
            */
        }
    }
    var user = UserManager.user;
    if (user) {
        var hicon = $('#header-usericon');
        hicon.append(E('img', {
            title: user.name,
            alt: user.name,
            src: user.view.icon,
            width: 16,
            height: 16,
        }));
        hicon.show();
    }
    $('#search-form').bind('submit', searchFormSubmitHandler);
    if (Config.get('popup.search.incsearch')) {
        $('#search-word').bind('keyup', searchIncSearchHandler);
    }
    $('#image-detect-container-list img').live('click', function() {
        View.bookmark.imageSelect(this);
    });
    $('a').live('click', function() {
        this.target = '_blank';
    });
    // $('a').each(function() { this.target = '_blank' });
    if (request_uri.param('error')) {
        ViewManager.show('bookmark');
        return;
    }

    if (Config.get('popup.lastView') == 'bookmark') {
        ViewManager.show('bookmark');
    } else if (Config.get('popup.lastView') == 'search' && Config.get('popup.search.lastWord')) {
        document.getElementById('search-word').value = Config.get('popup.search.lastWord');
        View.search.search($('#search-word').attr('value'));
    } else {
        ViewManager.show('comment');
    }
};

$(document).bind('ready', ready);



