
var port = chrome.extension.connect();
port.postMessage({
    message: 'login_check',
    data: {
        url: location.href,
    }
});

