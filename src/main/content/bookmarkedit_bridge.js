
function getPageInfo() {
    var data = {
        url: location.href,
    };
    var canURL = getCannonical();
    if (canURL)
        data.canonical = canURL;

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

function getSelectedString() {
    var selection = window.getSelection();
    if (!selection.rangeCount) return null;
    var range = selection.getRangeAt(0);
    if (range.collapsed) return null;
    return range.toString();
}

getPageInfo(); // メソッドの返り値が `executeScript` 呼び出し側に返される
