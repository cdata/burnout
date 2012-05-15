var wd = require('wd'),
    q = require('q'),
    request = require('request'),
    ref = q.ref,
    reject = q.reject,
    defer = q.defer,
    all = q.all,
    fin = q.fin,
    seleniumMethods = [
        'init',
        'status',
        'get',
        'eval',
        'element',
        'elementById',
        'elementByName',
        'elementByCss',
        'getAttribute',
        'execute',
        'executeAsync',
        'click',
        'doubleClick',
        'clickElement',
        'close',
        'keys',
        'type',
        'text',
        'textPresent',
        'clear',
        'setImplicitWaitTimeout',
        'setPageLoadTimeout',
        'setAsyncScriptTimeout',
        'moveTo',
        'scroll',
        'text',
        'buttonDown',
        'buttonUp',
        'active',
        'keyToggle'
    ],
    seleniumBrowsers = [
        {
            browserName: "googlechrome"
        },
        {
            browserName: "firefox",
            version: "11",
            platform: "LINUX"
        },
        {
            browserName: "firefox",
            version: "3.6",
            platform: "XP"
        },
        {
            browserName: "iexplore",
            version: "6",
            platform: "XP"
        },
        {
            browserName: "iexplore",
            version: "7",
            platform: "XP"
        },
        {
            browserName: "iexplore",
            version: "8",
            platform: "XP"
        },
        {
            browserName: "iexplore",
            version: "9"
        },
        {
            browserName: "opera",
            version: "11",
            platform: "LINUX"
        }
    ],
    fork = function(session) {

        var forked = {};

        seleniumMethods.forEach(function(method) {

            forked[method] = function() {

                var methodArguments = Array.prototype.slice.call(arguments),
                    callback = methodArguments[methodArguments.length - 1],
                    result = defer();
                
                if(callback && typeof callback == 'function')
                    methodArguments.pop();
                else
                    callback = function(){};
                
                session.log(method + '( ' + methodArguments.join(', ') + ' )');

                methodArguments.push(function(error) {

                    if(error)
                        result.reject(error);
                    else
                        try {
                            return result.resolve(ref(callback.apply(fork(session), Array.prototype.slice.call(arguments, 1))));
                        } catch(e) {
                            result.reject(e);
                        }
                });

                try {
                    session.instance[method].apply(session.instance, methodArguments);
                } catch(e) {
                    result.reject(e);
                }

                return result.promise;
            };
        });

        return forked;
    };
    
exports.functionToBody = function(fn) {

    var parts = fn.toString().match(/^function\s*\(([^\)]*)\)\s*\{([\s\S]*)\}$/m),
        callback = parts[1].split(',').pop().trim(),
        body = parts[2].trimRight();

    return "\n\nvar " + callback + " = arguments[arguments.length - 1];" + body + "\n\n";
};


exports.initialize = function(options) {

    var browser = {},
        seleniumSessions = [],
        testsFailed = false,
        exclude = options.exclude || [],
        testName = options.name || 'Untitled',
        testing = options.debug || process.env['ENV'] == 'test',
        seleniumHost = options.remoteHost || 'ondemand.saucelabs.com',
        seleniumPort = options.remotePort || 80,
        sauceUser = options.sauceUser || process.env['SAUCE_USER'],
        sauceKey = options.sauceKey || process.env['SAUCE_KEY'];

    seleniumBrowsers.filter(function(browser) {

        return exclude.reduce(function(include, name) {

            return !(include === false || (name == browser.browserName + (browser.version ? ' ' + browser.version : '')));
        }, true);

    }).map(function(browser) {
        
        var copy = {};

        for(var property in browser)
            copy[property] = browser[property];

        copy.name = testName;

        return copy;

    }).forEach(function(browser, index) {

        if(testing && index)
            return;

        var instance = wd.remote(seleniumHost, seleniumPort, sauceUser, sauceKey),
            name = browser.browserName + (browser.version ? " " + browser.version : ''),
            ready = defer(),
            session = {
                queue: ready.promise,
                instance: instance,
                name: name,
                log: function() {
                    var args = Array.prototype.slice.call(arguments);
                    args.unshift('[ ' + name + ' ]');
                    console.log.apply(console, args);
                },
                error: function() {
                    var args = Array.prototype.slice.call(arguments);
                    args.unshift('[ ' + name + ' ]');
                    console.error.apply(console, args);
                },
                close: function(passed) {

                    var result = defer();

                    session.log("Posting status. Passed: " + passed);
                    
                    request({
                        url: 'http://' + process.env['SAUCE_USER'] + ':' + process.env['SAUCE_KEY'] + '@saucelabs.com/rest/v1/' + process.env['SAUCE_USER'] + '/jobs/' + instance.sessionID,
                        method: 'PUT',
                        json: {
                            passed: !!passed
                        }
                    }, function() {
                    
                        result.resolve();
                    })

                    return result.promise;
                }
            };

        session.fork = fork(session);

        session.log("Requesting session...");

        instance.init(browser, function(error) {
            
            if(error)
                ready.reject(error);

            session.log("Session started.");

            ready.resolve();
        });

        seleniumSessions.push(session);
    });

    seleniumMethods.forEach(function(method) {

        browser[method] = function() {

            var methodArguments = arguments;

            seleniumSessions.forEach(function(session) {

                session.queue = session.queue.then(function() {

                    return session.fork[method].apply(session.fork, methodArguments);
                });
            });

            return browser;
        }
    });

    browser.quit = function(callback) {

        callback = callback || function() {};

        seleniumSessions.forEach(function(session) {

            session.queue = session.queue.then(function() {

                session.log('Completed successfully.');

                return true;
            }, function(error) {
                
                var message = typeof error == 'string' ? error : error.sessionId ? error.value.message : error.message ? error.message : error.toString();

                testsFailed = true;

                session.error('Error!', message);

                return false;
            }).then(function(passed) {
                
                var result = defer();

                session.instance.quit(function() {

                    callback();

                    result.resolve(session.close(passed).then(function() {

                        session.log('fin.');
                    }));
                });

                return result.promise;
            });
        });

        all(seleniumSessions.map(function(session) {

            return session.queue;
        })).fin(function() {

            process.exit(testsFailed ? 1 : 0);
        });
    };

    return browser;
};
