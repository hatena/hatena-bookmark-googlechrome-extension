
(function() {
    var defaults = {
        'popup.window.autosize': {
            'default': true,
            type: 'boolean',
        },
        'popup.window.width': {
            'default': 500,
            type: 'unsignedInt',
            normalizer: {
                name: 'between',
                options: [100, 9999]
            },
        },
        'popup.window.height': {
            'default': 450,
            type: 'unsignedInt',
            normalizer: {
                name: 'between',
                options: [100, 9999]
            },
        },
        'popup.search.result.threshold': {
            'default': 200,
            type: 'unsignedInt',
            normalizer: {
                name: 'between',
                options: [10, 9999]
            },
        },
        'popup.search.incsearch': false,
        'popup.search.lastWord': '',
        'popup.commentviewer.autodetect.enabled': true,
        'popup.commentviewer.autodetect.threshold': 15,
        'popup.commentviewer.togglehide': false,
        'popup.bookmark.confirmBookmark': false,
        'popup.bookmark.postTwitter': false,
        'popup.bookmark.postFacebook': false,
        'popup.bookmark.postEvernote': false,
        'popup.bookmark.postMixiCheck': false,
        'popup.bookmark.addAsin': false,
        'popup.bookmark.lastCommentValue': {},
        'popup.tags.recommendTags.enabled': true,
        'popup.tags.allTags.enabled': true,
        'popup.tags.showAllTags': false,
        'popup.tags.complete.enabled': true,
        'popup.lastView': 'comment',
        'content.webinfo.enabled': true,
        'background.bookmarkcounter.enabled': true,
        'background.twitterlink.enabled': false
    };
    Object.keys(defaults).forEach(function(key) {
        Config.append(key, defaults[key]);
    });
})();

