
var port = chrome.extension.connect();
port.postMessage({
    message: 'logout',
    data: {
        url: location.href,
    }
});

