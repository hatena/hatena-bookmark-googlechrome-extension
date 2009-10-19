
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

    var url = request_uri.param('url');
    setURL(url);

    $('#comment').focus();
    HTTPCache.entry.get(url).next(setEntry);
    Model.Bookmark.findByUrl(url).next(setByBookmark);
}

function setByBookmark(b) {
    if (b) {
        p(b.date);
    }
}

function setURL(url) {
    $('#input-url').attr('value', url);
    $('#url').text(url);
    $('#url').attr('href', url);

    var faviconURI = new URI('http://favicon.st-hatena.com');
    faviconURI.param({url: url});
    $('#favicon').attr('src', faviconURI);
}

function setEntry(entry) {
    p(entry);
    // [{"favorites":[{"body":"\u3066\u3059\u3068","is_private":null,"epoch":1235065834,"timestamp":"2009/02/19","name":"nagayama","tags":[]}],"count":"33","recommend_tags":["test","rfc","network","dns","microblog","\u30a4\u30f3\u30bf\u30fc\u30cd\u30c3\u30c8","hb","html","\u30c6\u30b9\u30c8","hatenabookmark"],"entry_url":"http://b.hatena.ne.jp/entry/example.com/","original_url":"http://example.com/","title_last_editor":"","url":"http://example.com/","title":"Example Web Page","has_asin":0}]
    $('body').removeClass('data-loading');
    $('#title-text').text(entry.title);
    setURL(entry.original_url);
    var count = parseInt(entry.count);
    if (count) {
        var uc = $('#users-count');
        uc.text(String(count) + (count == 1 ? 'user' : 'users'));
        uc.attr('href', entry.entry_url);
        $('#users-count-container').removeClass('none');
    }
}

function formSubmitHandler(ev) {
    var form = $(this);

    var user = UserManager.user;
    user.saveBookmark(form.serialize());
    setTimeout(function() {
        chrome.windows.remove(currentWin.id);
    }, 0);
    return false;
}

$(document).bind('click', function(ev) {
    ev.metaKey = true;
});

var currentWin;
$(document).bind('ready', function() {
    $('#form').bind('submit', formSubmitHandler);
    $('a').each(function() { this.target = '_blank' });

    Deferred.chrome.windows.getCurrent().next(function(win) {
        currentWin = win;
        Deferred.chrome.windows.update(win.id, {
            width: 500,
            height: 400,
        }).next(function() {
            init();
        }).error(function(e) { console.log(e) });
    });
    window.resize
});

