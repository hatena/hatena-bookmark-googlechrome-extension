
var E = Utils.createElementSimply;

/*
 * ToDo: 毎回 addPanel 呼び出されると作られるため重い
 */

var TagCompleter = {
    reloadTags: function() {
        var self = this;
        var dTags =  model('Tag').findDistinctTags();
        var tags = [];
        var tagsCount = {};
        dTags.forEach(function(e) { tags.push(e.name);tagsCount[e.name] = e.count;});
        self.tagCache.set('tags', tags);
        self.tagCache.set('tagsCount', tagsCount);
    },
    clearCache: function clearCache() {
        this.tagCache._tags = null;
        this.tagCache.tagsCount = null;
    },
    get tagCache() {
        if (!shared.has('tagCache')) {
            shared.set('tagCache', new ExpireCache('tagcache', 30 * 60));
        }
        return shared.get('tagCache');
    },
    get tagsCount() {
        return this.tagCache.get('tagsCount');
    },
    get tags() {
        var t = this.tagCache.get('tags');
        if (!t) {
            this.reloadTags();
            return this.tagCache.get('tags');
        }
        return t;
    }
};

TagCompleter.List = {
    clear: function() {
        list.selectedIndex = -1;
        while(list.firstChild) list.removeChild(list.firstChild);
    },
    listClickHandler: function(e) {
        e.stopPropagation();
        list.selectedItem = e.currentTarget;
        var ev = document.createEvent('UIEvents');
        ev.initEvent('complete', true, false);
        list.dispatchEvent(ev);
    },
    showTags: function(tags, el) {
        this.clear();
        var tagsCount = TagCompleter.tagsCount;
        var self = this;
        tags.forEach(function(tag) {
            var item = E('richlistitem', {flex:1, 'class': 'hBookmark-tagcomplete-listitem', value:tag},
                E('hbox', {flex:1}, 

                    E('label', {'class': 'hBookmark-tagcomplete-tagname', value: tag}),
                    E('spacer', {flex: 1}),
                    E('label', {'class': 'hBookmark-tagcomplete-tagcount', value: tagsCount[tag] || 0})
                )
            );
            item.addEventListener('click', method(self, 'listClickHandler'), false);
            item.addEventListener('mouseover', method(self, 'listMousemoveHandler'), false);
            list.appendChild(item);
        });
        this.show(el);
    },
    listMousemoveHandler: function(e) {

        list.selectedItem = e.currentTarget;
    },
    isOne: function() {
        return list.getRowCount() == 1;
    },
    get shown() { return panel.state == 'open' },
    show: function(el) {
        panel.openPopup(el, 'after_start', 0, 0,false,false);
    },
    hide: function() {
        panel.hidePopup();
    },
    next: function() {
        if (list.selectedIndex == list.getRowCount() - 1) {
            this.first();
        } else {
            list.selectedIndex = list.selectedIndex + 1;
        }
    },
    prev: function() {
        if (list.selectedIndex == 0) {
            this.last();
        } else {
            list.selectedIndex = list.selectedIndex - 1;
        }
    },
    first: function() {
        list.selectedIndex = 0;
        list.ensureIndexIsVisible(list.selectedIndex);
    },
    last: function() {
        list.selectedIndex = list.getRowCount() - 1;
        list.ensureIndexIsVisible(list.selectedIndex);
    },
    getCurrentTag: function(force) {
        var item = list.selectedItem;
        if (!item && force) {
            item = list.getItemAtIndex(0);
        }
        return item ? item.value : null;
    }
}

TagCompleter.InputHandler = function(input) {
    this.input = input;
    this.inputLine = new TagCompleter.InputLine('', []);
    delete this.inputLine['suggestTags'];
    // this.inputLine.__defineGetter__('suggestTags', function() TagCompleter.tags);
    this.inputLine.__defineGetter__('suggestTags', method(this, 'suggestTags'));
    this.tagCompleteEnabled = Config.get('tags.complete.enabled');
    this.prevValue = this.input.value;
    input.addEventListener('keyup', method(this, 'inputKeyupHandler'), false);
    input.addEventListener('keydown', method(this, 'inputKeydownHandler'), false);
    input.addEventListener('input', method(this, 'inputInputHandler'), false);
    list.addEventListener('complete', method(this, 'listCompleteHandler'), false);
}

