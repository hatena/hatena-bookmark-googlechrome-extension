SiteinfoManager.addSiteinfos({
    data: [
        { // Google Web Search
            domain:     '^http://www\\.google(?:\\.\\w+){1,2}/search\\?',
            paragraph:  'descendant::div[@id = "res"]//li[contains(concat(" ", @class, " "), " g ")]',
            link:       'descendant::a[contains(concat(" ", @class, " "), " l ")]',
            annotation: 'descendant::span[contains(concat(" ", @class, " "), " gl ")]',
            annotationPosition: 'after',
        },
        {
            domain:  '^https?://b\\.hatena\\.ne\\.jp/',
            disable: true,
        },
    ],
});

SiteinfoManager.addSiteinfos({
    urls: [
        'https://b.st-hatena.com/file/v4/archive/HatenaBookmarkUsersCount.items.json',
    ],
    converter: SiteinfoManager.LDRizeConverter,
    key: 'HatenaBookmarkUsersCount',
});



SiteinfoManager.addSiteinfos({
    urls: [
        'https://b.st-hatena.com/file/v4/archive/LDRize.items.json',
    ],
    converter: SiteinfoManager.LDRizeConverter,
    key: 'LDRizeSiteinfo',
});

SiteinfoManager.addSiteinfos({
    urls: [
        'https://s.hatena.ne.jp/siteconfig.json',
    ],
    converter: SiteinfoManager.SiteconfigConverter,
    key: 'HatenaStarSiteConfig',
});
