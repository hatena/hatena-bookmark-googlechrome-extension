require 'rake/clean'

require 'json'
require 'pathname'
require 'crxmake'
require 'open-uri'

project_name = 'hatena-bookmark'

root_path = Pathname.new(__FILE__).parent
src_path = root_path.join('src')
manifest_path = src_path.join('manifest.json')
output_path = root_path.join('bin')
pem_file = ENV['PEM'] || root_path.join(project_name + '.pem')

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
