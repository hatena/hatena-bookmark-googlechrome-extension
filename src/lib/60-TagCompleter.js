
var E = Utils.createElementSimply;

var TagCompleter = $({});

$.extend(TagCompleter, {
    register: function(input, options) {
        this.options = options || {};
        this.input = input;
        var self = this;
        TagCompleter.InputLine.prototype.__defineSetter__('value', function(text) {
            this._text = text;
            self.input.attr('value', text);
            if (self.options.updatedHandler) self.options.updatedHandler(this);
        });
        this.inputLine = new TagCompleter.InputLine('', []);
        input.bind('keydown', function(ev) {
            setTimeout(function() {
                var val = ev.target.value;
                if (val != self.inputLine.value)
                    self.inputLine.value = val;
            }, 0);
        });
    },
    addSuggestTags: function(tags) {
        this.tags = tags;
        this.inputLine.suggestTags = tags; // XXX
    },
    updateComment: function(text) {
        this.inputLine.value = text;
    },
});

/*
$.extend(TagComplete, {
    addTags: function(tags) {
        for (var tag in tags) {
            if (tags[tag].count) {
                this.tagsArray.push([tag, parseInt(tags[tag].count), tags[tag].timestamp]);
                this.tags[tag] = tags[tag];
                this.tagsKeys.push(tag);
            }
        }
        this.tagsKeys.sort(function(a, b) {
            if (a.toUpperCase() > b.toUpperCase() ) {
                return 1;
            } else if (a.toUpperCase() < b.toUpperCase() ) {
                return -1;
            } else {
                return 0;
            }
        });
    },
    observeInput: function(element) {
        if (this.keydownObserver) return;
        this.targetInput = element;
        this.keyupObserver = new Ten.Observer(element, 'onkeyup', this, 'keyupHandler');

        if ((Ten.Browser.isFirefox && Ten.Browser.isOSX) || Ten.Browser.isOpera) {
            this.keypressObserver = new Ten.Observer(element, 'onkeypress', this, 'keydownHandler');
            //this.keypressObserver = new Ten.Observer(element, 'onkeypress', this, 'keypressHandler');
        } else {
            this.keydownObserver = new Ten.Observer(element, 'onkeydown', this, 'keydownHandler');
        }

        this.registerInputTags(element.value);
    },
    registerInputTags: function(str) {
        var lastInputTags = this.inputedTags.join('_');
        var r = Hatena.Bookmark.StringHelper.cutoffComment(str);
        var comment = r[0];
        this.inputedTags = r[1];
        this.commentByteCounter(comment);
        var nowInputTags = this.inputedTags.join('_');
        if (nowInputTags != lastInputTags) {
            this.dispatchEvent('update_input_tags', this.inputedTags);
            this.targetInput.focus();
        }
    },
    commentByteCounter: function(comment) {
        var bytes = Hatena.Bookmark.StringHelper.countCommentToBytes(comment);
        this.dispatchEvent('update_comment_byte', Math.ceil(bytes/3));
    },
    updateInputedTags: function() {
        this.registerInputTags(this.targetInput.value);
    },
    suggest: function() {
        this.updateInputedTags();

        if (this.getInputValue().indexOf('[') == -1) {
            this.finish();
            return;
        }

        var pos = this.getTargetWordPos();
        if (pos[0] == -1) {
            this.finish();
            return;
        }
        var val = this.getInputValue();
        var word = val.substring(pos[0], pos[1]);
        word = word.replace(/\]$/, '');
        this.suggestWord(word);
    },
    suggestWord: function(word) {
        if (word && word.indexOf('[') == -1) {
            if (word == this.lastWord) return;
            this.lastWord = word;
            this.currentWords = this.createWords(word, 10);
            if (!this.hasCaret())
                this.caret = -1;
            p('suggest words', word);
            this.dispatchEvent('suggest', this.currentWords);
            if (word.indexOf(']') >= 0) {
                this.finish();
            }
        } else {
            this.finish();
        }
    },
    hasCaret: function() {
        return ('caret' in this);
    },
    createWords: function(word, limit) {
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

        for (var i = 0, len = this.tagsKeys.length;  i < len; i++) {
            var tKey = this.tagsKeys[i];

            if (spaceMatched(tKey.toUpperCase(), 0, Array.prototype.slice.apply(ws), true)) {
                words.push({
                    name: tKey,
                    count: this.tags[tKey].count
                });
            }
            if (words.length >= limit) break;
        }
        return words;
    },
    getTextCaretPos: function() {
        var element = this.targetInput;
        var add = this.oneMode() ? 1 : 0;
        if (document.all) {
            var range = document.selection.createRange();
            var textRange = element.createTextRange();
            textRange.setEndPoint('EndToStart', range);
            return textRange.text.length + add;
        } else if(document.getElementById) {
            return element.selectionStart + add;
        }
    },
    updateCaret: function(pos) {
        if (this.hasCaret()) {
            if (this.caret != pos) {
                this.caret = pos;
                this.dispatchEvent('update', this.caret);
            }
        }
    },
    caretNext: function() {
        if (this.hasCaret()) {
            var caret = this.caret;
            caret++;
            if (caret >= this.currentWords.length) caret = 0;
            this.updateCaret(caret);
        }
    },
    caretPrev: function() {
        if (this.hasCaret()) {
            var caret = this.caret;
            caret--;
            if (caret < 0) caret = this.currentWords.length - 1;
            this.updateCaret(caret);
        }
    },
    getInputValue: function() {
        var value = this.targetInput.value;
        if (this.oneMode())
            return '[' + value;
        return value;
    },
    oneMode: function() {
        return this.mode == 'onetag';
    },
    appendTag: function(tagName) {
        var val = this.targetInput.value;
        var lastIndex = val.lastIndexOf(']');
        if (lastIndex == -1) {
            this.targetInput.value = '[' + tagName + ']' + val;
        } else {
            var prefix = val.substring(0, lastIndex + 1);
            var suffix = val.substr(lastIndex + 1);
            this.targetInput.value = prefix + '[' + tagName + ']' + suffix;
        }
        this.updateInputedTags();
    },
    removeTag: function(tagName) {
        var val = this.targetInput.value;
        this.targetInput.value = val.replace(new RegExp('\\[' + tagName.replace(/([\|\-\^\$\+\*\(\)\{\}])/g, "\\$1") + '\\]', 'gi'), '');
        this.updateInputedTags();
    },
    complete: function() {
        var val = this.getInputValue();
        var pos = this.getTargetWordPos();
        if (this.hasCaret() ) {
            word = this.currentWords[this.caret] || this.currentWords[0];
            if (!word) {
                if (this.oneMode()) delete this.caret;
                return;
            }

            word = word.name;
            var prefix = val.substring(0, pos[0]);
            var suffix = val.substr(pos[1]);
            p('complete', word, prefix, suffix);
            var newValue = prefix + word + ']' + suffix;
            if (this.oneMode())
                newValue = newValue.replace(/\[/g, '').replace(/\]/g, '');

            if (Ten.Browser.isFirefox && Ten.Browser.isOSX) {
                setTimeout(Ten.Function.bind(function() {
                    this.targetInput.value = newValue;
                    this.targetInput.select();
                    this.moveInputCaret((prefix + word).length + 1);
                    this.finish();
                    this.dispatchEvent('complete');
                    this.targetInput.focus();
                    if (this.oneMode()) delete this.caret;
                }, this), 1);
            } else {
                this.targetInput.value = newValue;
                this.targetInput.select();
                this.moveInputCaret((prefix + word).length + 1);
                this.finish();
                this.dispatchEvent('complete');
                this.targetInput.focus();
                    if (this.oneMode()) delete this.caret;
            }
        }
    },
    moveInputCaret: function(index) {
        if (document.all) {
            var range = this.targetInput.createTextRange();
            range.collapse();
            range.move('character', index);
            range.select();
        } else {
           this.targetInput.setSelectionRange(index, index);
        }
    },
    finish: function() {
        delete this.caret;
        delete this.currentWords;
        delete this.lastWord;
        this.dispatchEvent('suggest_hide');
    },
    keydownHandler: function(e) {
        //if (this.hasCaret() && (e.isKey('enter') || e.isKey('tab'))) {
        if (this.hasCaret()) {
            var keyCode = e.event.keyCode;
            switch( keyCode ) {
                case 13: // enter
                    this.complete();
                    e.stop();
                    break;
                case 9: // tab
                    if (this.currentWords.length == 1) {
                        this.complete();
                    } else if (e.shiftKey) {
                        this.caretPrev();
                    } else {
                        this.caretNext();
                    }
                    if ( !this.lastWord && this.oneMode() ) {
                        //
                    } else if( this.lastWord && this.lastWord.indexOf(']') >= 0 ) { // XXX...
                        //
                    } else {
                        e.stop();
                    }
                    if (Ten.Browser.isOpera) {
                        setTimeout(function() {
                            e.target.focus();
                        }, 10);
                    }
                    break;
                case 38: // cursor up
                    this.caretPrev();
                    e.stop();
                    break;
                case 40: // cursor down
                    this.caretNext();
                    e.stop();
                    break;
            }
        }
    },
    keyupHandler: function(e) {
        if (!e.isKey('enter'))
            this.suggest();
    }
});

Hatena.Bookmark.TagComplete.FlatList = new Hatena.Bookmark.Class({
    initialize: function(tagComplete, tagList) {
        this.constructor.SUPER.call(this);
        this.tagComplete = tagComplete;
        this.list = tagList;
        this.applyTagCompleteInput();
        this.registerEventListeners(tagComplete);
    }
}, {
    applyTagCompleteInput: function() {
        if (this.tagComplete.inputedTags) this.update(this.tagComplete.inputedTags);
    },
    registerEventListeners: function(target) {
        var self = this;
        new Ten.Observer(this.list, 'onclick', this, 'listClickHandler');
        target.oldAddEventListener('update_input_tags', function(tags) { self.update(tags); });
    },
    listClickHandler: function(e) {
        if (Ten.DOM.hasClassName(e.target, 'tag')) {
            var t = e.target;
            if (Ten.DOM.hasClassName(t, 'tag-selected')) {
                this.tagComplete.removeTag(Ten.DOM.scrapeText(t));
            } else {
                this.tagComplete.appendTag(Ten.DOM.scrapeText(t));
            }
        }
    },
    update: function(tags) {
        var tTags = this.list.getElementsByTagName('span');
        for (var i = 0;  i < tTags.length; i++) {
            var tag = tTags[i];
            var flag = false;
            for (var j = 0;  j < tags.length; j++) {
                if (Ten.DOM.scrapeText(tag).toUpperCase() == tags[j].toUpperCase()) {
                    flag = true;
                    break;
                }
            }
            if (flag) {
                Ten.DOM.addClassName(tag, 'tag-selected');
            } else {
                Ten.DOM.removeClassName(tag, 'tag-selected');
            }
        }
    }
});

Hatena.Bookmark.TagComplete.DropDownList = new Hatena.Bookmark.Class({
    initialize: function(tagComplete) {
        this.constructor.SUPER.call(this);
        this.tagComplete = tagComplete;
        this.registerEventListeners(tagComplete);
    }
}, {
    registerEventListeners: function(target) {
        var self = this;
        target.oldAddEventListener('suggest', function(words) {
            self.suggestWord(words);
        });
        target.oldAddEventListener('suggest_hide', function() { self.hide(); });
        target.oldAddEventListener('update', function(pos) { self.update(pos); });
    },
    suggestWord: function(words) {
        if (words.length) {
            this.showSuggest(words);
        } else {
            this.hide();
        }
    },
    show: function() {
        if (this.list) this.list.style.display = 'block';
    },
    hide: function() {
        if (this.list) this.list.style.display = 'none';
    },
    update: function(pos) {
        var list = this.list;
        if (!list) return;

        for (var i = 0;  i < list.childNodes.length; i++) {
            var li = list.childNodes[i];
            if (pos == i) {
                li.className = 'hatena-bookmark-suggest-curret';
            } else {
                li.className = '';
            }
        }
    },
    showSuggest: function(words) {
        this.createList();
        this.show();
        this.updatePosition();
        this.replaceList(words);
    },
    clearList: function() {
        Ten.DOM.removeAllChildren(this.list);
    },
    replaceList: function(words) {
        this.clearList();
        var E = Ten.Element;
        for (var i = 0;  i < words.length; i++) {
            var word = words[i];
            var li = E('li', {}, 
                E('span', {className: 'hatena-bookmark-suggest-count'}, word.count), 
                word.name
            );
            this.list.appendChild(li);
        }
    },
    createList: function() {
        if (!this.list) {
            this.list = Ten.Element('ul', {className: 'hatena-bookmark-tag-list'});
            document.body.appendChild(this.list);
            this.mouseoverObserver = new Ten.Observer(this.list, 'onmouseover', this, 'mouseoverHandler');
            this.mousedownObserver = new Ten.Observer(this.list, 'onmousedown', this, 'mousedownHandler');
            this.keydownObserver = new Ten.Observer(this.list, 'onkeydown', this.tagComplete, 'keydownHandler');
        }
        return this.list;
    },
    mousedownHandler: function(e) {
        this.tagComplete.complete();
    },
    mouseoverHandler: function(e) {
        var target = e.target;
        var list = this.list;
        for (var i = 0;  i < list.childNodes.length; i++) {
            var li = list.childNodes[i];
             if (li == target || li == target.parentNode) {
                this.tagComplete.updateCaret(i);
            }
        }
    },
    updatePosition: function() {
        var list = this.list;
        var target = this.tagComplete.targetInput;
        var pos = Ten.Geometry.getElementPosition(target);
        list.style.top = pos.y + target.offsetHeight + 'px';
        list.style.left = pos.x + 'px';
    }
});
*/

TagCompleter.InputLine = function(value, tags) {
    this.suggestTags = tags;
    this.value = value;
    this.maxSuggest = Config.get('tags.tagMaxResult');
}

TagCompleter.InputLine.prototype = {
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
    suggest: function(pos) {
        var word = this.posWord(pos);
        if (!word) return [];

        if (!this.suggestTags) return;

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



