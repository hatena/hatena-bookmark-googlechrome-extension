# src ディレクトリ以下のファイルが更新されたときに自動的に
#   rake filecopy
# するための watchr の設定ファイル

watch("^src/(.*)") { |m| system 'rake filecopy' }
