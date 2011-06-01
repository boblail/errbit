require 'sinatra/base'
require 'erb'
require 'cgi'

class TestApp < Sinatra::Base
  
  get '/' do
    erb = File.read(File.join('views', 'index.html.erb'))
    @host = "http://#{@env['HTTP_HOST']}"
    ERB.new(erb).result(binding)
  end
  
  get '/notifier.js' do
    File.read(File.join('public', 'notifier.js'))
  end
  
  get '/notifier_api/v2/notices.xml' do
    CGI.escapeHTML(@params[:data])
  end
  
end
