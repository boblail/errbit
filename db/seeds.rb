puts "Seeding database"
puts "-------------------------------"

# Create an initial Admin User
admin_email = "errbit@#{Errbit::Config.host}"
admin_pass  = 'password'

puts "Creating an initial admin user:"
puts "-- email:    #{admin_email}"
puts "-- password: #{admin_pass}"
puts ""
puts "Be sure to change these credentials ASAP!"
user = User.where(:email => admin_email).first || User.new({
  :name                   => 'Errbit Admin',
  :email                  => admin_email,
  :password               => admin_pass,
  :password_confirmation  => admin_pass
})

user.admin = true
user.save!

# Create a test application
app = App.where(:name => "Test App").first || App.create(:name => "Test App")

# Report a number of errors for the application
app.error_reports.delete_all
app.problems.delete_all

errors = [{
  :klass => "ArgumentError",
  :message => "wrong number of arguments (3 for 0)"
}, {
  :klass => "RuntimeError",
  :message => "Could not find Red October"
}, {
  :klass => "SyntaxError",
  :message => "unexpected tSTRING_BEG, expecting keyword_do or '{' or '('"
}]

RANDOM_METHODS = ActiveSupport.methods.shuffle[1..4]

def random_backtrace
  backtrace = []
  99.times {|t| backtrace << {
    'number'  => t.hash % 1000,
    'file'    => "/path/to/file.rb",
    'method'  => RANDOM_METHODS.shuffle.first
  }}
  backtrace
end

errors.each do |error_template|
  rand(13).times do
    
    error_report = error_template.reverse_merge({
      :klass => "StandardError",
      :message => "Oops. Something went wrong!",
      :backtrace => random_backtrace,
      :request => {
                    'component' => 'main',
                    'action' => 'error'
                  },
      :server_environment => {'name' => Rails.env.to_s},
      :notifier => "seeds.rb"
    })
    
    app.report_error!(error_report)
  end
end
