
var isEuraAgreed = function() {
    return !!localStorage.eula;
}

var Manager = $({});

$.extendWithAccessorProperties(Manager, {
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
    saveBookmarkError: function(data) {
        console.error(data);
        var url = '/background/popup.html?error=1&url=' + encodeURIComponent(data.url) + '&comment=' + data.comment;
        chrome.tabs.create({
            url: url,
        });
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
    },
    updateBookmarkCounter: function(tab) {
        if (!localStorage.eula) return;

        chrome.browserAction.setIcon({path: '/images/chrome-b-plus.png'});
        if (tab && tab.url && tab.url.indexOf('http') == 0 && Config.get('background.bookmarkcounter.enabled')) {

            if (UserManager.user) {
                 UserManager.user.hasBookmark(tab.url).next(function(bool) {
                     if (bool) {
                         chrome.browserAction.setIcon({tabId: tab.id, path: '/images/chrome-b-checked.png'});
                     }
                 });
            }

            HTTPCache.counter.get(tab.url).next(function(count) {
                if (count == null) {
                    chrome.browserAction.setBadgeText({tabId: tab.id, 
                        text: '-',
                    });
                    chrome.browserAction.setBadgeBackgroundColor({tabId: tab.id, 
                        color: [200,200,200, 255],
                    });
                } else {
                    chrome.browserAction.setBadgeText({tabId: tab.id, 
                        text: "" + count,
                    });
                    chrome.browserAction.setBadgeBackgroundColor({tabId: tab.id, 
                        color: [96,255,0, 200],
                    });
                }
            });
        } else {
            chrome.browserAction.setBadgeText({tabId: tab.id, 
                text: '',
            });
            chrome.browserAction.setBadgeBackgroundColor({tabId: tab.id, 
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
        chrome.tabs.getSelected(null, function(t) {
            chrome.windows.getCurrent(function(w) {
                if (t && w && w.id == t.windowId) {
                    Manager.updateTab(t);
                }
            });
        });
    },
});

var ConnectMessenger = $({});

ConnectMessenger = $({});

ConnectMessenger.bind('login_check', function(data) {
    // console.log('login by url: ' + data.url);
    UserManager.loginWithRetry(15 * 1000);
});

ConnectMessenger.bind('logout', function(data) {
    // console.log('logout by url: ' + data.url);
    setTimeout(function() {
        UserManager.logout();
    }, 200);
});

ConnectMessenger.bind('get_siteinfo_for_url', function(event, data, port) {
    if (Config.get('content.webinfo.enabled')) {
        // console.log('got request of siteinfo for ' + data.url);
        SiteinfoManager.sendSiteinfoForURL(data.url, port);
    }
});

ConnectMessenger.bind('get_siteinfos_with_xpath', function(event, data, port) {
    if (Config.get('content.webinfo.enabled')) {
        // console.log('got request of siteinfos whose domain is XPath');
        SiteinfoManager.sendSiteinfosWithXPath(port);
    }
});

var bookmarkeditBridgePorts = {};
ConnectMessenger.bind('bookmarkedit_bridge_set', function(event, data, port) {
    var url = data.url;
    var disconnectHandler = function() {
        port.onDisconnect.removeListener(disconnectHandler);
        delete bookmarkeditBridgePorts[url];
    }
    bookmarkeditBridgePorts[url] = port;
    port.onDisconnect.addListener(disconnectHandler);
});

ConnectMessenger.bind('bookmarkedit_bridge_get', function(event, data, port) {
    // console.log('!get' + data.url);
    var url = data.url;
    // console.log(bookmarkeditBridgePorts);
    var bridgePort = bookmarkeditBridgePorts[url];
    if (bridgePort) {
        bridgePort.onMessage.addListener(function(info, con) {
            if (info.message == 'bookmarkedit_bridge_recieve' && data.url == url) {
                console.log('recieve!!');
                port.postMessage({
                    message: info.message,
                    data: info.data
                });
            }
        });

        bridgePort.postMessage({
            message: 'get',
            data: {}
        });
    }
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
    // console.log('ready');
    if (isEuraAgreed()) {
        UserManager.loginWithRetry(15 * 1000);
    }
});

chrome.tabs.onUpdated.addListener(function(tabId, opt) {
    if (opt.status === 'loading')
        Manager.updateTabById(tabId);
});

chrome.tabs.onSelectionChanged.addListener(function(tabId) {
    Manager.updateCurrentTab();
});

chrome.browserAction.onClicked.addListener(function(tab) {
    var url = tab.url;
    var info = window.popupWinInfo;
    if (info) {
        chrome.windows.getAll(null, function(allWindows) {
            var flag = false;
            for (var i = 0;  i < allWindows.length; i++) {
                if (parseInt(allWindows[i].id, 10) == parseInt(info.windowId, 10)) {
                    flag = allWindows[i];
                    break;
                }
            }
            if (flag) {
                chrome.tabs.get(info.tabId, function(tab) {
                    if (URI.parse(tab.url).param('url') != url) {
                        var port = chrome.tabs.connect(window.popupWinInfo.tabId);
                        port.postMessage({
                            message: 'popup-reload',
                            data: {
                                url: url,
                            }
                        });
                    }
                    flag.focus();
                });
            } else {
                delete window.popupWinInfo;
                setTimeout(function() {
                    window.open('/background/popup.html?url=' + encodeURIComponent(url));
                }, 10);
            }
        });
    } else {
        chrome.windows.getCurrent(function(w) {
            setTimeout(function() {
                window.open('/background/popup.html?url=' + encodeURIComponent(url));
            }, 10);
        });
    }
});

/*
chrome.browserAction.onClicked.addListener(function(tab) {
    Manager.editBookmarkTab(tab);
});
*/

chrome.extension.onConnect.addListener(function(port, name) {
  port.onMessage.addListener(function(info, con) {
      if (!localStorage.eula) return;

      if (info.message)
          ConnectMessenger.trigger(info.message, [info.data, con]);
  });
});

const ENTRY_RE = /^http:\/\/b\.hatena\.ne\.jp\/entry\/(s\/)?/;
chrome.webRequest.onHeadersReceived.addListener(function(details) {
    if (!Config.get('background.twitterlink.enabled')) return;

    var headers = details.responseHeaders;
    headers.forEach(function(header) {
        if (header.name !== 'Location') return;

        header.value = header.value.replace(ENTRY_RE, function(m, ssl) {
            return ssl ? 'https://' : 'http://';
        });
    });
    return { responseHeaders: headers };
}, { urls: ['http://htn.to/*'] }, ['blocking', 'responseHeaders']);

// login check
setInterval(function() {
    if (isEuraAgreed()) {
        UserManager.login();
    }
}, 1000 * 60 * 23);

// chrome webdatabase 5M 制限のため、tag 参照テーブルを作らない
Model.Bookmark.afterSave = function() {
}

// debug
/*
setTimeout(function() {
    var url = 'http://d.hatena.ne.jp/HolyGrail/20091107/1257607807';
    url = 'http://b.hatena.ne.jp/articles/200911/598';
    url = 'http://www.amazon.co.jp/exec/obidos/ASIN/B002T9VBP8/hatena-uk-22/ref=nosim';
    url = 'http://b.hatena.ne.jp/entry/s/addons.mozilla.org/ja/firefox/addon/1843';
    url = 'https://addons.mozilla.org/ja/firefox/addon/1843';
    // url = 'http://hail2u.net/blog/webdesign/yui3-css-reset-problem.html?xx';
    url = 'http://example.com/';
    url = '/background/popup.html?debug=1&url=' + encodeURIComponent(url);
    // var url = 'http://www.hatena.ne.jp/';
    chrome.tabs.create({
        url: url,
    });
}, 10);

/*
setTimeout(function() {
    var url = '/tests/test.html';
    chrome.tabs.create({
        url: url,
    });
}, 10);
*/

/*
setTimeout(function() {
chrome.windows.create({url:'../tests/test.html'});
}, 10);
*/



