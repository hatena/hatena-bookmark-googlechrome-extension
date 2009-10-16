

var request_uri = URI.parse('http://chrome/' + location.href);
function init() {
}

$(document).bind('ready', function() {
    Deferred.chrome.windows.getCurrent().next(function(win) {
        Deferred.chrome.windows.update(win.id, {
            width: 500,
            height: 400,
        }).next(function() {
            init();
        });
    });
    window.resize
});

