(function() {
// ----- uuid-random
// Original source code: https://github.com/jchook/uuid-random/blob/46242ac61bc13fb785b3386691fb790524a4ed9e/uuid-random.min.js
// -----
// Copyright (c) 2016 Wes Roberts
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
// the Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
// FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
// IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
// -----
"use strict";!function(){function r(r,t){return Math.floor(Math.random()*(t-r))+r}function t(r){if("string"==typeof r)return/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(r)}function n(t){var n;if(void 0!==d){if(void 0===i||u+t>o.BUFFER_SIZE)if(u=0,d.getRandomValues)i=new Uint8Array(o.BUFFER_SIZE),d.getRandomValues(bytes);else{if(!d.randomBytes)throw new Error("Non-standard crypto library");i=d.randomBytes(o.BUFFER_SIZE)}return i.slice(u,u+=t)}for(n=[],f=0;f<t;f++)n.push(r(0,255));return n}function e(){var r=n(16);return r[6]=15&r[6]|64,r[8]=63&r[8]|128,r}function o(){var r=e();return a[r[0]]+a[r[1]]+a[r[2]]+a[r[3]]+"-"+a[r[4]]+a[r[5]]+"-"+a[r[6]]+a[r[7]]+"-"+a[r[8]]+a[r[9]]+"-"+a[r[10]]+a[r[11]]+a[r[12]]+a[r[13]]+a[r[14]]+a[r[15]]}var i,f,u=0,a=[];for(o.BUFFER_SIZE=512,o.bin=e,o.test=t,f=0;f<256;f++)a[f]=(f+256).toString(16).substr(1);if("undefined"!=typeof module&&"function"==typeof require){var d=require("crypto");module.exports=o}else"undefined"!=typeof window&&(window.uuid=o)}();
// ----- uuid-random

const GA_TRACKING_ID = "UA-76724775-1";

function _clientId() {
    const KEY = 'GoogleAnalytics-clientId';
    const cid = localStorage.getItem(KEY);
    if (cid) { return cid; }
    localStorage.setItem(KEY, uuid());
    return localStorage.getItem(KEY);
}

/**
 * Reports the event to Google Analytics.
 */
function _reportGA(hitType, url, title) {
    try {
        const request = new XMLHttpRequest();
        request.open("POST", "https://www.google-analytics.com/collect", true);
        const params = {
            v: 1,
            t: hitType,
            tid: GA_TRACKING_ID,
            cid: _clientId(),
            dp: url,
            dt: title,
        };
        const message = Object.keys(params).map(key => `${key}=${encodeURIComponent(params[key])}`).join('&')
        request.send(message);
    } catch (e) {
        console.log("Error sending report to Google Analytics.\n" + e);
    }
}

chrome.tabs.query({
    active: true,
    windowId: chrome.windows.WINDOW_ID_CURRENT
}, function(tabs) {
    var tab = tabs[0];
    if (tab.url) {
        _reportGA('pageview', tab.url, tab.title);
    }
});
})();
