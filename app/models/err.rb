# Represents a set of Notices which can be automatically
# determined to refer to the same Error

class Err
  include Mongoid::Document
  include Mongoid::Timestamps
  
  # All notices contained in this err
  # have the following attributes in common.
  field :klass
  field :component
  field :action
  field :environment
  field :fingerprint
  
  embeds_many :notices
  embedded_in :problem, :inverse_of => :errs
  
  validates_presence_of :klass, :environment
  
  delegate :app, :resolved?, :to => :problem
  
  
  def message
    notices.first.try(:message) || klass
  end
  
  
  def where
    where = component.dup
    where << "##{action}" if action.present?
    where
  end
  
  
end