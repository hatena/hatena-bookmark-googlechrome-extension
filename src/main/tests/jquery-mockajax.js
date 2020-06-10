function mockAjax(opts) {
    if (opts.url.indexOf('http') == 0) {
        var orig_url = opts.url;
        var url = URI.parse(opts.url);
        opts.url = '/tests/data/' + url.schema + '/' + url.host + url.path + escape(url.search).replace(/%/g, '_');
        // console.log([opts.url, '<-', orig_url].join(' '));
    }
    return opts;
}

var orig_ajax = $.ajax; $.ajax = function (opts) {
    opts = mockAjax(opts);
    return orig_ajax(opts);
}
