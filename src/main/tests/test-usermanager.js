module( "User" );

test( 'UserView', 2, function () {
    var view = new User.View('nagayama');
    ok(view.icon.match(/\/users\/na\/nagayama\/profile_s\.gif$/));
    ok(view.largeIcon.match(/\/users\/na\/nagayama\/profile\.gif$/));
});

asyncTest( 'UserManeger', 7, function () {
    // UserManager.MY_NAME_URL = '/tests/data/hatenatest.my.name';
    UserManager.bind('UserChange', function(ev, user) {
        ok(true, 'Loggin!');
        equal(UserManager.user, user, 'user');
        equal(user.name, 'hatenatest');
        ok(user.ignores instanceof RegExp, 'ignores regexp list');
        ok(user.public != user.private, 'public/private');
        ok(user.database instanceof IDBManager, 'database instance');
        UserManager.clearUser();
        ok(UserManager.user != user, 'no user');
        QUnit.start();

        UserManager.unbind('UserChange');
    });
    UserManager.login();
} );