TagCompleter.InputHandler.prototype = {
    get textbox() { return document.getBindingParent(this.input) },
    get addPanel() { document.getBindingParent(this.textbox) },
    updateRecommendedTags: function(tags) {
        delete this._suggestTags;
        this.recommendTags = tags;
    },
    suggestTags: function() {
        if (!this._suggestTags) {
            if (this.recommendTags && this.recommendTags.length) {
                var t = Array.slice(this.recommendTags).concat(TagCompleter.tags).sort();
                this._suggestTags = t;
            } else {
                return TagCompleter.tags;
            }
        }
        return this._suggestTags;
    },
    updateLineValue: function() { return this.inputLine.value = this.input.value },
    updateValue: function() { return this.prevValue = this.input.value = this.inputLine.value },
    lastCaretPos: null,
    inputKeyupHandler: function(ev) {
        var caretPos = this.caretPos;
        if (caretPos == this.lastCaretPos) return;
        this.lastCaretPos = caretPos;
        this.updateLineValue();
        if (!this.tagCompleteEnabled) return;
        var words = this.inputLine.suggest(caretPos);
        if (words.length) {
            TagCompleter.List.showTags(words, this.input);
        } else {
            TagCompleter.List.hide();
        }
    },
    get caretPos() { return this.textbox.selectionEnd },
    inputKeydownHandler: function(ev) {
        var tList = TagCompleter.List;
        var keyCode = ev.keyCode;
        if (tList.shown) {
            var caret = this.text
            var stopEvent = false;
            if (keyCode == ev.DOM_VK_ENTER || keyCode == ev.DOM_VK_RETURN) {
                this.insert(true);
                stopEvent = true;
            } else if (keyCode == ev.DOM_VK_TAB) {
                if (tList.isOne()) {
                    this.insert(true);
                } else if (ev.shiftKey) {
                    tList.prev();
                } else {
                    tList.next();
                }
                stopEvent = true;
            } else if (keyCode == ev.DOM_VK_UP) {
                tList.prev();
                stopEvent = true;
            } else if (keyCode == ev.DOM_VK_DOWN) {
                tList.next();
                stopEvent = true;
            }

            if (stopEvent) {
                ev.stopPropagation();
                ev.preventDefault();
            }
        } else {
            // submit
            // 本来はここではすべきでない

            // EnterキーのハンドリングはFirefox側が行う
            //if (keyCode == ev.DOM_VK_ENTER || keyCode == ev.DOM_VK_RETURN) {
            //    this.addPanel.saveBookmark();
            //}
        }
    },
    inputInputHandler: function(ev) {
        this.updateLineValue();
        var tagsRE = /^(?:\[[^?%\/\[\]]+\])*/;
        var currentValue = this.input.value;
        var prevTags = this.prevValue.match(tagsRE)[0];
        var currentTags = currentValue.match(tagsRE)[0];
        this.prevValue = currentValue;
        if (prevTags != currentTags)
            this.fireTagChangeEvent();
    },
    listCompleteHandler: function(ev) {
        this.insert(true);
    },
    insert: function(force) {
        var tag = TagCompleter.List.getCurrentTag(force);
        var line = this.inputLine;
        if (tag) {
            if (IS_OSX) {
                // OSX では、タイミングをずらさないと IME 入力時 input.value 代入が空になる
                setTimeout(function(self) {
                    var pos = line.insertionTag(tag, self.caretPos);
                    self.updateValue();
                    self.textbox.setSelectionRange(pos + 0, pos + 0);
                    self.fireTagChangeEvent();
                }, 0, this);
            } else {
                var pos = line.insertionTag(tag, this.caretPos);
                this.updateValue();
                this.textbox.setSelectionRange(pos + 0, pos + 0);
                this.fireTagChangeEvent();
            }
        }
        TagCompleter.List.hide();
    },
    fireTagChangeEvent: function() {
        var ev = document.createEvent('UIEvent');
        ev.initUIEvent('HB_TagChange', true, false, window, 0);
        this.input.dispatchEvent(ev);
    }
}

TagCompleter.InputLine = function(value, tags) {
    this.suggestTags = tags;
    this.value = value;
    this.maxSuggest = Config.get('tags.tagMaxResult');
}

