
var Manager = $({});

$.extend(Manager, {
    editBookmark: function() {
    }
});

UserManager.bind('UserChange', function() {
    if (UserManager.user) Sync.init();
});

Sync.bind('complete', function() {
    $(document).trigger('BookmarksUpdated');
});

$(document).ready(function() {
    UserManager.login();
});


