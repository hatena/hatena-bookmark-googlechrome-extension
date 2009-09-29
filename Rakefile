
require 'rubygems'
require 'json/pure'
require 'rake'
require 'rake/clean'
require 'pathname'
begin
  require 'crxmake'
rescue LoadError
  warn "require jsonschema"
  warn "gem sources -a http://gems.github.com"
  warn "gem install Constellation-crxmake"
  exit 1
end
require 'crxmake'
require 'open-uri'

project_name = 'hatena-bookmark'

github_account = 'youracountname' # `git config github.user`.chomp
github_project = 'hatena-bookmark'
extension_url = "http://cloud.github.com/downloads/#{github_account}/#{github_project}/#{project_name}.crx"

root_path = Pathname.new(__FILE__).parent
src_path = root_path.join('src')
manifest_path = src_path.join('manifest.json')
update_path = src_path.join('update.xml')
output_path = root_path.join('bin')
pem_file = ENV['PEM'] || root_path.join(project_name + '.pem')

task :release => [:clean, :update_xml, :package]
task :default => ['manifest:validate']

CLEAN.include ['**/.*.sw?', '.*.sw?']

namespace :manifest do
  desc "json schema check"
  task :validate do
    begin
      require 'jsonschema'
    rescue LoadError
      warn "require jsonschema"
      warn "gem sources -a http://gems.github.com"
      warn "gem install Constellation-jsonschema"
      exit 1
    end
    data = JSON.parse manifest_path.read
    schema = JSON.parse open('http://gist.github.com/179669.txt').read # manifest.json schema by os0x
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

task :update_xml do
  puts "update xml: #{update_path}"
  manifest = JSON.parse manifest_path.read
  raise 'require id & version' unless manifest['id'] && manifest['version']
  template = <<-EOF
<gupdate xmlns="http://www.google.com/update2/response" protocol="2.0">
    <app appid="#{manifest['id']}">
        <updatecheck codebase="#{extension_url}" version="#{manifest['version']}" />
    </app>
</gupdate>
  EOF
  update_path.open('w') do |f|
    f.puts template
  end
end

task :package do
  output_path.mkpath unless output_path.directory?
  crx = output_path.join("#{project_name}.crx").to_s
  options = {
    :ex_dir => src_path.to_s,
    :crx_output => crx,
#    :verbose => true,
    :ignorefile => /\.sw[op]/,
    :ignoredir => /\.(?:svn|git|cvs)/
  }
  if pem_file && Pathname.new(pem_file.to_s).exist?
    options[:pkey] = pem_file.to_s
  else
    options[:pkey_output] = pem_file.to_s
  end
  CrxMake.make(options)
  puts "generated package: #{crx}"
  puts "generated pkem(.pem): #{options[:pkey_output]}" if options[:pkey_output]
end


