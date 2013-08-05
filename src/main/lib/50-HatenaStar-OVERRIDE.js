/**
 * HatenaStar では XHR ではなく JSONP を使ってサーバーからデータを取得するが,
 * chrome 拡張ではリモートスクリプトを実行するために CSP (content security policy)
 * の指定をする必要がある. さらに, 現在のところ HTTP のリモートスクリプト実行は許可
 * されない
 * - 参考 : https://developer.chrome.com/extensions/contentSecurityPolicy.html
 * そのため, JSONP の代わりに XHR でデータをとってくるように Ten.JSONP を上書きする.
 */
Ten.JSONP = new Ten.Class({
    initialize: function(uri,obj,method) {
        var del = uri.match(/\?/) ? '&' : '?';
        if (!uri.match(/timestamp=/)) {
            uri += del + encodeURI(new Date());
        }
        if (typeof(obj) == 'function' && typeof(method) == 'undefined') {
            obj = {callback: obj};
            method = 'callback';
        }
        var callback = { object: obj, method: method };
        $.ajax({ url: uri, dataType: "text" }).next(function(res) {
            var resJson = JSON.parse( res );
            obj[method]( resJson );
        }).error(function (err) {
            console.error( "URI " + uri + " の読み込み時にエラー : " + err );
        });
    },
    MaxBytes: 1800
});

/**
 * Overwrite Hatena.LoginWindow (based on Hatena.Star.AlertScreen)
 * Hatena.LoginWindow is overwritten for security reason: the original
 * Hatena.LoginWindow#hide method will load REMOTE SCRIPT,
 * which connotes a security risk.
 * - See : https://developer.chrome.com/extensions/contentSecurityPolicy.html
 */
Hatena.LoginWindow = new Ten.Class({
    base: [Ten.SubWindow],
    style: {
        padding: '2px',
        textAlign: 'center',
        borderRadius: '6px',
        MozBorderRadius: '6px',
        width: '240px',
        height: '120px'
    },
    handleStyle: {
        position: 'absolute',
        top: '0px',
        left: '0px',
        backgroundColor: '#f3f3f3',
        borderBottom: '1px solid #bbb',
        width: '100%',
        height: '30px',
        borderRadius: '6px 6px 0 0',
        MozBorderRadius: '6px 6px 0 0'
    }
},{
    addLoginForm: function (htmlMsg) {}, // do nothing
    show: function(pos) {
        this.container.innerHTML =
            "<p><img src=\"http://s.hatena.com/images/star.gif\" alt=\"☆\" width=\"11\" height=\"10\" />をつけるにはまずはてなスターにログインしてください。</p>" +
            "<p><a href=\"https://www.hatena.ne.jp/login?location=http://s.hatena.ne.jp/\">はてなスターにログイン</a></p>";
        var win = Ten.Geometry.getWindowSize();
        var scr = Ten.Geometry.getScroll();
        var w = parseInt(this.constructor.style.width) + 20;
        if (pos.x + w > scr.x + win.w) pos.x = win.w + scr.x - w;
        Ten.SubWindow.prototype.show.call(this, pos);
    },
});
