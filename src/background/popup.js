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
    chrome.extension.onConnect.addListener(function(port, name) {
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
    var url = View.bookmark.lastLoadedURL;
    if ( !url ) {
        throw new Error("Bookmark View に表示されているエントリの URL が不明です");
    }
    UserManager.user.deleteBookmark( url );
    closeWin();
}

// 指定した id のボタンの後ろに確認ポップアップの要素を追加する
function confirmWithCallback( id, msg, callback ) {
    function closeConfirmBox() { // 確認ポップアップを閉じる; イベントリスナの削除はここでする
        t.val( prevVal );
        t.attr( "disabled", false );
        listenersInfo.forEach( function (v,i,arr) { v[0].unbind(v[1][0],v[1][1]) } );
        listenersInfo = null;
        box.remove();
    }

    var box = $('<div class="confirmation-balloon shadow"><p class="msg"></p>' +
            '<div><input type="button" value="OK" class="ok">' +
            '<input type="button" value="キャンセル" class="cancel">' +
            '</div></div>');
    var t = $('#'+id);
    var prevVal = t.val();
    t.val( "確認" );
    t.attr( "disabled", true );
    box.attr( "id", id + "-confirmation" );
    box.find( ".msg" ).text( msg );
    var okButton = box.find( ".ok" );
    var cancelButton = box.find( ".cancel" );
    // イベントリスナ登録
    var listenersInfo = [
        [ box, [ "click", function (evt) { evt.stopPropagation() } ] ],
        [ $(document), [ "click", function (evt) { evt.target.id !== id && closeConfirmBox() } ] ],
        [ okButton, [ "click", function (evt) { closeConfirmBox(); callback(); } ] ],
        [ cancelButton, [ "click", function (evt) { closeConfirmBox(); t.focus(); } ] ]
    ];
    listenersInfo.forEach( function (v,i,arr) { v[0].bind(v[1][0],v[1][1]) } );
    // 要素の追加とフォーカス
    box.insertAfter( t );
    cancelButton.focus();
    return box;
}

function formSubmitHandler(ev) {
    // TODO この関数は View.bookmark の中で管理すべき
    var form = $('#form');

    var user = UserManager.user;
    var url = form.serialize();
    url = View.bookmark.__setSubmitData(url);

    url = url.replace(new RegExp('\\+', 'g'), '%20'); // for title
    console.log(url);
    user.saveBookmark(url);
    setTimeout(function() {
        closeWin();
    }, 0);
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
    loginmessage: {
        get container() { return $('#login-container'); },
        onshow: function() {
        },
        onhide: function() {
        }
    },
    search: {
        get container() { return $('#search-container'); },
        get tab() { return $('#search-tab'); },
        onshow: function() {
        },
        onhide: function() {
        },
        /** private */
        get __list() { return $('#search-result'); },
        get __searchWord() { return $('#search-word'); },
        get __wordPreview() { return $('#search-word-preview'); },
        get __totalCount() { return $('#search-total-count'); },
        /** public */
        searchAndDisplay: function( word ) {
            Config.set( 'popup.search.lastWord', word );
            this.__searchWord.focus();

            document.getElementById('hatena-websearch').href = 'http://b.hatena.ne.jp/search?q=' + encodeURIComponent(word);
            var list = this.__list;
            list.empty();
            if (this.current) {
                this.current.cancel();
                delete this.current;
            }
            var self = this;
            var start = 0;

            self.__wordPreview.empty();
            self.__wordPreview.append(E('span',{},  E('em', {}, word), 'での検索結果'));

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
                    self.__totalCount.text(rLen >= (max-1) ? sprintf('%d件以上', max) : sprintf('%d件', rLen));
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
        // --- public accessors ---
        get container()       { return $('#comment-container') },
        get tab()             { return $('#comment-tab') },
        // --- private accessors ---
        get __list()            { return $('#comment-list') },
        get __title()           { return $('#comment-title') },
        get __titleContainer()  { return $('#comment-title-container') },
        get __starLoadingIcon() { return $('#star-loading-icon') },
        get __commentUsers()    { return $('#comment-users') },
        get __commentCount()    { return $('#comment-count-detail') },
        get __commentInfos()    { return $('#comment-infos') },
        get __commentToggle()   { return $('#comment-toggle') },
        get __commentMessage()   { return $('#comment-message') },
        // --- public methods ---
        onshow: function() {
            this.__init();
            $("#comment-toggle").bind( "click", this.__listeners.onClickNoCommentToggleButton );
        },
        onhide: function() {
            $("#comment-toggle").unbind( "click", this.__listeners.onClickNoCommentToggleButton );
        },
        // --- private methods ---
        __listeners: {
            onClickNoCommentToggleButton: function ( evt ) { View.comment.__toggleNoComment() }
        },
        __init: function() {
            if (this.inited) return;
            var self = this;
            getInformation().next(function(info) {
                self.__setTitle(info.title || info.url);
                self.__titleContainer.css('background-image', info.faviconUrl ? info.faviconUrl : sprintf('url(%s)', Utils.faviconUrl(info.url)));
                if (info.url.indexOf('http') != 0) {
                    self.__commentMessage.text('表示できるブックマークコメントはありません');
                    return;
                }
                HTTPCache.comment.get(info.url).next(function(r) {
                    if (r) {
                        self.__commentMessage.hide();
                        self.__setTitle(r.title);
                        self.__list.empty();
                        self.__list.html('');
                        self.__showComment(r);
                    } else {
                        self.__commentMessage.text('表示できるブックマークコメントはありません');
                    }
                });
            });
        },
        __setTitle: function(title) {
            this.__title.text(Utils.truncate(title, 60));
            this.__title.attr('title', title);
        },
        __showNoComment: function() {
            this.__list.removeClass('hide-nocomment');
            Config.set('popup.commentviewer.togglehide', true);
            this.__commentToggle.attr('src', '/images/comment-viewer-toggle-on.png');
            this.__commentToggle.attr('title', 'コメントがないユーザを非表示');
            this.__commentToggle.attr('alt', 'コメントがないユーザを非表示');
        },
        __hideNoComment: function() {
            this.__list.addClass('hide-nocomment');
            Config.set('popup.commentviewer.togglehide', false);
            this.__commentToggle.attr('src', '/images/comment-viewer-toggle-off.png');
            this.__commentToggle.attr('title', 'すべてのユーザを表示');
            this.__commentToggle.attr('alt', 'すべてのユーザを表示');
        },
        __toggleNoComment: function() {
            if (this.__list.hasClass('hide-nocomment')) {
                this.__showNoComment();
            } else {
                this.__hideNoComment();
            }
        },
        __showComment: function(data) {
            var eid = data.eid;
            var self = this;
            var bookmarks = data.bookmarks;

            // http://b.hatena.ne.jp/entry/jsonlite/ が返す JSON に "bookmarks"
            // プロパティが存在しないのは, 著者が非公開設定にしている場合
            if ( !bookmarks ) {
                self.__commentMessage.text( "ページ作者の希望により" +
                        "ブックマーク一覧は非表示に設定されています" );
                self.__commentMessage.show();
                this.inited = true;
                return;
            }

            if (UserManager.user && UserManager.user.ignores) {
                var ignoreRegex = UserManager.user.ignores;
                bookmarks = bookmarks.filter(function(b) { return ! ignoreRegex.test(b.user) });
            }
            var publicLen = bookmarks.length;

            if (Config.get('popup.commentviewer.autodetect.enabled')) {
                if (Config.get('popup.commentviewer.autodetect.threshold') < publicLen) {
                    self.__hideNoComment();
                }
            } else if (!Config.get('popup.commentviewer.togglehide')) {
                self.__hideNoComment();
            }

            self.__commentUsers.text(sprintf('%d %s', data.count, data.count > 1 ? 'users' : 'user'));
            self.__commentUsers.attr('href', data.entry_url);
            if (data.count > 3) {
                self.__commentUsers.wrap($('<em/>'));
            }
            self.__commentCount.text(sprintf('(%s + %s)', publicLen, data.count - publicLen));
            self.__commentInfos.show();

            if (publicLen == 0) {
                self.__commentMessage.text('表示できるブックマークコメントはありません');
                self.__commentMessage.show();
                this.inited = true;
                return;
            }

            var i = 0;
            var step = 100;
            var starLoaded = 0;
            self.__starLoadingIcon.show();
            var starLoadedCheck = function(entriesLen) {
                starLoaded++;
                if (publicLen/step <= starLoaded) {
                    self.__starLoadingIcon.hide();
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
                self.__list.append(frag);
                return Deferred.wait(0.25);
            });
            this.inited = true;
        }
    },
    bookmark: {
        // --- public accessors ---
        get container()                { return $('#bookmark-container'); },
        get tab()                      { return $('#bookmark-tab'); },
        // --- private accessors ---
        get __confirmBookmark()        { return $('#confirm-bookmark'); },
        get __usericon()               { return $('#usericon') },
        get __usernameEL()             { return $('#username') },
        get __titleText()              { return $('#title-text') },
        get __faviconEL()              { return $('#favicon') },
        get __form()                   { return $('#form') },
        get __message()                { return $('#bookmark-message') },
        get __commentEL()                { return $('#comment') },
        get __allTagsContainer()       { return $('#all-tags-container') },
        get __allTags()                { return $('#all-tags') },
        get __recommendTagsContainer() { return $('#recommend-tags-container') },
        get __recommendTags()          { return $('#recommend-tags') },
        get __tagNotice()              { return $('#tag-notice') },
        get __typeCount()              { return $('#type-count') },
        get __port() {
            if (!this._port) {
                var self = this;
                var _port = chrome.extension.connect();
                // ToDO もう一段階簡略化できそう
                _port.onMessage.addListener(function(info, con) {
                    if (info.message == 'bookmarkedit_bridge_recieve')
                        self.__updatePageData(info.data);
                });
                this._port = _port;
            }
            return this._port;
        },
        // --- public methods ---
        onshow: function() {
            this.__addListeners();
            this.__init();
        },
        onhide: function() {
            this.__removeListeners();
        },
        // --- private methods ---
        __listeners: {
            onClickImgDetectClose: function ( evt ) { View.bookmark.__imageDetectClose() },
            onClickImgCurrentContainer: function ( evt ) { View.bookmark.__imageDetect() },
            onClickCanonical: function ( evt ) { View.bookmark.__canonicalClick() },
            onClickTitleEditToggleButton: function ( evt ) { View.bookmark.__titleEditToggle() },
            onSubmitForm: function ( evt ) {
                formSubmitHandler( evt.currentTarget );
                evt.preventDefault();
            },
            onClickDeleteButton: function ( evt ) {
                var id = evt.target.id;
                var msg = "このブックマークを削除します。 よろしいですか?";
                confirmWithCallback( id, msg, deleteBookmark );
            }
        },
        __addListeners: function () {
            var ll = this.__listeners;
            $("#image-detect-container-close-button").bind( "click", ll.onClickImgDetectClose );
            $("#image-current-container").bind( "click", ll.onClickImgCurrentContainer );
            $("#canonical-tips-button").bind( "click", ll.onClickCanonical );
            $("#title-editable-toggle").bind( "click", ll.onClickTitleEditToggleButton );
            $("#delete-button").bind( "click", ll.onClickDeleteButton );
            $("#form").bind( "submit", ll.onSubmitForm );
            this.privateOption.setEventListener();
        },
        __removeListeners: function () {
            var ll = this.__listeners;
            $("#image-detect-container-close-button").unbind( "click", ll.onClickImgDetectClose );
            $("#image-current-container").unbind( "click", ll.onClickImgCurrentContainer );
            $("#canonical-tips-button").unbind( "click", ll.onClickCanonical );
            $("#title-editable-toggle").unbind( "click", ll.onClickTitleEditToggleButton );
            $("#delete-button").unbind( "click", ll.onClickDeleteButton );
            $("#form").unbind( "submit", ll.onSubmitForm );
            this.privateOption.unsetEventListener();
        },
        __init: function() {
            var user = UserManager.user;
            if (!UserManager.user) {
                // TODO error
                return;
            }

            var self = this;
            getInformation().next(function(info) {
                self.__loadByInformation(info);
            });
        },
        __updatePageData: function(data) {
            if (data.images) {
                this.__setImages(data.images);
            }
            if (data.canonical) {
                this.__setCanonical(data.canonical);
            }
            if (data.title) {
                this.__setTitle(data.title);
            }
            // 選択されている文字列があれば引用風の体裁でコメントにフィルイン
            if (data.selection) {
                var quote = '“' + data.selection.replace(/\s+/g, ' ') + '”';
                this.__updateComment(quote);
            }
        },
        __setImages: function(images) {
            if (this.images) {
                this.images = this.images.concat(images);
            } else {
                this.images = images;
            }
            // TODO 元々非表示であることが期待されている? (非表示になることは現状ではない)
            $('#image-table-container').show();
        },
        __setSubmitData: function(data) {
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
        __imageDetectClose: function() {
            $('#image-detect-container').hide();
        },
        __imageSelect: function(img) {
            this.__updateCurrentImage(img.src);
            this.__imageDetectClose();
        },
        __updateCurrentImage: function(src) {
            $('#current-image').attr('src', src);
            $('#current-image').attr('updated', src);
        },
        __imageDetect: function() {
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
        __setCurrentImage: function(url, lastEditor) {
            $('#current-image').attr('src', url);
            if (this.images) {
                this.images.push(url);
            } else {
                this.images = [url];
            }
            if (lastEditor) {
                $('#image-detect-notice-user-container').text('最終変更 : ').append(createUserLink(lastEditor)).
                show();
            }
        },
        __setCanonical: function(url) {
            $('#link-canonical').attr('href', url).text(Utils.truncate(url, 40)).attr('title', url);
            $('#canonical-users').empty().attr('href', Utils.entryURL(url)).append(
                $('<img/>').attr('src', Utils.entryImage(url))
            );
            $('#bookmark-canonical').show();
        },
        __canonicalClick: function() {
            this.__loadByInformation({
                url: $('#link-canonical').attr('href')
            });
        },
        __clearView: function() {
            this.__removeListeners();
            this.container.empty();
            this.container.append( this.defaultHTML );
            this.defaultHTML = void 0;
            this.__addListeners();
        },
        __loadByInformation: function(info) {
            if (this.lastLoadedURL && this.lastLoadedURL != info.url) {
                this.__clearView();
            } else if (this.lastLoadedURL == info.url) {
                return;
            }
            var self = this;
            this.lastLoadedURL = info.url;
            if (!this.defaultHTML) {
                this.defaultHTML = $(this.container.get(0)).clone(false);
                this.images = null;
                this.selectedImage = null;
                this.currentEntry = null;
                this.titleLoaded = false;
            }

            var user = UserManager.user;
            this.__usericon.attr('src', user.view.icon);
            this.__usernameEL.text(user.name);
            // SharingOptions (共有オプション) に関する部分の初期化
            sharingOptions.initSharingOptions( user, this );
            this.privateClickHandler();

            if (info.title) {
                this.__setTitle(info.title);
            } else {
                this.__setTitleByURL(info.url);
            }
            this.__faviconEL.attr('src', info.faviconUrl);

            var url = info.url;

            this.__port.postMessage({
                message: 'bookmarkedit_bridge_get',
                data: {
                    url: url,
                }
            });

            var lastCommentValueConf = Config.get('popup.bookmark.lastCommentValue');
            if (lastCommentValueConf && lastCommentValueConf.url == url) {
                // Config.set('popup.bookmark.lastCommentValue', {});
                this.__commentEL.attr('value', lastCommentValueConf.comment);
                var cLength = lastCommentValueConf.comment.length;
                this.__commentEL.get(0).setSelectionRange(cLength, cLength);
            }

            if (request_uri.param('error')) {
                $('#bookmark-error').text('申し訳ありません、以下の URL のブックマークに失敗しました。しばらく時間をおいていただき、再度ブックマークください。')
                .removeClass('none');
                this.__commentEL.attr('value', request_uri.param('comment'));
            }

            // debug /
            /*
            setTimeout(function() {
                self.__updatePageData({
                    'canonical': 'http://www.hatena.ne.jp/',
                    'images': ['http://www.hatena.ne.jp/images/badge-u-hover.gif', 'http://www.hatena.ne.jp/images/badge-u-hover.gif', 'http://www.hatena.ne.jp/images/badge-u-hover.gif', 'http://www.hatena.ne.jp/images/badge-u-hover.gif', 'http://www.hatena.ne.jp/images/badge-u-hover.gif', 'http://www.hatena.ne.jp/images/badge-u-hover.gif', 'http://www.hatena.ne.jp/images/badge-u-hover.gif', 'http://www.hatena.ne.jp/images/badge-d-used-hover.gif'],
                });
            }, 100);
            */

            if (!url || info.url.indexOf('http') != 0) {
                this.__form.hide();
                this.__message.text('この URL ははてなブックマークに追加できません');
                this.__message.show();
                return;
            }

            if (url.indexOf('http://b.hatena.ne.jp/entry/') == 0) {
                var canURL = url;
                if (url.indexOf('http://b.hatena.ne.jp/entry/s/') == 0) {
                    canURL = canURL.replace('/s/', '/').replace('http://', 'https://');
                }
                canURL = canURL.replace('b.hatena.ne.jp/entry/', '');
                $('#canonical-tips').text('エントリーページをブックマークしようとしています。');
                this.__setCanonical(canURL);
            }

            if (Config.get('popup.bookmark.confirmBookmark')) {
                this.__confirmBookmark.attr('checked', 'checked');
            }
            this.__confirmBookmark.bind('change', function() {
                Config.set('popup.bookmark.confirmBookmark', this.checked);
            });

            this.__setURL(url);
            this.tagCompleter = TagCompleter;
            this.tagCompleter.register(this.__commentEL, {
                updatedHandler: function(inputLine) {
                    // darty...
                    var m = inputLine.value;
                    var byte = Utils.countCommentToBytes(m);
                    byte = Math.floor(byte / 3);
                    self.__typeCount.text(byte);
                    if (byte > 100) {
                        self.__typeCount.addClass('red');
                    } else {
                        self.__typeCount.removeClass('red');
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
                        self.__commentEL.focus();
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

            var form = this.__form;
            if (!form.data('keypressBound')) {
                form.data('keypressBound', true);
                form.keypress(function(e) {
                    if (e.keyCode !== 13 || e.target !== self.__commentEL.get(0))
                        return;
                    $('#edit-submit').click();
                    return false;
                });
            }

            this.__form.show();
            this.__commentEL.focus();
            if (Config.get('popup.tags.allTags.enabled') || Config.get('popup.tags.complete.enabled')) {
                HTTPCache.usertags.get(user.name).next(function(res) {
                    if (Config.get('popup.tags.complete.enabled')) {
                        self.tagCompleter.addSuggestTags(res.tagsKeys);
                        self.tagCompleter.tagsObject = res.tags;
                    }
                    if (Config.get('popup.tags.allTags.enabled')) {
                        self.__setUserTags(res)
                    }
                });
            }

            HTTPCache.entry.get(url).next(function(res) { self.__setEntry(res) });
            Model.Bookmark.findByUrl(url).next(function(res) { self.__setByBookmark(res) });
        },

        __setUserTags: function(tags) {
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
                self.__showTags(target, self.__allTagsContainer, self.__allTags);
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

        __setRecommendTags: function(tags) {
           this.__showTags(tags, this.__recommendTagsContainer, this.__recommendTags);
           this.tagCompleter.update();
           if (tags && tags.length) {
               this.__tagNotice.remove();
           }
        },

        __showTags: function(tags, container, tagsList) {
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

        // 使われてない
        __getMatchedTextNode: function(text, target) {
            return document.evaluate(
               'descendant::text()[contains(., "' + text.replace(/\"/g, '\\"') + '")]',
               target || document.body, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
            ).singleNodeValue;
        },

        __setByBookmark: function(b) {
            if (b) {
                $('#bookmarked-notice-text').text('このエントリーは ' + b.dateYMDHM + ' にブックマークしました');
                $('#bookmarked-notice').removeClass('none');
                $('#edit-submit').attr('value', '保存');
                this.__updateComment(b.comment);
            }
        },

        __updateComment: function(text) {
            this.tagCompleter.updateComment(text);
        },

        __setURL: function(url) {
            $('#input-url').attr('value', url);
            $('#url').text(Utils.truncate(url, 50)).attr('title', url).attr('href', url);

            if (!$('#favicon').attr('src')) {
                var favicon= new URI('http://cdn-ak.favicon.st-hatena.com/');
                favicon.param({url: url});
                this.__faviconEL.attr('src', favicon);
            }
        },

        __titleEditToggle: function() {
            var $img = $('#title-editable-toggle');
            var to_edit_image_path = '/images/edit.png';
            var to_close_image_path = '/images/close.gif';
            if ($img.attr('src').indexOf(to_edit_image_path) == -1) {
                $img.attr('src', to_edit_image_path);
                $img.attr('title', 'タイトルを変更する');
                $('#title-text-container').show();
                $('#title-text-edit-container').addClass('none');
                $('#title-input').attr('disabled', 'disabled');
                $('#title-notice').hide();
            } else {
                $img.attr('src', to_close_image_path);
                $img.attr('title', '変更をキャンセルする');
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

        __setTitle: function(title, force) {
            if (force || !this.titleLoaded) {
                this.__titleText.text(Utils.truncate(title, 60));
                this.__titleText.attr('title', title);
               $('#title-input').attr('value', title);
            }
            this.titleLoaded = true;
        },

        __setTitleByURL: function(title) {
            this.__titleText.text(Utils.truncate(title, 70));
            this.__titleText.attr('title', title);
           $('#title-input').attr('value', title);
        },

        __setEntry: function(entry) {
            this.currentEntry = entry;
            $('body').removeClass('data-loading');
            if (entry.bookmarked_data && !$('#bookmarked-notice-text').text()) {
                var data = entry.bookmarked_data;
                data = {
                    dateYMDHM: data.timestamp,
                    comment: data.comment_raw,
                }
                this.__setByBookmark(data);
            }

            if (entry.title) this.__setTitle(entry.title, true);
            this.__setURL(entry.url);
            if (Config.get('popup.tags.recommendTags.enabled'))
                this.__setRecommendTags(entry.recommend_tags);
            var count = parseInt(entry.count, 10);
            if (count) {
                var uc = $('#users-count');
                uc.text(String(count) + (count == 1 ? ' user' : ' users'));
                uc.attr('href', entry.entry_url);
                $('#users-count-container').removeClass('none');
            }
            if (entry.image_url) {
                this.__setCurrentImage(entry.image_url, entry.image_last_editor);
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
                this.privateOption.setValue( true );
            }
            if (entry.has_asin) {
                var addAsin = $('#add-asin').prop('disabled', null);
                $('#asin').prop('disabled', null).attr('value', entry.asin);
                $('#asin-container').show();
            }
        },

        // TODO ここにある意味はないので, privateOption か sharingOptions に移す
        privateClickHandler: function() {
            sharingOptions.setPrivate( $('#private').val() );
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
    initialize: function __ViewManager_initialize() {
    },
    finalize: function __ViewManager_finalize() {
    },
    _currentTab: void 0,
    _currentViewName: void 0,
    __changeTab: function ( viewName ) {
        if ( this._currentTab ) {
            this._currentTab.removeClass('current');
            this._currentTab = void 0;
        }
        if ( viewName && View[viewName].tab ) {
            ( this._currentTab = View[viewName].tab ).addClass('current');
        }
    },
    show: function (name) {
        if ( this._currentViewName === name ) {
            return;
        } else if ( this._currentViewName ) {
            var currentView = View[this._currentViewName];
            currentView.onhide();
            currentView.container.hide();
            this._currentViewName = void 0;
        }

        // setTimeout は必要か???
        // setTimeout(function() {
        var currentView = View[name];
        if ( currentView ) {
            currentView.container.show();
            Config.set( 'popup.lastView', name );
            currentView.onshow();
            this._currentViewName = name;
        }
        // }, 20); // 待機時間が短いとコメント一覧がすぐには表示されない問題
    },

    showBookmarkAddForm: function () {
        this.__changeTab("bookmark");
        if ( !UserManager.user ) {
            this.show('loginmessage');
        } else {
            this.show('bookmark');
        }
    },
    showComment: function () {
        this.__changeTab("comment");
        this.show("comment");
    },
    search: function ( searchWord ) {
        this.__changeTab("search");
        if ( !UserManager.user ) {
            this.show('loginmessage');
        } else {
            this.show('search');
            View.search.searchAndDisplay( searchWord );
        }
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

/*
var setWindowSize = function(w, h) {
    document.getElementById('search-container').style.maxHeight = '' + h + 'px';
    document.getElementById('comment-list').style.maxHeight = '' + h + 'px';

    document.getElementById('search-container').style.maxWidth = '' + w + 'px';
    document.getElementById('comment-list').style.maxWidth = '' + w + 'px';
}
*/

function changePopupWindowWidthAppropriately() {
    if ( window.popupMode ) {
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
}

var ready = function() {
    // bookmark view におけるタグ一覧のタグクリックのリスナ
    $('dd span.tag').live( 'click', function() {
        // TODO この関数は View.bookmark の中で管理すべき
        var bView = View.bookmark;
        var tag = this.textContent;
        var input = bView.__commentEL.get(0);
        var index = 0;
        if ( this.className.indexOf('selected') == -1 ) {
            index = input.selectionEnd + tag.length + 2;
            bView.tagCompleter.inputLine.addTag(tag);
        } else {
            index = input.value.length - tag.length - 2;
            bView.tagCompleter.inputLine.deleteTag(tag);
        }
        input.setSelectionRange(index, index);
        return false;
    } );

    $('#image-detect-container-list img').live('click', function() {
        // TODO この関数は View.bookmark の中で管理すべき
        View.bookmark.__imageSelect(this);
    });
    $('a').live('click', function() {
        this.target = '_blank';
    });
    // $('a').each(function() { this.target = '_blank' });
    if (request_uri.param('error')) {
        ViewManager.showBookmarkAddForm();
        return;
    }
};

$(document).bind('ready', ready);

/**
 * View.bookmark.privateOption
 * 非公開オプションの管理用オブジェクト
 * public :
 *  - View.bookmark.privateOption.setValue( boolean )
 */
(function namespace() {
    // Model としては hidden の input 要素を使い, View として button を使う
    // 本来は $modelElem の状態を変更したら自動的に $viewElem が変更されるようにすべき
    // 現在は画面変更時に要素の clone をするということをしていて整合させるのが
    // 難しいので, 簡易的に処理する
    // また, 同様の理由により, オブジェクト内部に DOM Element を保持するのではなく
    // 処理の度に document から取ってくるようにしている.

    var privateOption = View.bookmark.privateOption = {};
    privateOption.setEventListener = _privateOption_setEventListener;
    privateOption.unsetEventListener = _privateOption_unsetEventListener;

    /** Model に合うように View を変える */
    function makeViewCorrespondToModel( $modelElem ) {
        var $viewElem = $("#private-option-view");
        $viewElem.prop( "checked", $modelElem.val() ? true : false );
    }
    /** Model の状態を (外部から) 指定して変更する */
    privateOption.setValue = setValue;
    function setValue( isPrivate ) {
        var $modelElem = $("#private");
        $modelElem.val( isPrivate ? "1" : "" );
        makeViewCorrespondToModel( $modelElem );
        View.bookmark.privateClickHandler(); // sharingOptions に private 状態を伝える
    }
    /** View の変更を Model に反映させるための controller */
    function onChangeView( evt ) {
        var $modelElem = $("#private");
        setValue( this.checked );
    }
    function _privateOption_setEventListener() {
        $("#private-option-view").bind( "change", onChangeView );
        makeViewCorrespondToModel( $("#private") );
    }
    function _privateOption_unsetEventListener() {
        $("#private-option-view").unbind( "change", onChangeView );
    }
}).call( this );

/** View.bookmark.optionHelpTooltipManager
 * 本来は使えないオプションを有効にしたときに表示されるツールチップを管理するオブジェクト
 */
(function namespace() {
    var man = View.bookmark.optionHelpTooltipManager = {};
    // 表示中のツールチップの id
    var idBeingDisplayed = void 0;

    /** ツールチップが表示されているときにドキュメントクリックで呼び出されるリスナ */
    function onClickDocument( evt ) {
        // ツールチップがクリックされた場合は閉じない
        if ( ! $(evt.target).closest('.option-help-tooltip').length )
            dropTooltip();
    }
    /** 表示しているツールチップを閉じる */
    function dropTooltip() {
        $(document).unbind( "click", onClickDocument );
        var $tooltipBox = $("#"+idBeingDisplayed);
        if ( ! $tooltipBox.length ) {
            console.error( "指定された id のツールチップは存在しません" );
        }
        $tooltipBox.css( "display", "none" );
        idBeingDisplayed = void 0;
    }
    /** public: View.bookmark.optionHelpTooltipManager.showTooltip( tooltipId )
     * ツールチップを表示する
     */
    man.showTooltip = showTooltip;
    function showTooltip( tooltipId ) {
        var $tooltipBox = $("#"+tooltipId);
        if ( idBeingDisplayed ) { // 古いツールチップが残っている場合
            dropTooltip();
        }
        if ( ! $tooltipBox.length ) {
            console.error( "指定された id のツールチップは存在しません" );
            return;
        }
        $tooltipBox.css( "display", "block" );
        idBeingDisplayed = tooltipId;
        // Tooltip を消すためのリスナの登録
        // change イベントでこのリスナ登録をしてそのあとの click イベントで実行される,
        // というようなことがあるのでとりあえず setTimeout で逃げる
        // cf : http://dev.opera.com/articles/view/timing-and-synchronization-in-javascript/
        setTimeout( function () {
            $(document).bind( "click", onClickDocument );
        }, 4 );
    }
}).call( this );



$(document).bind( "ready", function onready() {
    $(document).unbind( "ready", onready );
    changePopupWindowWidthAppropriately();
    pageManager.initialize();
} );
$(window).bind( "unload", function onunload() {
    $(window).unbind( "unload", onunload );
    pageManager.finalize();
} );

var pageManager;
(function definePageManagerObject() {
    pageManager = {};
    pageManager.initialize = pageManager_initialize;
    pageManager.finalize   = pageManager_finalize;
    pageManager.showEulaPage = pageManager_showEulaPage;
    pageManager.showMainPage = pageManager_showMainPage;

    var currentPage = null;
    var pages = null;
    function pageManager_initialize() {
        pages = [ eulaPage, mainPage ];
        pages.forEach( function ( elem ) { elem.initialize() } );

        !localStorage.eula ? pageManager_showEulaPage()
                           : pageManager_showMainPage();
    }
    function pageManager_finalize() {
        _hideCurrentPage();
        pages.forEach( function ( elem ) { elem.finalize() } );
        pages = null;
    }
    function pageManager_showEulaPage() {
        _showPage( eulaPage );
    }
    function pageManager_showMainPage() {
        _showPage( mainPage );
    }
    function _showPage( page ) {
        if ( currentPage === page ) return;
        if ( currentPage ) {
            currentPage.hide();
            currentPage = null;
        }
        page.show();
        currentPage = page;
    }
    function _hideCurrentPage() {
        if ( currentPage ) currentPage.hide();
        currentPage = null;
    }
}).call( this );

var Page;
(function definePageClass() {
    Page = _Page;
    Page.prototype.initialize = _Page_initialize;
    Page.prototype.finalize   = _Page_finalize;
    Page.prototype.show = _Page_show;
    Page.prototype.hide = _Page_hide;

    function _Page( pageElemId ) {
        this._pageElemId = pageElemId;
        this._$elem = null;
    }
    function _Page_initialize() {
        this._$elem = $('#'+this._pageElemId);
        this._$elem.hide();
    }
    function _Page_finalize() {
        this._$elem.hide();
        this._$elem = null;
        delete this.onshow;
        delete this.onhide;
    }
    function _Page_show() {
        if ( this.onshow ) this.onshow();
        this._$elem.show();
    }
    function _Page_hide() {
        if ( this.onhide ) this.onhide();
        this._$elem.hide();
    }
}).call( this );

var eulaPage = new Page( "eula" );
(function extendEulaPageObject() {
    function eulaAccept() {
        localStorage.eula = "accepted";
        UserManager.loginWithRetry(15 * 1000);
        pageManager.showMainPage();
    }
    function onClickAcceptButton( evt ) {
        eulaAccept();
    }
    function onClickNotAcceptButton( evt ) {
        // TODO closeWin するときの後処理
        closeWin();
    }
    eulaPage.onshow = function eulaPage_onshow() {
        $("#eula-accept-button-ok").bind( "click", onClickAcceptButton );
        $("#eula-accept-button-ng").bind( "click", onClickNotAcceptButton );
    };
    eulaPage.onhide = function eulaPage_onshow() {
        $("#eula-accept-button-ok").unbind( "click", onClickAcceptButton );
        $("#eula-accept-button-ng").unbind( "click", onClickNotAcceptButton );
    };
}).call( this );

var mainPage = new Page( "main" );
(function extendMainPage() {
    function onClickBookmarkButton( evt ) {
        ViewManager.showBookmarkAddForm();
    }
    function onClickCommentButton( evt ) {
        ViewManager.showComment();
    }
    function searchFormSubmitHandler( evt ) {
        evt.preventDefault();
        ViewManager.search( $('#search-word').attr('value') );
    }
    var _searchIncD = null;
    function searchIncSearchHandler( evt ) {
        evt.preventDefault();
        if ( _searchIncD ) _searchIncD.cancel();
        _searchIncD = Deferred.wait(0.2).next(function() {
            _searchIncD = null;
            ViewManager.search( $('#search-word').attr('value') );
        });
    }

    mainPage.onshow = function mainPage_onshow() {
        $("#bookmark-tab").bind( "click", onClickBookmarkButton );
        $("#comment-tab").bind( "click", onClickCommentButton );
        $('#search-form').bind( "submit", searchFormSubmitHandler );
        if ( Config.get('popup.search.incsearch') ) {
            $('#search-word').bind( "keyup", searchIncSearchHandler );
        }

        var lastView = Config.get('popup.lastView');
        if ( lastView === 'bookmark' ) {
            ViewManager.showBookmarkAddForm();
        } else {
            var lastWord = Config.get('popup.search.lastWord');
            if ( lastView === 'search' && lastWord ) {
                document.getElementById('search-word').value = lastWord;
                ViewManager.search( $('#search-word').attr('value') );
            } else {
                ViewManager.showComment();
            }
        }
    };
    mainPage.onhide = function mainPage_onhide() {
        $("#bookmark-tab").unbind( "click", onClickBookmarkButton );
        $("#comment-tab").unbind( "click", onClickCommentButton );
        $('#search-form').unbind( "submit", searchFormSubmitHandler );
        // bind してなくても削除処理をする
        $('#search-word').unbind( "keyup", searchIncSearchHandler );
    };
}).call( this );
