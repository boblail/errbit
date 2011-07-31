require 'spec_helper'

describe 'Hoptoad::V2' do
  
  
  describe "fingerprint" do
    before do
      @app = Factory(:app, :api_key => 'APIKEY')
    end
    
    it "should be different for two exceptions with different messages" do
      xml1 = Rails.root.join('spec', 'fixtures', 'hoptoad_test_notice.xml').read
      xml2 = Rails.root.join('spec', 'fixtures', 'hoptoad_test_notice_with_different_message.xml').read
      
      notice1 = App.report_error!(xml1)
      notice2 = App.report_error!(xml2)
      notice1.fingerprint.should_not == notice2.fingerprint
    end
    
    it "should be the same for two exceptions with the same message that occur on the same line of the same file" do
      xml1 = Rails.root.join('spec', 'fixtures', 'hoptoad_test_notice.xml').read
      xml2 = Rails.root.join('spec', 'fixtures', 'hoptoad_test_notice_with_different_backtrace.xml').read
      
      notice1 = App.report_error!(xml1)
      notice2 = App.report_error!(xml2)
      notice1.fingerprint.should == notice2.fingerprint
    end
    
  end
  
  
end
