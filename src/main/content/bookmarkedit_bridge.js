
function getPageInfo() {
    var data = {
        url: location.href,
    };
    var canURL = getCannonical();
    if (canURL)
        data.canonical = canURL;
    var images = getImages();
    if (images && images.length)
        data.images = images;

    var title = getTitle();
    if (title) data.title = title;

    var selection = getSelectedString();
    if (selection) data.selection = selection;

    return data;
}

function getTitle() {
    var title = document.querySelector('title');
    if (title && title.textContent) return title.textContent;
    return null;
}

function getCannonical() {
    var link = document.evaluate(
        '/h:html/h:head/h:link[translate(@rel, "CANONICAL", "canonical") = "canonical"]',
        document,
        function () { return document.documentElement.namespaceURI || "" },
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
    ).singleNodeValue;
    if (!link || !link.href) return null;
    var url = link.href;
    if (location.href == url) return null;
    return url;
}

function getImages() {
    var images = Array.prototype.filter.call(document.getElementsByTagName("img"),
        function (img) { return (img instanceof HTMLImageElement) });
    var maxCount = 20;
    if (images.length > maxCount) {
        images = images.map(function (image, index) {
            var size = Math.min(image.naturalWidth,
                                image.naturalHeight);
            return { image: image, size: size, index: index };
        }).sort(function (a, b) { return b.size - a.size })
          .slice(0, maxCount)
          .sort(function(a, b) { return a.index - b.index })
          .map(function (item) { return item.image });
    }
    return images.filter(function(image) { return image && image.src }).map(function(image) { return image.src });
}

function getSelectedString() {
    var selection = window.getSelection();
    if (!selection.rangeCount) return null;
    var range = selection.getRangeAt(0);
    if (range.collapsed) return null;
    return range.toString();
}

getPageInfo(); // メソッドの返り値が `executeScript` 呼び出し側に返される
