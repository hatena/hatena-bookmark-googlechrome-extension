/*============================================================*
 * TagCompleter のテスト
 *============================================================*/

module( "TagCompleter" );

test( "TagCompleter", 55, function () {
    window.__defineGetter__('TestTags', function() {
        // 毎回生成する
        return [
           '*これはほげ',
           'aaa',
           'abc',
           'array',
           'arrya',
           'as3',
        ];
    });

    (function testUniqTag()
    {
        var line = new TagCompleter.InputLine('[foo][bar][foo]hoge', TestTags);
        is(line.value, '[foo][bar][foo]hoge');
        line.uniqTextTags();
        is(line.value, '[foo][bar]hoge');
    })();

    (function testAddTag()
    {
        var line = new TagCompleter.InputLine('', TestTags);
        line.addTag('foo');
        is(line.value, '[foo]');
        line.addTag('foo');
        is(line.value, '[foo]');
        line.addTag('bar');
        is(line.value, '[foo][bar]');
    })();

    (function testAddTag2()
    {
        var line = new TagCompleter.InputLine('コメント', TestTags);
        line.addTag('foo');
        is(line.value, '[foo]コメント');
        line.addTag('foo');
        is(line.value, '[foo]コメント');
        line.addTag('bar');
        is(line.value, '[foo][bar]コメント');
    })();


    (function testAddTag3()
    {
        var line = new TagCompleter.InputLine('[foo][aaコメント', TestTags);
        line.addTag('foo');
        is(line.value, '[foo][aaコメント');
        line.addTag('foo');
        is(line.value, '[foo][aaコメント');
        line.addTag('bar');
        is(line.value, '[foo][bar][aaコメント');
    })();

    (function testDevareTag() {
        var line = new TagCompleter.InputLine('[foo][aaコメント', TestTags);
        line.deleteTag('foo');
        is(line.value, '[aaコメント');
        line.deleteTag('foo');
        is(line.value, '[aaコメント');

        line = new TagCompleter.InputLine('[foo][bar][aaコメント', TestTags);
        line.deleteTag('foo');
        is(line.value, '[bar][aaコメント');
        line.deleteTag('bar');
        is(line.value, '[aaコメント');
    })();

    (function testPosWord () {
        var line = new TagCompleter.InputLine('[foo][bar]moo', TestTags);
        is(line.posWord(0), null);
        is(line.posWord(1), "");
        is(line.posWord(2), 'f');
        is(line.posWord(3), 'fo');
        is(line.posWord(4), 'foo');
        is(line.posWord(5), null);
        is(line.posWord(6), "");
        is(line.posWord(7), 'b');
        is(line.posWord(8), 'ba');
        is(line.posWord(9), 'bar');
        is(line.posWord(10), null);

        is(line.posWord(11), null);

        line = new TagCompleter.InputLine('a', TestTags);
        is(line.posWord(1), null);
    })();

    (function testSuggest() {
        var line = new TagCompleter.InputLine('[a', TestTags);
        var tags = line.suggest(2); // caret pos, デフォルトだと 10 個
        is(tags, ['aaa', 'abc', 'array', 'arrya', 'as3']);
        tags = line.suggest(1);
        is(tags, []);

        line.maxSuggest = 2;
        tags = line.suggest(2);
        is(tags, ['aaa', 'abc']);

        line = new TagCompleter.InputLine('[ano][bar]', TestTags);
        is(line.suggest(0), []);
        is(line.suggest(3), []);
        is(line.suggest(4), []);
        is(line.suggest(5), []);

        line = new TagCompleter.InputLine('[*こ', TestTags);
        is(line.suggest(0), []);
        is(line.suggest(1), []);
        is(line.suggest(2), ['*これはほげ']);
        is(line.suggest(3), ['*これはほげ']);

        line = new TagCompleter.InputLine('', TestTags);
        is(line.suggest(0), []);
    })();

    (function testInsertion() {
        var line = new TagCompleter.InputLine('[a', TestTags);
        // 戻り値に、caret 位置を返す
        is(5, line.insertionTag('abc', 2));
        is(line.suggest(5), []);
        is(line.value, '[abc]');

        line = new TagCompleter.InputLine('[a', TestTags);
        is(3, line.insertionTag('a', 2));
        is(line.suggest(3), []);
        is(line.value, '[a]');

        line = new TagCompleter.InputLine('[a', TestTags);
        is(5, line.insertionTag('abc', 1));
        is(line.suggest(5), []);
        is(line.value, '[abc]a');

        line = new TagCompleter.InputLine('[a[foo]komment', TestTags);
        is(9, line.insertionTag('afoobar', 2));
        is(line.suggest(9), []);
        is(line.value, '[afoobar][foo]komment');

        line = new TagCompleter.InputLine('[a][foo]komment', TestTags);
        is(9, line.insertionTag('afoobar', 2));
        is(line.suggest(9), []);
        is(line.value, '[afoobar][foo]komment');
    })();

});
