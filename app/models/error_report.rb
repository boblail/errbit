require 'digest/md5'

# Stores---without interpretation----errors that
# were reported to Errbit

class ErrorReport
  include Mongoid::Document
  include Mongoid::Timestamps
  
  # Information about an exception
  field :klass
  field :message
  field :backtrace, :type => Array
  
  # Information about an exception's context
  field :request, :type => Hash
  field :server_environment, :type => Hash
  
  # Information about the reporter
  field :api_key
  field :notifier, :type => Hash
  
  referenced_in :app
  index :app_id
  
  after_initialize :lookup_app
  
  validates_presence_of :app,
                        :klass,
                        :message,
                        :backtrace,
                        :request,
                        :server_environment,
                        :api_key,
                        :notifier
  
  
  
  def initialize(xml_or_attributes)
    attributes = xml_or_attributes.is_a?(String) ? Hoptoad.parse_xml!(xml_or_attributes) : xml_or_attributes
    super(attributes)
  end
  
  
  
  def fingerprint
    @fingerprint ||= ErrorReport.get_fingerprint(self)
  end
  
  def self.get_fingerprint(report)
    Digest::MD5.hexdigest("#{report.message}#{report.backtrace[0]}")
  end
  
  def rails_env
    server_environment['environment-name'] || 'development'
  end
  
  def component
    request['component'] || 'unknown'
  end
  
  def action
    request['action']
  end
  
  def app
    @app ||= App.find_by_api_key!(api_key)
  end
  
  
  
  def generate_notice!
    notice = Notice.new(
      :message => message,
      :backtrace => backtrace,
      :request => request,
      :server_environment => server_environment,
      :created_at => created_at,
      :notifier => notifier)
    
    err = app.find_or_create_err!(
      :klass => klass,
      :component => component,
      :action => action,
      :environment => rails_env,
      :fingerprint => fingerprint)
    
    err.notices << notice
    notice
  end
  
  
  
private
  
  
  
  def lookup_app
    self.app ||= App.find_by_api_key!(api_key)
  end
  
  
  
end
