
function jsloader(urls, callback) {
    var load = function(url) {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.charset = 'utf-8';
        if (urls.length) {
            var u = urls.shift();
            script.onload = function() {
                load(u);
            }
        } else {
            script.onload = callback;
       }
        script.src = url + '?' + (new Date-0);
        document.getElementsByTagName('head')[0].appendChild(script);
    }
    load(urls.shift());
}
