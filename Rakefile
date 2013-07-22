# encoding: utf-8

require 'rake/clean'

require 'json'
require 'pathname'
require 'open-uri'

project_name = 'hatena-bookmark'

root_path = Pathname.new(__FILE__).parent
src_path = root_path.join('src')
chrome_manifest_path = src_path.join('chrome/manifest.json')
output_path = root_path.join('bin')

task :release => [:clean, :package]
task :default => [:filecopy]

CLEAN.include ['**/.*.sw?', '.*.sw?']

namespace :manifest do
  desc "json schema check"
  task :validate_chrome do
    require 'jsonschema'
    data = JSON.parse chrome_manifest_path.read
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

# 指定のディレクトリ (複数) の中にあるファイル全てを
# 別のディレクトリの中にコピーするためのタスクを定義する。
def setup_filecopy_task(taskname, obj_dir_path_str, src_dir_path_strs)
  obj_dir = Pathname.new(obj_dir_path_str)
  obj_file_path_strs = []
  src_dir_path_strs.each do |src_dir_path_str|
    src_dir_pathname = Pathname.new(src_dir_path_str)
    Pathname.glob(src_dir_pathname.to_s + '/**/*') do |pathname|
      src_str  = pathname.to_s
      dist     = obj_dir + pathname.relative_path_from(src_dir_pathname)
      dist_str = dist.to_s
      if pathname.directory?
        directory dist_str
      else
        file dist_str => [ dist.dirname.to_s, src_str ] do |t|
          cp src_str, t.name
        end
      end
      obj_file_path_strs << dist
    end
  end

  directory obj_dir_path_str
  task taskname => [ obj_dir.to_s ] + obj_file_path_strs
end

setup_filecopy_task(:filecopy_chrome, 'obj/chrome', [ 'src/main', 'src/chrome' ])
setup_filecopy_task(:filecopy_opera,  'obj/opera',  [ 'src/main', 'src/opera' ])

task :filecopy => [ :filecopy_chrome, :filecopy_opera ]

desc "Chrome 拡張リリース用の zip ファイルを生成する"
task :package_chrome => [ :filecopy_chrome ] do
  # TODO src_path を使うように
  # TODO output_path を使うように
  # TODO project_name を使うように
  sh 'find obj/chrome | grep -v \'^obj/chrome/tests\\(/\\|$\\)\' | xargs zip bookmark-googlechrome-extension.zip'
end

task :package => [ :package_chrome ]
