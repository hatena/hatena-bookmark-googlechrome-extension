
var Manager = $({});

$.extend(Manager, {
    editBookmark: function(url, winno, tabno) {
        window.open('bookmarkedit.html');
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


