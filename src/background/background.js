
var Manager = $({});

$.extend(Manager, {
    editBookmark: function(url, winno, tabno) {
        var uri = URI.parse('http://chrome/background/bookmarkedit.html');
        uri.param({
            url: url,
            winno: winno,
            tabno: tabno
        });
        window.open(uri.path_query, 'bookmarkedit');
    }
});

UserManager.bind('UserChange', function() {
    // if (UserManager.user) Sync.init();
    Manager.editBookmark('http://example.com/');
});
// 
// Sync.bind('complete', function() {
//     $(document).trigger('BookmarksUpdated');
// });

$(document).ready(function() {
    console.log('ready');
    UserManager.login();
});


