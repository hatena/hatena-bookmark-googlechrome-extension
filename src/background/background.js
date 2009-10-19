
var Manager = $({});

$.extend(Manager, {
    editBookmark: function(url, options) {
        var uri = URI.parse('http://chrome/background/bookmarkedit.html');
        if (options) uri.param(options);
        uri.param({
            url: url
        });
        window.open(uri.path_query, 'bookmarkedit');
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
});

UserManager.bind('UserChange', function() {
    if (UserManager.user) Sync.init();
});

Sync.bind('complete', function() {
    Manager.editBookmark('http://example.com/');
    $(document).trigger('BookmarksUpdated');
});

$(document).ready(function() {
    console.log('ready');
    UserManager.login();
});


