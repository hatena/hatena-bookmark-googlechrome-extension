
var port = chrome.runtime.connect();
port.postMessage({
    message: 'logout',
    data: {
        url: location.href,
    }
});

