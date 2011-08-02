# Represents a single Problem. The problem may have been
# reported as various Errs, but the user has grouped the
# Errs together as belonging to the same problem.

class Problem
  include Mongoid::Document
  include Mongoid::Timestamps
  
  field :last_notice_at, :type => DateTime
  field :resolved, :type => Boolean, :default => false
  field :issue_link, :type => String
  field :app_name, :type => String
  field :notices_count, :type => Integer
  field :message, :type => String
  field :where, :type => String
  
  index :last_notice_at
  index :app_id
  index :app_name
  index :message
  index :last_notice_at
  # index :last_deploy_at
  index :notices_count
  
  referenced_in :app
  embeds_many :errs
  
  scope :resolved, where(:resolved => true)
  scope :unresolved, where(:resolved => false)
  scope :ordered, order_by(:last_notice_at.desc)
  def self.ordered_by(sort, order)
    case sort
    when "app";            order_by(["app_name", order])
    when "message";        order_by(["message", order])
    when "last_notice_at"; order_by(["last_notice_at", order])
    when "last_deploy_at"; order_by(["last_deploy_at", order])
    when "count";          order_by(["notices_count", order])
    else raise("\"#{sort}\" is not a recognized sort")
    end
  end
  scope :in_env, lambda {|env| where('errs.environment' => env)}
  scope :for_apps, lambda {|apps| where(:app_id.in => apps.all.map(&:id))}
  
  delegate :environment, :klass, :to => :first_err
  
  
  def first_err
    errs.first
  end
  
  
  def self.merge!(*problems)
    problems = (problems.first.is_a?(Array) ? problems.first : problems).dup
    merged_problem = problems.shift
    problems.each do |problem|
      problem.errs.each {|err| merged_problem.errs << err.dup}
      problem.destroy
    end
    merged_problem.update_cached_values
    merged_problem
  end
  
  
  def merged?
    errs.length > 1
  end
  
  
  def unmerge!
    problems = [self]
    errs[1..-1].each do |err|
      new_problem = app.problems.create!
      new_problem.errs << err.dup
      problems << new_problem
      err.destroy
    end
    problems.each {|p| p.update_cached_values}
  end
  
  
  # !todo: order
  def notices
    errs.inject([]) {|all, err| all + err.notices.ordered}
  end
  
  
  def resolve!
    self.update_attributes!(:resolved => true)
  end
  
  
  def unresolve!
    self.update_attributes!(:resolved => false)
  end
  
  
  def unresolved?
    !resolved?
  end
  
  
  def update_cached_values(options={})
    new_attributes = {}
    notice = options[:notice]
    if notice
      new_attributes[:last_notice_at] = notice.created_at unless last_notice_at && last_notice_at > notice.created_at
    else
      new_attributes[:last_notice_at] = notices.collect(&:created_at).max
    end
    new_attributes[:resolved] = false
    new_attributes[:app_name] = app.name
    new_attributes[:notices_count] = errs.collect {|e| e.notices.count}.sum
    new_attributes[:message] = first_err.message
    new_attributes[:where] = first_err.where
    update_attributes(new_attributes)
  end
  
  
end