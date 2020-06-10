
var port = chrome.runtime.connect();
port.postMessage({
    message: 'login_check',
    data: {
        url: location.href,
    }
});

