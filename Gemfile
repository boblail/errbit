source 'http://rubygems.org'

gem 'rails', '3.0.5'
gem 'nokogiri'
gem 'mongoid', '~> 2.0.0.rc.7'
gem 'haml'
gem 'will_paginate'
gem 'devise', '~> 1.1.8'
gem 'lighthouse-api'
gem 'redmine_client', :git => "git://github.com/oruen/redmine_client.git"
gem 'useragent', '~> 0.3.1'

platform :ruby do
  gem 'bson_ext', '~> 1.2'
end

group :development, :test do
  gem 'rspec-rails', '~> 2.5'
  gem 'webmock', :require => false
  gem 'ruby-debug', :platform => :mri_18
  gem 'ruby-debug19', :platform => :mri_19
end

group :test do
  gem 'rspec', '~> 2.5'
  gem 'database_cleaner', '~> 0.6.0'
  gem 'factory_girl_rails'
end
