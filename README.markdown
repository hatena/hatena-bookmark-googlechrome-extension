# はてなブックマーク Google Chrome 拡張

本文書は, はてなブックマーク Google Chrome 拡張の開発者向けです。
利用者向け情報は下記ページなどをご覧ください。

* http://b.hatena.ne.jp/guide/chrome_extentions

## ブランチの使い方

永続的なブランチとして下記の 2 つを使用しています。

* master
* dev

開発時は dev ブランチから新しいトピックブランチをきって、トピックブランチでの開発が終了した時に
dev ブランチにマージ (または pull reqeust) してください。
本番リリースの際には dev ブランチを master ブランチにマージしてリリースします。

## テストについて

src/tests にテストがあります。
テストは, はてなブックマーク Google Chrome 拡張をインストールしている Chrome で
chrome-extension://{extension-id}/tests/test.html にアクセスすると実行されます。

リリースのための zip ファイルには src/tests を含める必要はありません。
(`rake package` により ZIP ファイルを作成すると自動的に src/tests 以下は除かれます。)

## Rakefile

Rakefile に必要な Ruby gems は bundler で管理しています。

* [Bundler: The best way to manage a Ruby application's gems](http://gembundler.com/)
* [bundle install 周りのドキュメント](http://gembundler.com/v1.3/man/bundle-install.1.html)
