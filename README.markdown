# はてなブックマーク Google Chrome 拡張

本文書は, はてなブックマーク Google Chrome 拡張の開発者向けです.
利用者向け情報は下記ページなどをご覧ください.

* http://b.hatena.ne.jp/guide/chrome_extentions

## テストについて

src/tests にテストがあります.
テストは, はてなブックマーク Google Chrome 拡張をインストールしている Chrome で
chrome-extension://{extension-id}/tests/test.html にアクセスすると実行されます.

リリースのための zip ファイルには src/tests を含める必要はありませんので,
下記コマンドを使うなどして src/tests 以下を含めない zip ファイルを作成してください.

````
$ find src | grep -v '^src/tests\(/\|$\)' | xargs zip src.zip
````
