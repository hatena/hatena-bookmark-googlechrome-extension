
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
            if ((ev.keyCode == 9 || ev.keyCode == 13) && self.suggestWords.length)
                return false; // tab or enter
        });
        input.bind('keyup', function(ev) {
            return self.keyupHandler(ev);
        });
    },
    suggestWords: [],
    keyupHandler: function(e) {
        var self = this;
        var keyCode = e.keyCode;
        var target = e.target;
        var val = target.value;
        if (val != self.inputLine.value) {
            self.inputLine.value = val;
        }
        var pos = target.selectionStart;
        self.createSuggestWords(pos);

        if (this.suggestWords.length == 0) return;

        switch( keyCode ) {
            case 13: // enter
                this.complete(pos);
                return false;
                break;
            case 9: // tab
                if (this.suggestWords.length == 1) {
                    this.complete(pos);
                    return false;
                } else if (e.shiftKey) {
                    this.caretPos--;
                } else {
                    this.caretPos++;
                }
                if (this.suggestWords.length)
                    return false;
                break;
            case 38: // cursor up
                this.caretPos--;
                return false;
                break;
            case 40: // cursor down
                this.caretPos++;
                return false;
                break;
        }
    },
    complete: function(pos) {
        var word = this.suggestWords[this.caretPos];
        if (word) {
            this.suggestWords = [];
            this._caretPos = 0;
            delete this.lastSuggestPos;
            var index = this.inputLine.insertionTag(word, pos);
            this.input.get(0).setSelectionRange(index, index);
        }
    },
    set caretPos(val) {
        if (val > this.suggestWords.length-1) val = 0;
        if (val < 0) val = this.suggestWords.length-1;
        this._caretPos = val;
        console.log([val, this.suggestWords[this._caretPos]]);
    },
    get caretPos() {
        return this._caretPos;
    },
    createSuggestWords:function(pos) {
        if (this.lastSuggestPos == pos) return;

        this.lastSuggestPos = pos;
        this.suggestWords = this.inputLine.suggest(pos) || [];
        this.caretPos = 0;
    },
    addSuggestTags: function(tags) {
        if (this.inputLine.suggestTags.length) {
            this.inputLine.suggestTags = this.inputLine.suggestTags.concat(tags);
        } else {
            this.inputLine.suggestTags = tags; // XXX
        }
    },
    updateComment: function(text) {
        this.inputLine.value = text;
    },
    update: function() {
        if (this.options.updatedHandler) this.options.updatedHandler(this.inputLine);
    }
});


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



