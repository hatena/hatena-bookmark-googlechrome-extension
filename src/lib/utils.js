
// utility
var p = function() {
    console.log(JSON.stringify(Array.prototype.slice.call(arguments, 0, arguments.length)));
}

var _SPRINTF_HASH = {
    '%s': String,
    '%d': parseInt,
    '%f': parseFloat,
};

var sprintf = function (str) {
    var args = Array.slice(arguments, 1);
    return str.replace(/%[sdf]/g, function(m) { return _SPRINTF_HASH[m](args.shift()) });
};

var B_HOST = 'b.hatena.ne.jp';
var B_HTTP = 'http://' + B_HOST + '/';
var B_STATIC_HOST = 'b.st-hatena.com';
var B_STATIC_HTTP = 'http://' + B_STATIC_HOST + '/';
var B_API_STATIC_HOST = 'api.b.st-hatena.com';
var B_API_STATIC_HTTP = 'http://' + B_API_STATIC_HOST + '/';

if (jQuery) {
}


