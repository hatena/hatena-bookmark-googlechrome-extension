
Deferred.debug = true;
var BG = chrome.extension.getBackgroundPage();
import(BG, ['UserManager', 'HTTPCache', 'URI', 'Manager', 'Model']);

var request_uri = URI.parse('http://chrome/' + location.href);

function init() {
    var user = UserManager.user;
    $('#usericon').attr('src', user.icon);
    $('#username').text(user.name);
    if (user.plususer) {
        $('#plus-inputs').removeClass('none');
    } else {
        $('#plus-inputs').remove();
    }
    $('#title-text').text(request_uri.param('title'));
    $('#favicon').attr('src', request_uri.param('faviconUrl'));

    var url = request_uri.param('url');
    setURL(url);

    $('#comment').focus();
    HTTPCache.entry.get(url).next(setEntry);
    Model.Bookmark.findByUrl(url).next(setByBookmark);
}

function setByBookmark(b) {
    if (b) {
        $('#bookmarked-notice').text('このエントリーは ' + b.dateYMDHM + ' にブックマークしました')
        .removeClass('none');
        $('#delete-button').removeClass('none');
        $('#comment').attr('value', b.comment);
    }
}

function setURL(url) {
    $('#input-url').attr('value', url);
    $('#url').text(url);
    $('#url').attr('href', url);

    if (!$('#favicon').attr('src')) {
        var faviconURI = new URI('http://favicon.st-hatena.com');
        faviconURI.param({url: url});
        $('#favicon').attr('src', faviconURI);
    }
}

function setEntry(entry) {
    $('body').removeClass('data-loading');
    if (entry.title) $('#title-text').text(entry.title);
    setURL(entry.original_url);
    var count = parseInt(entry.count);
    if (count) {
        var uc = $('#users-count');
        uc.text(String(count) + (count == 1 ? ' user' : ' users'));
        uc.attr('href', entry.entry_url);
        $('#users-count-container').removeClass('none');
    }
}

function closeWin() {
    Deferred.chrome.windows.getCurrent().next(function(win) {
        saveWindowPositions(win);
        chrome.windows.remove(currentWin.id);
    });
}

function saveWindowPositions(win) {
    localStorage.bookmarkEditWindowPositions = JSON.stringify({
        left: win.left,
        top: win.top,
        width: Math.max(100, win.width),
        height: Math.max(100, win.height),
    });
}

function loadWindowPosition(win) {
    var pos;
    try { pos = JSON.parse(localStorage.bookmarkEditWindowPositions) } catch (e) {};
    if (!pos) {
        pos = {
            width: 500,
            height: 400,
        }
    }

    Deferred.chrome.windows.update(win.id, pos).next();
}

function deleteBookmark() {
    var url = request_uri.param('url');
    UserManager.user.deleteBookmark(url);
    closeWin();
}

function formSubmitHandler(ev) {
    var form = $(this);

    var user = UserManager.user;
    user.saveBookmark(form.serialize());
    setTimeout(function() {
        closeWin();
    }, 0);
    return false;
}

$(document).bind('click', function(ev) {
    ev.metaKey = true;
});

var currentWin;
Deferred.chrome.windows.getCurrent().next(function(win) {
    currentWin = win;
    loadWindowPosition(win);
}).error(function(e) { console.log(e) });

$(document).bind('ready', function() {
    $('#form').bind('submit', formSubmitHandler);
    $('a').each(function() { this.target = '_blank' });
    init();
});

