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