TagCompleter.InputLine.prototype = {
    /*
    get prefs() {
        if (this._prefs) {
            this._prefs = new Prefs('extensions.hatenabookmark.addPanel.');
        }
        return this._prefs;
    },
    */
    get value() { return this._text },
    set value(val) {
        this._text = val;
    },
    get tags() { return this.cutoffComment(this.value)[1] },
    get body() { return this.cutoffComment(this.value)[0] },
    addTag: function(tagName) {
        var val = this.value;
        var lastIndex = val.lastIndexOf(']');
        if (lastIndex == -1) {
            this.value = '[' + tagName + ']' + val;
        } else {
            var prefix = val.substring(0, lastIndex + 1);
            var suffix = val.substr(lastIndex + 1);
            this.value = prefix + '[' + tagName + ']' + suffix;
        }
        this.uniqTextTags();
    },
    deleteTag: function(tagName) {
        var tmp = this.cutoffComment(this.value);
        var tags = tmp[1].filter(function(t) { return tagName != t });
        this.updateByCommentTags(tmp[0],tags);
    },
    posWord: function(pos) {
        if (pos == 0) return null;
        var val = this.value;
        if (val.indexOf('[') == -1) return null;
        var lastIndex = val.lastIndexOf('[', pos);
        if (lastIndex >= pos) {
            return null;
        }
        var firstIndex = val.indexOf(']', pos);
        if (firstIndex < pos && (firstIndex != -1)) {
            return null;
        }
        val = val.substring(lastIndex + 1, pos);
        if (val.indexOf(']') != -1) {
            // wow
            return null;
        }
        return val;
    },
    migemoSuggest: function(word) {
        var regex = new RegExp(XMigemoTextUtils.getANDFindRegExpFromTerms(XMigemoCore.getRegExps(word, 'gi')));
        var words = [];
        var suggestTags = this.suggestTags;
        var limit = this.maxSuggest;
        for (var i = 0, len = suggestTags.length;  i < len; i++) {
            var tKey = suggestTags[i];
            if (regex.test(tKey)) {
                if (!words.some(function(w) {return w == tKey}))
                    words.push(tKey);
            }
            if (words.length >= limit) break;
        }
        return words;
    },
    suggest: function(pos) {
        var word = this.posWord(pos);
        if (!word) return [];

        var limit = this.maxSuggest;
        var words = [];
        var w = word.toUpperCase();
        var spaceMatched = function(tKey, index, ws, first) {
            if (ws.length == 0) return true;
            var i;
            if (((i = tKey.indexOf(ws.shift(), index)) >= 0) && !(first && i != 0)) {
                return spaceMatched(tKey, i+2, ws, false);
            }
            return false;
        }

        var sep = w.split(/\s+/);
        var ws = [];
        for (var i = 0;  i < sep.length; i++) {
            if (sep[i]) ws.push(sep[i]);
        }

        var suggestTags = this.suggestTags;
        for (var i = 0, len = suggestTags.length;  i < len; i++) {

            var tKey = suggestTags[i];
            if (spaceMatched(tKey.toUpperCase(), 0, Array.prototype.slice.apply(ws), true)) {
                if (!words.some(function(w) { return w == tKey}))
                    words.push(tKey);
            }
            if (words.length >= limit) break;
        }
        return words;

    },
    insertionTag: function(tagName, pos) {
        var value = this.value;
        var prefix = value.substring(0, pos);
        var suffix = value.substring(pos);
        var lPos = prefix.lastIndexOf('[');
        if (lPos == -1) return false;
        prefix = prefix.substring(0, lPos + 1) + tagName + ']';
        if (suffix.indexOf(']') == 0) {
            // '[tag]]examle' とならないように
            suffix = suffix.substring(1);
        }
        this.value = prefix + suffix;
        return prefix.length;
    },
    updateByCommentTags: function(comment, tags) {
        var text = comment;
        if (tags.length) {
            text = '[' + tags.join('][') +']' + text;
        }
        this.value = text;
    },
    uniqTextTags: function() {
        // input の文字列がいきなりかわると嫌なので、明示的に行う
        var tmp = this.cutoffComment(this.value);
        this.updateByCommentTags(tmp[0],tmp[1]);
    },
    cutoffComment: function(str) {
        var re = /\[([^\[\]]+)\]/g;
        var match;
        var tags = [];
        var lastIndex = 0;
        while ((match = re.exec(str))) {
            lastIndex += match[0].length; 
            if (lastIndex == re.lastIndex) {
                var tag = match[1];
                if (!tags.some(function(t) { return tag == t }))
                    tags.push(match[1]);
            }
        }
        var comment = str.substring(lastIndex) || '';
        return [comment, tags];
    },
}



