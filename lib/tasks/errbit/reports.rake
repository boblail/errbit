namespace :reports do
  
  desc "Erases all ErrorReport records"
  task :clear => :environment do
    ErrorReport.delete_all
  end
  
  desc "Reconstructs ErrorReports from Notices"
  task :reconstruct => :environment do
    ErrorReport.delete_all
    
    App.all.each do |app|
      app.problems.each do |problem|
        problem.errs.each do |err|
          err.notices.each do |notice|
            ErrorReport.create({
              :klass              => notice.klass.to_s,
              :message            => notice.message,
              :backtrace          => notice.backtrace,
              :request            => normalize_keys(notice.request),
              :server_environment => normalize_keys(notice.server_environment),
              :api_key            => app.api_key,
              :notifier           => notice.notifier,
              :created_at         => notice.created_at
            })
          end
        end
      end
    end
  end
  
  desc "Replays history of notices from ErrorReports"
  task :replay => :environment do
    Problem.delete_all
    ErrorReport.all.each(&:generate_notice!)
  end
  
end



# !todo: there's some duplication between these helpers and Hoptoad::V2.rekey

def normalize_keys(node)
  case node
  when Hash
    node.inject({}) {|normalized, (key, val)| normalized.merge({normalize_key(key) => normalize_keys(val)})}
  
  when Array
    node.map(&method(:normalize_keys))
    
  else
    node
  end
end

def normalize_key(key)
  key.gsub('.', '_')
end
