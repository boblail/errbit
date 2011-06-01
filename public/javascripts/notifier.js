var Hoptoad = {
  VERSION           : '0.1.1',
  NOTICE_XML        : '<?xml version="1.0" encoding="UTF-8"?>' + 
                      '<notice version="2.0">' + 
                        '<api-key></api-key>' + 
                        '<notifier>' + 
                          '<name>hoptoad_notifier_js</name>' + 
                          '<version>2.0</version>' + 
                          '<url>http://hoptoadapp.com</url>' + 
                        '</notifier>' + 
                        '<error>' + 
                          '<class>EXCEPTION_CLASS</class>' + 
                          '<message>EXCEPTION_MESSAGE</message>' + 
                          '<backtrace type="array">BACKTRACE_LINES</backtrace>' + 
                        '</error>' + 
                        '<request>' + 
                          '<url>REQUEST_URL</url>' + 
                          '<component>REQUEST_COMPONENT</component>' + 
                          '<action>REQUEST_ACTION</action>' + 
                        '</request>' + 
                        '<server-environment>' +
                          '<project-root>PROJECT_ROOT</project-root>' +
                          '<environment-name>production</environment-name>' + 
                        '</server-environment>' + 
                      '</notice>',
  ROOT              : window.location.protocol + '//' + window.location.host,
  BACKTRACE_MATCHER : /^(.*)\@(.*)\:(\d+)$/,
  backtrace_filters : [
                        /notifier\.js/
                      ],
  
  
  
  setEnvironment: function(value) {
    var matcher = /<environment-name>.*<\/environment-name>/;
    Hoptoad.NOTICE_XML  = Hoptoad.NOTICE_XML.replace(matcher, ('<environment-name>' + value + '</environment-name>'));
  },
  
  setHost: function(value) {
    Hoptoad.host = value;
  },
  
  setKey: function(value) {
    var matcher = /<api-key>.*<\/api-key>/;
    Hoptoad.NOTICE_XML = Hoptoad.NOTICE_XML.replace(matcher, ('<api-key>' + value + '</api-key>'));
  },
  
  setErrorDefaults: function(value) {
    Hoptoad.errorDefaults = value;
  },
  
  
  
  notify: function(error) {
    var xml     = escape(Hoptoad.generateXML(error)),
        host    = Hoptoad.host,
        url     = host + '/notifier_api/v2/notices.xml?data=' + xml,
        request = document.createElement('iframe');
    
    request.style.width   = '1px';
    request.style.height  = '1px';
    request.style.display = 'none';
    request.src           = url;
    
    document.getElementsByTagName('head')[0].appendChild(request);
  },
  
  
  
  generateXML: function(errorWithoutDefaults) {
    var error     = Hoptoad.normalizeError(errorWithoutDefaults),
        xml       = Hoptoad.NOTICE_XML
                      .replace('PROJECT_ROOT',        Hoptoad.ROOT)
                      .replace('EXCEPTION_CLASS',     Hoptoad.escapeText(error.type))
                      .replace('EXCEPTION_MESSAGE',   Hoptoad.escapeText(error.message));
        xml       = Hoptoad.fillInRequest(xml, error);
        xml       = Hoptoad.fillInBacktrace(xml, error);
    
    return xml;
  },
  
  normalizeError: function(errorWithoutDefaults) {
    var error = Hoptoad.mergeDefault(Hoptoad.errorDefaults, errorWithoutDefaults);
    
    error.type        = error.type        || 'Error';
    error.message     = error.message     || 'Unknown error.';
    error.url         = error.url         || '';
    error.component   = error.component   || error.controller_name || '';
    error.action      = error.action      || error.action_name || '';
    error['cgi-data'] = error['cgi-data'] || {};
    
    error['cgi-data']['HTTP_USER_AGENT'] = navigator.userAgent;
    
    return error;
  },
  
  
  
  fillInRequest: function(xml, error) {
    var url       = Hoptoad.escapeText(error.url),
        component = Hoptoad.escapeText(error.component),
        action    = Hoptoad.escapeText(error.action),
        noRequest = (Hoptoad.trim(url) == '') && (Hoptoad.trim(component) == '');
    
    return noRequest ? Hoptoad.eraseRequest(xml)
                     : Hoptoad.fillInRequestWith(xml, error, url, action, component);
  },
  
  
  eraseRequest: function(xml) {
    return xml.replace(/<request>.*<\/request>/, '');
  },
  
  fillInRequestWith: function(xml, error, url, action, component) {
    return xml.replace('</request>',        Hoptoad.generateData(error) + '</request>')
              .replace('REQUEST_URL',       url)
              .replace('REQUEST_ACTION',    action)
              .replace('REQUEST_COMPONENT', component);
  },
  
  
  generateData: function(error) {
    var data    = '',
        methods = ['cgi-data', 'params', 'session'];
        
    for(var i=0, ii=methods.length; i<ii; i++) {
      var type = methods[i];
      if(error[type]) {
        data += '<' + type + '>';
        data += Hoptoad.generateVariables(error[type]);
        data += '</' + type + '>';
      }
    }
    
    return data;
  },
  
  generateVariables: function(parameters) {
    var key,
        result = '';
    
    for(key in parameters) {
      result += '<var key="' + Hoptoad.escapeText(key) + '">' +
                  Hoptoad.escapeText(parameters[key]) +
                '</var>';
    }
    
    return result;
  },
  
  
  
  fillInBacktrace: function(xml, error) {
    var backtrace = Hoptoad.generateBacktrace(error);
    return xml.replace('BACKTRACE_LINES', backtrace.join(''));
  },
  
  generateBacktrace: function(error) {
    error = error || {};
    
    if(typeof error.stack != 'string') {
      try {
        (0)();
      } catch(e) {
        error.stack = e.stack;
      }
    }
    
    var backtrace  = [];
    var stacktrace = Hoptoad.getStackTrace(error);
    
    for(var i=0, ii=stacktrace.length; i<ii; i++) {
      var line    = stacktrace[i];
      var matches = line.match(Hoptoad.BACKTRACE_MATCHER);
      
      if(matches && Hoptoad.validBacktraceLine(line)) {
        var file = matches[2].replace(Hoptoad.ROOT, '[PROJECT_ROOT]');
        
        if(i == 0) {
          if(matches[2].match(document.location.href)) {
            backtrace.push(Hoptoad.generateLine('', 'internal: ', ''));
          }
        }
        
        backtrace.push(Hoptoad.generateLine(
          Hoptoad.escapeText(matches[1]),
          Hoptoad.escapeText(file),
          matches[3]));
      }
    }
    
    // !hack: there's got to be at least 2 lines for the parser to consider backtrace an array
    while(backtrace.length < 2) {
      backtrace.push(Hoptoad.generateLine('', '', ''));
    }
    
    return backtrace;
  },
  
  getStackTrace: function(error) {
    var stacktrace = printStackTrace(/*{ e : error, guess : false }*/);
    
    for(var i = 0, l = stacktrace.length; i < l; i++) {
      if(stacktrace[i].match(/\:\d+$/)) {
        continue;
      }
      
      if(stacktrace[i].indexOf('@') == -1) {
        stacktrace[i] += '@unsupported.js';
      }
      
      stacktrace[i] += ':0';
    }
    
    return stacktrace;
  },
  
  validBacktraceLine: function(line) {
    for(var i = 0; i < Hoptoad.backtrace_filters.length; i++) {
      if(line.match(Hoptoad.backtrace_filters[i])) {
        return false;
      }
    }
    
    return true;
  },
  
  generateLine: function(method, file, number) {
    return '<line method="' + method +
               '" file="' + file +
               '" number="' + number + '" />';
  },
  
  
  
  escapeText: function(text) {
    return text.replace(/&/g, '&#38;')
               .replace(/</g, '&#60;')
               .replace(/>/g, '&#62;')
               .replace(/'/g, '&#39;')
               .replace(/"/g, '&#34;');
  },
  
  trim: function(text) {
    return text.toString().replace(/^\s+/, '').replace(/\s+$/, '');
  },
  
  mergeDefault: function(defaults, hash) {
    var cloned = {};
    var key;
    
    for(key in hash) {
      cloned[key] = hash[key];
    }
    
    for(key in defaults) {
      if(!cloned.hasOwnProperty(key)) {
        cloned[key] = defaults[key];
      }
    }
    
    return cloned;
  }
};




// Domain Public by Eric Wendelin http://eriwen.com/ (2008)
//                  Luke Smith http://lucassmith.name/ (2008)
//                  Loic Dachary <loic@dachary.org> (2008)
//                  Johan Euphrosine <proppy@aminche.com> (2008)
//                  Øyvind Sean Kinsey http://kinsey.no/blog (2010)
//                  Victor Homyakov <victor-homyakov@users.sourceforge.net> (2010)
//
// Information and discussions
// http://jspoker.pokersource.info/skin/test-printstacktrace.html
// http://eriwen.com/javascript/js-stack-trace/
// http://eriwen.com/javascript/stacktrace-update/
// http://pastie.org/253058
//
// guessFunctionNameFromLines comes from firebug
//
// Software License Agreement (BSD License)
//
// Copyright (c) 2007, Parakey Inc.
// All rights reserved.
//
// Redistribution and use of this software in source and binary forms, with or without modification,
// are permitted provided that the following conditions are met:
//
// * Redistributions of source code must retain the above
//   copyright notice, this list of conditions and the
//   following disclaimer.
//
// * Redistributions in binary form must reproduce the above
//   copyright notice, this list of conditions and the
//   following disclaimer in the documentation and/or other
//   materials provided with the distribution.
//
// * Neither the name of Parakey Inc. nor the names of its
//   contributors may be used to endorse or promote products
//   derived from this software without specific prior
//   written permission of Parakey Inc.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
// IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
// FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
// CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
// DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
// IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
// OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

function printStackTrace(a){var b=a&&a.e?a.e:null;a=a?!!a.guess:true;var c=new printStackTrace.implementation;b=c.run(b);return a?c.guessFunctions(b):b}printStackTrace.implementation=function(){};
printStackTrace.implementation.prototype={run:function(a){a=a||function(){try{this.undef();return null}catch(c){return c}}();var b=this._mode||this.mode(a);return b==="other"?this.other(arguments.callee):this[b](a)},mode:function(a){if(a.arguments)return this._mode="chrome";else if(typeof window!=="undefined"&&window.opera&&a.stacktrace)return this._mode="opera10";else if(a.stack)return this._mode="firefox";else if(typeof window!=="undefined"&&window.opera&&!("stacktrace"in a))return this._mode="opera";
return this._mode="other"},instrumentFunction:function(a,b,c){a=a||window;a["_old"+b]=a[b];a[b]=function(){c.call(this,printStackTrace());return a["_old"+b].apply(this,arguments)};a[b]._instrumented=true},deinstrumentFunction:function(a,b){if(a[b].constructor===Function&&a[b]._instrumented&&a["_old"+b].constructor===Function)a[b]=a["_old"+b]},chrome:function(a){return a.stack.replace(/^[^\(]+?[\n$]/gm,"").replace(/^\s+at\s+/gm,"").replace(/^Object.<anonymous>\s*\(/gm,"{anonymous}()@").split("\n")},
firefox:function(a){return a.stack.replace(/(?:\n@:0)?\s+$/m,"").replace(/^\(/gm,"{anonymous}(").split("\n")},opera10:function(a){a=a.stacktrace.split("\n");var b=/.*line (\d+), column (\d+) in ((<anonymous function\:?\s*(\S+))|([^\(]+)\([^\)]*\))(?: in )?(.*)\s*$/i,c,d,e;c=2;d=0;for(e=a.length;c<e-2;c++)if(b.test(a[c])){var g=RegExp.$6+":"+RegExp.$1+":"+RegExp.$2,f=RegExp.$3;f=f.replace(/<anonymous function\:?\s?(\S+)?>/g,"{anonymous}");a[d++]=f+"@"+g}a.splice(d,a.length-d);return a},opera:function(a){a=
a.message.split("\n");var b=/Line\s+(\d+).*script\s+(http\S+)(?:.*in\s+function\s+(\S+))?/i,c,d,e;c=4;d=0;for(e=a.length;c<e;c+=2)if(b.test(a[c]))a[d++]=(RegExp.$3?RegExp.$3+"()@"+RegExp.$2+RegExp.$1:"{anonymous}()@"+RegExp.$2+":"+RegExp.$1)+" -- "+a[c+1].replace(/^\s+/,"");a.splice(d,a.length-d);return a},other:function(a){for(var b=/function\s*([\w\-$]+)?\s*\(/i,c=[],d,e;a&&c.length<10;){d=b.test(a.toString())?RegExp.$1||"{anonymous}":"{anonymous}";e=Array.prototype.slice.call(a.arguments||[]);
c[c.length]=d+"("+this.stringifyArguments(e)+")";a=a.caller}return c},stringifyArguments:function(a){for(var b=0;b<a.length;++b){var c=a[b];if(c===undefined)a[b]="undefined";else if(c===null)a[b]="null";else if(c.constructor)if(c.constructor===Array)a[b]=c.length<3?"["+this.stringifyArguments(c)+"]":"["+this.stringifyArguments(Array.prototype.slice.call(c,0,1))+"..."+this.stringifyArguments(Array.prototype.slice.call(c,-1))+"]";else if(c.constructor===Object)a[b]="#object";else if(c.constructor===
Function)a[b]="#function";else if(c.constructor===String)a[b]='"'+c+'"'}return a.join(",")},sourceCache:{},ajax:function(a){var b=this.createXMLHTTPObject();if(b){b.open("GET",a,false);b.setRequestHeader("User-Agent","XMLHTTP/1.0");b.send("");return b.responseText}},createXMLHTTPObject:function(){for(var a,b=[function(){return new XMLHttpRequest},function(){return new ActiveXObject("Msxml2.XMLHTTP")},function(){return new ActiveXObject("Msxml3.XMLHTTP")},function(){return new ActiveXObject("Microsoft.XMLHTTP")}],
c=0;c<b.length;c++)try{a=b[c]();this.createXMLHTTPObject=b[c];return a}catch(d){}},isSameDomain:function(a){return a.indexOf(location.hostname)!==-1},getSource:function(a){a in this.sourceCache||(this.sourceCache[a]=this.ajax(a).split("\n"));return this.sourceCache[a]},guessFunctions:function(a){for(var b=0;b<a.length;++b){var c=a[b],d=/\{anonymous\}\(.*\)@(\w+:\/\/([\-\w\.]+)+(:\d+)?[^:]+):(\d+):?(\d+)?/.exec(c);if(d){var e=d[1];d=d[4];if(e&&this.isSameDomain(e)&&d){e=this.guessFunctionName(e,d);
a[b]=c.replace("{anonymous}",e)}}}return a},guessFunctionName:function(a,b){var c;try{c=this.guessFunctionNameFromLines(b,this.getSource(a))}catch(d){c="getSource failed with url: "+a+", exception: "+d.toString()}return c},guessFunctionNameFromLines:function(a,b){for(var c=/function ([^(]*)\(([^)]*)\)/,d=/['"]?([0-9A-Za-z_]+)['"]?\s*[:=]\s*(function|eval|new Function)/,e="",g=0;g<10;++g){e=b[a-g]+e;if(e!==undefined){var f=d.exec(e);if(f&&f[1])return f[1];else if((f=c.exec(e))&&f[1])return f[1]}}return"(?)"}};




window.onerror = function(message, file, line) {
  setTimeout(function() {
    Hoptoad.notify({
      message : message,
      stack   : '()@' + file + ':' + line
    });
  }, 100);
  return true;
};

