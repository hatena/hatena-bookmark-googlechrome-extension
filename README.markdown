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

## ソースファイルの配置

Chrome 拡張と Opera 拡張を同じブランチで管理できるように、ソースファイルの配置は少し複雑になっています。

* src/main ディレクトリ: どの製品向けのパッケージにも含まれる基本的なソースファイル
* src/chrome ディレクトリ: Chrome 用のパッケージに含まれるファイル
* src/opera ディレクトリ: Opera 用のパッケージに含まれるファイル

複数ファイルに分散しているため、このままだと開発用に Chrome や Opera で読み込むことができません。
そこで、これらのソースファイルをコピーして、obj/* ディレクトリ以下に配置するための Rake タスク filecopy が存在します。

```
bundle exec rake filecopy
```

また、ソースファイルの変更時に自動的に filecopy タスクを実行するための watchr 設定ファイルもあります。

```
bundle exec watchr filecopy.watchr
```

## Ruby Gems の管理

`rake` や `watchr` に必要な Ruby gems は bundler で管理しています。

* [Bundler: The best way to manage a Ruby application's gems](http://gembundler.com/)
* [bundle install 周りのドキュメント](http://gembundler.com/v1.3/man/bundle-install.1.html)

Bundler がインストールされている状態で次のコマンドを実行すると、このプロジェクトで必要な Gem がインストールされます。

```
bundle install
```
