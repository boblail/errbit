module ErrsHelper
  
  def last_notice_at(err)
    err.last_notice_at || err.created_at
  end
  
  def err_confirm
    Errbit::Config.confirm_resolve_err === false ? nil : 'Seriously?'
  end
  
  def format_backtrace_line(line)
    path = File.dirname(line['file']) + '/'
    file = File.basename(line['file'])
    method = line['method']
    number = line['number']
    
    ("<span class=\"path\">#{path}</span>" <<
    "<span class=\"file\">#{file}:#{number}</span>" <<
    " &rarr; " <<
    "<span class=\"method\">#{method}</span>").html_safe
  end
  
end