
var Manager = $({});

$.extend(Manager, {
    editBookmark: function() {
    }
});

UserManager.bind('UserChange', function() {
    if (UserManager.user) Sync.init();
});

$(document).ready(function() {
    UserManager.login();
});


