# encoding: utf-8

require 'rake/clean'

require 'json'
require 'pathname'
require 'open-uri'

project_name = 'hatena-bookmark'

root_path = Pathname.new(__FILE__).parent
src_path = root_path.join('src')
manifest_path = src_path.join('manifest.json')
output_path = root_path.join('bin')

task :release => [:clean, :package]
task :default => ['manifest:validate']

CLEAN.include ['**/.*.sw?', '.*.sw?']

namespace :manifest do
  desc "json schema check"
  task :validate do
    require 'jsonschema'
    data = JSON.parse manifest_path.read
    schema = JSON.parse open('https://gist.github.com/os0x/179669/raw/').read # manifest.json schema by os0x
    puts "JSON schema check."
    begin
      JSON::Schema.validate(data, schema)
      puts "JSON schema valid."
    rescue JSON::Schema::ValueError => e
      puts "JSON schema invalid!"
      puts e.to_s
    end
  end
end

desc "リリース用の zip ファイルを生成する"
task :package do
  # TODO src_path を使うように
  # TODO output_path を使うように
  # TODO project_name を使うように
  sh 'find src | grep -v \'^src/tests\\(/\\|$\\)\' | xargs zip bookmark-googlechrome-extension.zip'
end
