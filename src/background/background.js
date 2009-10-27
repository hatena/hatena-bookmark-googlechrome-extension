
var Manager = $({});

$.extend(Manager, {
    editBookmark: function(url, options) {
        if (!UserManager.user) {
            // XXX:
            chrome.tabs.create({
                url: 'http://www.hatena.ne.jp/login'
            });
            return;
        }
        var uri = URI.pathQuery('/background/bookmarkedit.html');
        if (options) uri.param(options);
        uri.param({
            url: url
        });
        window.open(uri.pathQuery, 'bookmarkedit');
    },
    editBookmarkTab: function(tabId) {
        chrome.tabs.get(tabId, function(tab) {
            Manager.editBookmark(tab.url, {
                faviconUrl: tab.faviconUrl,
                winId: tab.windowId,
                tabId: tab.id,
                title: tab.title
            });
        });
    },
    editBookmarkError: function(data) {
        console.error(data);
    },
    deleteBookmarkError: function(data) {
        console.error(data);
    },
    _iconDataCache: {},
    getIconData: function(iconId) {
        if (!Manager._iconDataCache[iconId]) {
            if (!Manager._ctx) {
                var canvas = document.getElementById('bookmark-icon-canvas');
                Manager._ctx = canvas.getContext('2d');
            }
            var ctx = Manager._ctx;

            var icon = document.getElementById(iconId);
            ctx.clearRect(0, 0, icon.width, icon.height);
            ctx.drawImage(icon, 0, 0);
            Manager._iconDataCache[iconId] = ctx.getImageData(0,0,icon.width,icon.height);
        }
        return Manager._iconDataCache[iconId];
    },
    updateBookmarkIcon: function(tabId) {
        chrome.tabs.get(tabId, function(tab) {
            if (tab.url && tab.url.indexOf('http') == 0) {
                chrome.pageAction.setIcon({
                    tabId: tabId,
                    imageData: Manager.getIconData('bookmark-add-icon')
                });
                chrome.pageAction.show(tabId);
                if (UserManager.user) {
                    UserManager.user.hasBookmark(tab.url).next(function(has) {
                        if (has) {
                            chrome.pageAction.setIcon({
                                tabId: tabId,
                                imageData: Manager.getIconData('bookmark-added-icon')
                            });
                            chrome.pageAction.show(tabId);
                        }
                    });
                }
            } else {
                chrome.pageAction.hide(tabId);
            }
        });
    },
    updatePageAction: function() {
        chrome.tabs.getSelected(null, function(tab) {
            console.log(tab);
            Manager.updateBookmarkIcon(tab.id);
        });
    },
});

UserManager.bind('UserChange', function() {
    if (UserManager.user) Sync.init();
});

Sync.bind('complete', function() {
    // Manager.editBookmark('http://example.com/');
    $(document).trigger('BookmarksUpdated');
});

$(document).bind('BookmarksUpdated', function() {
    Manager.updatePageAction();
});

$(document).ready(function() {
    console.log('ready');
    UserManager.login();
});

chrome.tabs.onUpdated.addListener(function(tabId, opt) {
    if (opt.status === 'loading')
        Manager.updateBookmarkIcon(tabId);
});

chrome.tabs.onSelectionChanged.addListener(function(tabId) {
    setTimeout(function() {
        Manager.updatePageAction();
    }, 100);
    // console.log('select');
    // console.log(tabId);
    // Manager.updateBookmarkIcon(tabId);
});

chrome.pageAction.onClicked.addListener(function() {
    chrome.tabs.getSelected(null, function(tab) {
        Manager.editBookmarkTab(tab.id);
    });
});








