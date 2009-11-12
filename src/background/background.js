
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
    editBookmarkTab: function(tab) {
        Manager.editBookmark(tab.url, {
            faviconUrl: tab.faviconUrl,
            winId: tab.windowId,
            tabId: tab.id,
            title: tab.title
        });
    },
    editBookmarkTabId: function(tabId) {
        chrome.tabs.get(tabId, Manager.editBookmarkTab);
    },
    editBookmarkCurrentTab: function() {
        chrome.tabs.getSelected(null, Manager.editBookmarkTab);
    },
    editBookmarkError: function(data) {
        console.error(data);
    },
    deleteBookmarkError: function(data) {
        console.error(data);
    },
    confirmBookmark: function(openURL) {
        chrome.tabs.create({
            url: openURL,
            selected: true,
        });
    },
    _iconDataCache: {},
    get ctx() {
       if (!Manager._ctx) {
                var canvas = document.getElementById('bookmark-icon-canvas');
                Manager._ctx = canvas.getContext('2d');
       }
       return Manager._ctx;
    },
    getIconData: function(iconId) {
        if (!Manager._iconDataCache[iconId]) {
            var ctx = Manager.ctx;
            var icon = document.getElementById(iconId);
            ctx.clearRect(1, 1, icon.width, icon.height);
            ctx.drawImage(icon, 1, 1);
            Manager._iconDataCache[iconId] = ctx.getImageData(1,1,icon.width,icon.height);
        }
        return Manager._iconDataCache[iconId];
    },
    updateBookmarkIcon: function(tab) {
        return;

        var tabId = tab.id;
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
    },
    updateBookmarkCounter: function(tab) {
        if (tab.url && tab.url.indexOf('http') == 0) {
            /*
            chrome.browserAction.setBadgeText({
                text: "*'-'*",
            });
            chrome.browserAction.setBadgeBackgroundColor({
                color: [255,200,200, 255],
            });
            */

            HTTPCache.counter.get(tab.url).next(function(count) {
                if (count == null) {
                    chrome.browserAction.setBadgeText({
                        text: '-',
                    });
                    chrome.browserAction.setBadgeBackgroundColor({
                        color: [200,200,200, 255],
                    });
                } else {
                    chrome.browserAction.setBadgeText({
                        text: "" + count,
                    });
                    chrome.browserAction.setBadgeBackgroundColor({
                        color: [255,0,0, 200],
                    });
                }
            });
        } else {
            chrome.browserAction.setBadgeText({
                text: '',
            });
            chrome.browserAction.setBadgeBackgroundColor({
                color: [99,99,99, 255],
            });
        }
    },
    updateTab: function(tab) {
        Manager.updateBookmarkIcon(tab);
        Manager.updateBookmarkCounter(tab);
    },
    updateTabById: function(tabId) {
        chrome.tabs.get(tabId, function(tab) {
            Manager.updateTab(tab);
        });
    },
    updateCurrentTab: function() {
        chrome.tabs.getSelected(null, Manager.updateTab);
    },
});

var ConnectMessenger = $({});

ConnectMessenger = $({});

ConnectMessenger.bind('login_check', function(data) {
    console.log('login by url: ' + data.url);
    UserManager.loginWithRetry(15 * 1000);
});

ConnectMessenger.bind('logout', function(data) {
    console.log('logout by url: ' + data.url);
    setTimeout(function() {
        UserManager.logout();
    }, 200);
});

UserManager.bind('UserChange', function() {
    if (UserManager.user) Sync.init();
});

Sync.bind('complete', function() {
    // Manager.editBookmark('http://example.com/');
    $(document).trigger('BookmarksUpdated');
});

$(document).bind('BookmarksUpdated', function() {
    Manager.updateCurrentTab();
});

$(document).ready(function() {
    console.log('ready');
    UserManager.loginWithRetry(15 * 1000);
});

chrome.tabs.onUpdated.addListener(function(tabId, opt) {
    if (opt.status === 'loading')
        Manager.updateTabById(tabId);
});

chrome.tabs.onSelectionChanged.addListener(function(tabId) {
    Manager.updateCurrentTab();
});

chrome.pageAction.onClicked.addListener(function() {
    Manager.editBookmarkCurrentTab();
});

chrome.self.onConnect.addListener(function(port,name) {
  port.onMessage.addListener(function(info,con) {
      if (info.message)
          ConnectMessenger.trigger(info.message, [info.data]);
  });
});

// login check
setInterval(function() {
    UserManager.login();
}, 1000 * 60 * 15);

// console.log(openDatabase('hoge999', '1.0', 'hogehoge2', 1024 * 20));

// debug
/*
chrome.tabs.create({
    url: '/background/popup.html?url=http://d.hatena.ne.jp/HolyGrail/20091107/1257607807'
    // url: '/background/popup.html?url=http://example.com/'
    // url: '/background/popup.html?url=http://a.hatena.ne.jp/'
    // url: '/background/popup.html?url=http://b.hatena.ne.jp/'
});
*/


/*
setTimeout(function() {
chrome.windows.create({url:'../tests/test.html'});
}, 10);
*/




