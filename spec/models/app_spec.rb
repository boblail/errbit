require 'spec_helper'

describe App do
  
  
  
  context 'validations' do
    it 'requires a name' do
      app = Factory.build(:app, :name => nil)
      app.should_not be_valid
      app.errors[:name].should include("can't be blank")
    end
    
    it 'requires unique names' do
      Factory(:app, :name => 'Errbit')
      app = Factory.build(:app, :name => 'Errbit')
      app.should_not be_valid
      app.errors[:name].should include('is already taken')
    end
    
    it 'requires unique api_keys' do
      Factory(:app, :api_key => 'APIKEY')
      app = Factory.build(:app, :api_key => 'APIKEY')
      app.should_not be_valid
      app.errors[:api_key].should include('is already taken')
    end
  end
  
  
  
  context 'being created' do
    it 'generates a new api-key' do
      app = Factory.build(:app)
      app.api_key.should be_nil
      app.save
      app.api_key.should_not be_nil
    end
    
    it 'generates a correct api-key' do
      app = Factory(:app)
      app.api_key.should match(/^[a-f0-9]{32}$/)
    end
  end
  
  
  
  context '#find_or_create_err!' do
    before do
      @app = Factory(:app)
      @conditions = {
        :klass        => 'Whoops',
        :component    => 'Foo',
        :action       => 'bar',
        :environment  => 'production'
      }
    end
    
    it 'returns the correct err if one already exists' do
      existing = Factory(:err, @conditions.merge(:problem => Factory(:problem, :app => @app)))
      @app.find_err(@conditions).should == existing
      @app.find_or_create_err!(@conditions).should == existing
    end
    
    it 'assigns the returned err to the given app' do
      @app.find_or_create_err!(@conditions).app.should == @app
    end
    
    it 'creates a new problem if a matching one does not already exist' do
      @app.find_err(@conditions).should be_nil
      lambda {
        @app.find_or_create_err!(@conditions)
      }.should change(Problem,:count).by(1)
    end
  end
  
  
  
  context '#report_error!' do
    before do
      @xml = Rails.root.join('spec','fixtures','hoptoad_test_notice.xml').read
      @app = Factory(:app, :api_key => 'APIKEY')
      ErrorReport.stub(:get_fingerprint).and_return('fingerprintdigest')
    end
    
    it 'finds the correct app' do
      @notice = App.report_error!(@xml)
      @notice.err.app.should == @app
    end
    
    it 'finds the correct err for the notice' do
      App.should_receive(:find_by_api_key!).and_return(@app)
      @app.should_receive(:find_or_create_err!).with({
        :klass        => 'HoptoadTestingException',
        :component    => 'application',
        :action       => 'verify',
        :environment  => 'development',
        :fingerprint  => 'fingerprintdigest'
      }).and_return(err = Factory(:err))
      err.notices.stub(:create!)
      @notice = App.report_error!(@xml)
    end
    
    it 'marks the err as unresolved if it was previously resolved' do
      App.should_receive(:find_by_api_key!).and_return(@app)
      @app.should_receive(:find_or_create_err!).with({
        :klass        => 'HoptoadTestingException',
        :component    => 'application',
        :action       => 'verify',
        :environment  => 'development',
        :fingerprint  => 'fingerprintdigest'
      }).and_return(err = Factory(:err, :problem => Factory(:problem, :resolved => true)))
      err.should be_resolved
      @notice = App.report_error!(@xml)
      @notice.err.should == err
      @notice.err.should_not be_resolved
    end
    
    it 'should create a new notice' do
      @notice = App.report_error!(@xml)
      @notice.should be_persisted
    end
    
    it 'assigns an err to the notice' do
      @notice = App.report_error!(@xml)
      @notice.err.should be_a(Err)
    end
    
    it 'captures the err message' do
      @notice = App.report_error!(@xml)
      @notice.message.should == 'HoptoadTestingException: Testing hoptoad via "rake hoptoad:test". If you can see this, it works.'
    end
    
    it 'captures the backtrace' do
      @notice = App.report_error!(@xml)
      @notice.backtrace.size.should == 73
      @notice.backtrace.last['file'].should == '[GEM_ROOT]/bin/rake'
    end
    
    it 'captures the server_environment' do
      @notice = App.report_error!(@xml)
      @notice.server_environment['environment-name'].should == 'development'
    end
    
    it 'captures the request' do
      @notice = App.report_error!(@xml)
      @notice.request['url'].should == 'http://example.org/verify'
      @notice.request['params']['controller'].should == 'application'
    end
    
    it 'captures the notifier' do
      @notice = App.report_error!(@xml)
      @notice.notifier['name'].should == 'Hoptoad Notifier'
    end
    
    it "should handle params without 'request' section" do
      xml = Rails.root.join('spec','fixtures','hoptoad_test_notice_without_request_section.xml').read
      lambda { App.report_error!(xml) }.should_not raise_error
    end
    
    it "should handle params with only a single line of backtrace" do
      xml = Rails.root.join('spec','fixtures','hoptoad_test_notice_with_one_line_of_backtrace.xml').read
      lambda { @notice = App.report_error!(xml) }.should_not raise_error
      @notice.backtrace.length.should == 1
    end
  end
  
  
  
end
