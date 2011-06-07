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
                          '<backtrace>BACKTRACE_LINES</backtrace>' + 
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
    errorWithoutDefaults = errorWithoutDefaults || {};
    
    var error = Hoptoad.mergeDefault(Hoptoad.errorDefaults, errorWithoutDefaults);
    
    error.type        = error.type        || error.name || 'Error';
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
    var backtrace  = [],
        stacktrace = CrashKit.computeStackTrace(error),
        lines      = stacktrace.stack,
        line;
        
    if(stacktrace.mode == 'failed') {
      // !todo
    } else {
      for(var i=0, ii=lines.length; i<ii; i++) {
        line = lines[i];
        if(Hoptoad.validBacktraceLine(line.url)) {
          
          var file = line.url.replace(error.url, '[PROJECT_ROOT]/');
          
          backtrace.push(Hoptoad.generateLine(line.func, file, line.line));
        }
      }
    }
    
    return backtrace;
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



// CrashKit.computeStackTrace: cross-browser stack traces in JavaScript
//
// Syntax:
//   s = CrashKit.computeStackTrace.ofCaller([depth])
//   s = CrashKit.computeStackTrace(exception) -- consider using CrashKit.report instead (see below)
// Returns:
//   s.name              - exception name
//   s.message           - exception message
//   s.stack[i].url      - JavaScript or HTML file URL
//   s.stack[i].func     - function name, or empty for anonymous functions (if guessing did not work)
//   s.stack[i].line     - line number, or null if unknown
//   s.stack[i].context  - an array of source code lines, the middle element corresponds to the correct line#
//   s.mode              - 'firefox', 'opera' or 'callers' -- method used to collect the stack trace
//
// Supports:
//   - Firefox: full stack trace with line numbers
//   - Opera:   full stack trace with line numbers
//   - Safari:  line number for the topmost stacktrace element only
//   - IE:      no line numbers whatsoever
//
// * Tries to guess names of anonymous functions by looking for assignments in the source code.
// * In IE and Safari has to guess source file names by searching for func bodies inside all page scripts.
// * Beware: some func names may be guessed incorrectly and duplicate funcs may be mismatched.
//
// CrashKit.computeStackTrace should only be used for tracing purposes. Logging of unhandled exceptions
// should be done with CrashKit.report, which builds on top of CrashKit.computeStackTrace and provides
// better IE support by utilizing window.onerror event.
//
// Note: In IE and Safari, no stack trace is recorded inside exception object, so computeStackTrace
// instead walks its *own* chain of callers. This means that:
//  * in Safari, some methods may be missing from the stack trace;
//  * in IE, the topmost function in the stack trace will always be the caller of computeStackTrace.
// This is okay for tracing (because you are likely to be calling computeStackTrace from the function
// you want to be the topmost element of the stack trace anyway), but not okay for logging unhandled
// exceptions (because your catch block will likely be far away from the inner function that actually
// caused the exception).
//
// Tracing example:
//     function trace(message) {
//         var stackInfo = CrashKit.computeStackTrace.ofCaller();
//         var data = message + "\n";
//         for(var i in stackInfo.stack) {
//             var item = stackInfo.stack[i];
//             data += (item.func || '[anonymous]') + "() in " + item.url + ":" + (item.line || '0') + "\n";
//         }
//         if (window.console)
//             console.info(data);
//         else
//             alert(data);
//     }
//
var CrashKit = {};
CrashKit.computeStackTrace = (function() {
    var debug = false;
    var sourceCache = {};
    
    if (typeof XMLHttpRequest == "undefined") {  // IE 5.x-6.x:
        XMLHttpRequest = function() {
            try { return new ActiveXObject("Msxml2.XMLHTTP.6.0"); } catch(e) {}
            try { return new ActiveXObject("Msxml2.XMLHTTP.3.0"); } catch(e) {}
            try { return new ActiveXObject("Msxml2.XMLHTTP"); } catch(e) {}
            try { return new ActiveXObject("Microsoft.XMLHTTP"); } catch(e) {}
            throw new Error( "This browser does not support XMLHttpRequest." );
        };
    }

    var loadSource = function(url) {
        try {
            var request = new XMLHttpRequest();
            request.open("GET", url, false);
            request.send("");
            return request.responseText;
        } catch(e) {
            // alert(e.message);
            return "";
        }
    };
    
    var getSource = function(url) {
        if (!(url in sourceCache))
            sourceCache[url] = loadSource(url).split("\n");
        return sourceCache[url];
    };

    var guessFunctionNameFromLines = function(lineNo, source) {
      var reFunctionArgNames = /function ([^(]*)\(([^)]*)\)/;
      var reGuessFunction = /['"]?([0-9A-Za-z$_]+)['"]?\s*[:=]\s*(function|eval|new Function)/;
      // Walk backwards from the first line in the function until we find the line which
      // matches the pattern above, which is the function definition
      var line = "";
      var maxLines = 10;
      for (var i = 0; i < maxLines; ++i) {
            line = source[lineNo-i] + line;
            if (line !== undefined)
            {
                var m = reGuessFunction.exec(line);
                if (m) {
                    return m[1];
                } else {
                    m = reFunctionArgNames.exec(line);
                } if (m && m[1]) {
                    return m[1];
                }
            }
        }
        return "?";
    };

    var guessFunctionName = function(url, lineNo) {      
        var source = getSource(url);
        return guessFunctionNameFromLines(lineNo, source);
    };

    var gatherContext = function(url, lineNo) {
        var source = getSource(url);
        var context = [], anyDefined = false;
        lineNo = lineNo - 1; // convert to int and to 0-based indexes
        for(var l = lineNo - 2; l <= lineNo + 2; l++) {
            var item = source[l];
            if (typeof item != "undefined")
                anyDefined = true;
            context.push(item);
        }
        return (anyDefined ? context : null);
    };
    
    var escapeRegExp = function(text) {
        if (!arguments.callee.sRE) {
            var specials = ['/', '.', '*', '+', '?', '|', '(', ')', '[', ']', '{', '}', '\\'];
            arguments.callee.sRE = new RegExp('(\\' + specials.join('|\\') + ')', 'g');
        }
        return text.replace(arguments.callee.sRE, '\\$1');
    };

    var escapeCodeAsRegExpForMatchingInsideHTML = function(body) {
        return escapeRegExp(body).replace('<', '(?:<|&lt;)').replace('>', '(?:>|&gt;)')
                .replace('&', '(?:&|&amp;)').replace('"', '(?:"|&quot;)').replace(/\s+/g, '\\s+');
    };

    var findSourceInUrls = function(re, urls, singleLineExpected) {
        for (var i in urls) {
            var source = getSource(urls[i]);
            if (source) {
                source = source.join("\n");
                var m = re.exec(source);
                if (m) {
                    var result = {'url': urls[i], 'line': null};
                    result.startLine = source.substring(0, m.index).split("\n").length;
                    if (singleLineExpected)
                        result.line = result.startLine;
                    // console.info("Found function in " + urls[i]);
                    return result;
                }
            }
        }
        return null;
    };

    var findSourceByFunctionBody = function(func) {
        var htmlUrls = [window.location.href];
        var urls = [window.location.href];
        var scripts = document.getElementsByTagName("script");
        for (var i = 0; i < scripts.length; i++) {
            var script = scripts[i];
            if (script.src)
                urls.push(script.src);
        }
        var code = ""+func;

        var codeRE = /^function(?:\s+([\w$]+))?\s*\(([\w\s,]+)\)\s*\{\s*(\S[\s\S]*\S)\s*\}\s*$/;
        var eventRE = /^function on([\w$]+)\s*\(event\)\s*\{\s*(\S[\s\S]*\S)\s*\}\s*$/;
        var re;
        var isOneLiner = false;
        if (!codeRE.test(code))
            re = new RegExp(escapeRegExp(code));
        else {
            var name = RegExp.$1, args = RegExp.$2, body = RegExp.$3;
            args = args.split(",").join("\\s*,\\s*");
            name = (name ? "\\s+" + name : '');
            isOneLiner = (body.split("\n").length == 1);
            body = escapeRegExp(body)
                .replace(/;$/, ';?') // semicolon is inserted if the function ends with a comment
                .replace(/\s+/g, '\\s+');
            re = new RegExp("function" + name + "\\s*\\(" + args + "\\)\\s*{\\s*" + body + "\\s*}");
        }

        var result = findSourceInUrls(re, urls, isOneLiner);
        if (result) return result;

        if (eventRE.test(code)) {
            var event = RegExp.$1, body = RegExp.$2;
            body = escapeCodeAsRegExpForMatchingInsideHTML(body);

            re = new RegExp("on" + event + '=[\\\'"]\\s*' + body + '\\s*[\\\'"]', 'i');
            result = findSourceInUrls(re, urls, true);
            if (result) return result;

            re = new RegExp(body);
            result = findSourceInUrls(re, urls, true);
            if (result) return result;
        }

        if (window.console)
            console.info("Function code not found in HTML and all SCRIPTs (please contact CrashKit support):\n" + code);
        return null;
    };
    
    // Contents of Exception in various browsers.
    //
    // WEBKIT:
    // ex.message = Can't find variable: qq
    // ex.line = 59
    // ex.sourceId = 580238192
    // ex.sourceURL = http://localhost:5005/static/javascript/crashkit-ie-test.html
    // ex.expressionBeginOffset = 96
    // ex.expressionCaretOffset = 98
    // ex.expressionEndOffset = 98
    // ex.name = ReferenceError
    //
    // FIREFOX:
    // ex.message = qq is not defined
    // ex.fileName = http://localhost:5005/static/javascript/crashkit-ie-test.html#
    // ex.lineNumber = 59
    // ex.stack = ...stack trace... (see the example below)
    // ex.name = ReferenceError
    //
    // INTERNET EXPLORER:
    // ex.message = ...
    // ex.name = ReferenceError
    // 
    // OPERA:
    // ex.message = ...message... (see the example below)
    // ex.name = ReferenceError
    // ex.opera#sourceloc = 11  (pretty much useless, duplicates the info in ex.message)
    // ex.stacktrace = n/a; see 'opera:config#UserPrefs|Exceptions Have Stacktrace'
    
    
    var computeStackTraceFromFirefoxStackProp = function(ex) {
        if (!ex.stack)
            return null;
            
        // In Firefox, ex.stack contains a stack trace as a string. Example value is:
        //
        // qqq("hi","hi","hi")@file:///Users/andreyvit/Projects/crashkit/javascript-client/sample.js:7
        // ("hi","hi","hi")@file:///Users/andreyvit/Projects/crashkit/javascript-client/sample.js:3
        // ppp("hi","hi","hi")@file:///Users/andreyvit/Projects/crashkit/javascript-client/sample.html#:17
        // ("hi","hi","hi")@file:///Users/andreyvit/Projects/crashkit/javascript-client/sample.html#:12
        // xxx("hi")@file:///Users/andreyvit/Projects/crashkit/javascript-client/sample.html#:8
        // onclick([object MouseEvent])@file:///Users/andreyvit/Projects/crashkit/javascript-client/sample.html#:1        
        
        var lineRE = /^\s*(?:(\w*)\(.*\))?@((?:file|http).*):(\d+)\s*$/i;
        var lines = ex.stack.split("\n");
        var stack = [];
        for(var i in lines) {
            var line = lines[i];
            if (lineRE.test(line)) {
                var element = {'url': RegExp.$2, 'func': RegExp.$1, 'line': RegExp.$3};
                if (!element.func && element.line)
                    element.func = guessFunctionName(element.url, element.line);
                if (element.line)
                    element.context = gatherContext(element.url, element.line);
                stack.push(element);
            }
        }
        if (!stack.length)
            return null; // ex.stack is defined, but cannot be parsed
        return {'mode': 'firefox', 'name': ex.name, 'message': ex.message, 'stack': stack};
    };
    
    var computeStackTraceFromOperaMultiLineMessage = function(ex) {
        // Opera includes a stack trace into the exception message. An example is:
        //
        // Statement on line 3: Undefined variable: undefinedFunc
        // Backtrace:
        //   Line 3 of linked script file://localhost/Users/andreyvit/Projects/crashkit/javascript-client/sample.js: In function zzz
        //         undefinedFunc(a);
        //   Line 7 of inline#1 script in file://localhost/Users/andreyvit/Projects/crashkit/javascript-client/sample.html: In function yyy
        //           zzz(x, y, z);
        //   Line 3 of inline#1 script in file://localhost/Users/andreyvit/Projects/crashkit/javascript-client/sample.html: In function xxx
        //           yyy(a, a, a);
        //   Line 1 of function script 
        //     try { xxx('hi'); return false; } catch(ex) { CrashKit.report(ex); }
        //   ...
        //
        // Note that we don't try to detect Opera because browser detection is evil.
        // Instead, we try to parse any multi-line exception message as Opera stack trace.
        
        var lines = ex.message.split("\n");
        if (lines.length < 4)
            return null;
            
        var lineRE1 = /^\s*Line (\d+) of linked script ((?:file|http)\S+)(?:: in function (\S+))?\s*$/i,
            lineRE2 = /^\s*Line (\d+) of inline#(\d+) script in ((?:file|http)\S+)(?:: in function (\S+))?\s*$/i,
            lineRE3 = /^\s*Line (\d+) of function script\s*$/i;
        var stack = [];
        var scripts = document.getElementsByTagName('script');
        var inlineScriptBlocks = [];
        for (var i in scripts)
            if (!scripts[i].src)
                inlineScriptBlocks.push(scripts[i]);
        for (var i=2, len=lines.length; i < len; i += 2) {
            var item = null;
            if (lineRE1.test(lines[i]))
                item = {'url': RegExp.$2, 'func': RegExp.$3, 'line': RegExp.$1};
            else if (lineRE2.test(lines[i])) {
                item = {'url': RegExp.$3, 'func': RegExp.$4};
                var relativeLine = (RegExp.$1 - 0);  // relative to the start of the <SCRIPT> block
                var script = inlineScriptBlocks[RegExp.$2 - 1];
                if (script) {
                    var source = getSource(item.url);
                    if (source) {
                        source = source.join("\n");
                        var pos = source.indexOf(script.innerText);
                        if (pos >= 0) {
                            item.line = relativeLine + source.substring(0, pos).split("\n").length;
                        }
                    }
                }
            } else if (lineRE3.test(lines[i])) {
                var url = window.location.href.replace(/#.*$/, ''), line = RegExp.$1;
                var re = new RegExp(escapeCodeAsRegExpForMatchingInsideHTML(lines[i+1]));
                var source = findSourceInUrls(re, [url], true);
                if (source)
                    item = {'url': url, 'line': source.line, 'func': ''};
            }
            if (item) {
                if (!item.func)
                    item.func = guessFunctionName(item.url, item.line);
                var context = gatherContext(item.url, item.line);
                var midline = (context ? context[Math.floor(context.length/2)] : null);
                if (context && midline.replace(/^\s*/, '') == lines[i+1].replace(/^\s*/, ''))
                    item.context = context;
                else {
                    // if (context) alert("Context mismatch. Correct midline:\n" + lines[i+1] + "\n\nMidline:\n" + midline + "\n\nContext:\n" + context.join("\n") + "\n\nURL:\n" + item.url);
                    item.context = [lines[i+1]];
                }
                stack.push(item);
            }
        }
        if (!stack.length)
            return null; // could not parse multiline exception message as Opera stack trace

        return {'mode': 'opera', 'name': ex.name, 'message': lines[0], 'stack': stack};
    };
    
    var augmentStackTraceWithInitialElement = function(stackInfo, url, lineNo) {
        var initial = {'url': url, 'line': lineNo};
        if (initial.url && initial.line) {
            stackInfo.incomplete = false;
            
            if (!initial.func)
                initial.func = guessFunctionName(initial.url, initial.line);
            if (!initial.context)
                initial.context = gatherContext(initial.url, initial.line);
            if (stackInfo.stack.length > 0)
                if (stackInfo.stack[0].url == initial.url)
                    if (stackInfo.stack[0].line == initial.line) {
                        return; // already in stack trace
                    } else if (!stackInfo.stack[0].line && stackInfo.stack[0].func == initial.func) {
                        stackInfo.stack[0].line = initial.line;
                        stackInfo.stack[0].context = initial.context;
                        return;
                    }
            stackInfo.stack.splice(0, 0, initial);
            stackInfo.partial = true;
            return true;
        } else {
            stackInfo.incomplete = true;
        }
    };
    
    var computeStackTraceByWalkingCallerChain = function(ex, depth) {
        var fnRE  = /function\s*([\w\-$]+)?\s*\(/i;
        var stack = [];

        var funcs = {}, recursion = false;
        for(var curr = arguments.callee.caller; curr && !recursion; curr = curr.caller) {
            var fn = curr.name || '';
            if (!fn)
                fn = fnRE.test(curr.toString()) ? RegExp.$1 || '' : '';
            
            var source = findSourceByFunctionBody(curr);
            var url = null, line = null;
            if (source) {
                url  = source.url;
                line = source.line;
                if (!fn)
                    fn = guessFunctionName(url, source.startLine);
            }

            recursion = !!funcs[curr];
            funcs[curr] = true;

            var item = {'url': url, 'func': fn, 'line': line};
            if (recursion) item.recursion = true;
            stack.push(item);
        }
        stack.splice(0, depth);
        
        var result = {'mode': 'callers', 'name': ex.name, 'message': ex.message, 'stack': stack};
        augmentStackTraceWithInitialElement(result, ex.sourceURL || ex.fileName, ex.line || ex.lineNumber);
        return result;
    };
    
    var computeStackTrace = function(ex, depth) {
        var stack = null;
        depth = (typeof depth == 'undefined' ? 0 : depth-0);
        
        try {
            stack = computeStackTraceFromFirefoxStackProp(ex);
            if (stack) return stack;
        } catch(e) { if(debug) throw e; }
        
        try {
            stack = computeStackTraceFromOperaMultiLineMessage(ex);
            if (stack) return stack;
        } catch(e) { if(debug) throw e; }
        
        try {
            stack = computeStackTraceByWalkingCallerChain(ex, depth + 1);
            if (stack) return stack;
        } catch(e) { if(debug) throw e; }
        
        return { 'mode': 'failed' };
    };
    
    var computeStackTraceOfCaller = function(depth) {
        depth = (typeof depth == 'undefined' ? 0 : depth-0) + 1; // "+ 1" because "ofCaller" should drop one frame
        try {
            (0)();
        } catch(ex) {
            return computeStackTrace(ex, depth+1);
        }
    };
    
    computeStackTrace.augmentStackTraceWithInitialElement = augmentStackTraceWithInitialElement;
    computeStackTrace.guessFunctionName = guessFunctionName;
    computeStackTrace.gatherContext = gatherContext;
    computeStackTrace.ofCaller = computeStackTraceOfCaller;
    
    return computeStackTrace;
})();



window.onerror = function(message, file, line) {
  setTimeout(function() {
    Hoptoad.notify({
      message : message,
      stack   : '@' + file + ':' + line
    });
  }, 100);
  return true;
};

