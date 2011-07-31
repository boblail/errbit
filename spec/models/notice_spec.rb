require 'spec_helper'

describe Notice do
  
  
  context 'validations' do
    it 'requires a backtrace' do
      notice = Factory.build(:notice, :backtrace => nil)
      notice.should_not be_valid
      notice.errors[:backtrace].should include("can't be blank")
    end
    
    it 'requires the server_environment' do
      notice = Factory.build(:notice, :server_environment => nil)
      notice.should_not be_valid
      notice.errors[:server_environment].should include("can't be blank")
    end
    
    it 'requires the notifier' do
      notice = Factory.build(:notice, :notifier => nil)
      notice.should_not be_valid
      notice.errors[:notifier].should include("can't be blank")
    end
  end
  
  
  describe "user agent" do
    it "should be parsed and human-readable" do
      notice = Factory.build(:notice, :request => {'cgi-data' => {'HTTP_USER_AGENT' => 'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_7; en-US) AppleWebKit/534.16 (KHTML, like Gecko) Chrome/10.0.648.204 Safari/534.16'}})
      notice.user_agent.browser.should == 'Chrome'
      notice.user_agent.version.to_s.should =~ /^10\.0/
    end
    
    it "should be nil if HTTP_USER_AGENT is blank" do
      notice = Factory.build(:notice)
      notice.user_agent.should == nil
    end
  end
  
  
  describe "email notifications" do
    before do
      @app = Factory(:app_with_watcher)
      @err = Factory(:err, :problem => @app.problems.create!)
    end
    
    Errbit::Config.email_at_notices.each do |threshold|
      it "sends an email notification after #{threshold} notice(s)" do
        @err.notices.stub(:count).and_return(threshold)
        Mailer.should_receive(:err_notification).
          and_return(mock('email', :deliver => true))
        Factory(:notice, :err => @err)
      end
    end
  end
  
  
end