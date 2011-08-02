require 'hoptoad'
require 'digest/md5'

# Stores each unique notice of an error report
# (There is a 1-to-1 correspondence between Notices and ErrorReports)
# Notices are grouped by common features into Errs

class Notice
  include Mongoid::Document
  include Mongoid::Timestamps
  
  field :message
  field :backtrace, :type => Array
  field :server_environment, :type => Hash
  field :request, :type => Hash
  field :notifier, :type => Hash
  
  embedded_in :err, :inverse_of => :notices
  
  after_create :update_problem
  after_create :deliver_notification, :if => :should_notify?
  
  validates_presence_of :backtrace, :server_environment, :notifier
  
  scope :ordered, order_by(:created_at.asc)
  
  delegate :klass,
           :problem,
           :app,
           :to => :err
  
  
  def fingerprint
    @fingerprint ||= ErrorReport.get_fingerprint(self)
  end
  
  def user_agent
    agent_string = env_vars['HTTP_USER_AGENT']
    agent_string.blank? ? nil : UserAgent.parse(agent_string)
  end
  
  def request
    read_attribute(:request) || {}
  end
  
  def env_vars
    request['cgi-data'] || {}
  end
  
  def params
    request['params'] || {}
  end
  
  def session
    request['session'] || {}
  end
  
  
  
  def deliver_notification
    Mailer.err_notification(self).deliver
  end
  
  
protected
  
  
  def should_notify?
    app.notify_on_errs? && Errbit::Config.email_at_notices.include?(problem.notices.count) && app.watchers.any?
  end
  
  def update_problem
    problem.update_cached_values(:notice => self)
  end
  
  
end