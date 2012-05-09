# Burnout

Burnout is an asynchronous, chainable and DRY interface for building Selenium 2 WebDriver scripts in Node. It was written primarily for interfacing with Sauce Labs, but it should work with most Selenium 2 setups. Burnout builds on top of the excellent Selenium 2 WebDriver library [wd][1].

## Installing

```sh
npm install burnout
```

## Using

Burnout's API strives to map as closely as possible to the interface exposed by [wd][1], which in turn maps closely to the Selenium [JSON Wire Protocol][2].

An example test:

```javascript
var burnout = require('burnout'),
    assert = require('assert'); // Your assertion utility of choice here

burnout
    .initialize({ 
        name: "CloudFlare - Rocket Loader Optimization" // Test name
    })
    // Start chaining commands..
    .eval("document.title", function(title) {

        assert(title == '');
    })
    // Chained commands are guaranteed to run synchronously
    .elementByCss("#NextPageLink", function(link) {

        // The context of callbacks can be used to promise sub-commands
        return this.moveTo(link, 2, 2, function() {

            return this.click(link)
        });
    })
    // End the test. Status automatically posted to Sauce Labs.
    .quit();
```

## API

These are the methods currently exposed by Burnout:

```javascript
var seleniumMethods = [
    'init',
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
    'close',
    'setImplicitWaitTimeout',
    'setAsyncScriptTimeout',
    'moveTo',
    'scroll',
    'text',
    'buttonDown',
    'buttonUp',
    'active',
    'keyToggle'
];
```

## Browsers

Burnout uses a hardcoded selection of browsers when running tests. Exclusions to this selection are currently supported, but not additions. This will change as I get a feel for how people are using the library, but for my immediate purposes I wanted tests to be inclusive by default.

These are the browsers that Burnout tests by default:

```javascript
var seleniumBrowsers = [
    {
        browserName: "googlechrome"
    },
    {
        browserName: "firefox",
        version: "11",
        platform: "XP"
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
];
```

If you want to exclude specific browsers from you test, you can specify them when you initialize Burnout:

```javascript
burnout
    .initialize({
        name: "Foo test.",
        exclude: [
            "iexplore 6",
            "firefox 3.6"
        ]
    })
    // etc..
```

If you just want to sanity check your code, you can set an environment variable when running your tests:

```sh
# If $ENV is set to test, only Google Chrome will be tested
ENV=test node ./path/to/selenium-suite.js
```

Alternatively, you can set 'debug' to true when initializing Burnout:

```javascript
burnout
    .initialize({ 
        name: "Foo test.", 
        debug: true 
    })
    // etc..
```

## Sauce Labs

Burnout accepts Sauce Labs account information as environment variables:

```sh
SAUCE_USER=foo SAUCE_KEY=123-456-789 node ./path/to/selenium-suite.js
```

Or as options in the call to initialize:

```javascript
burnout
    .initialize({
        name: "Foo test.",
        sauceUser: "foo",
        sauceKey: "123-456-789"
    })
    // etc..
```

## Non-Sauce Labs Environments

Burnout also accepts

```javascript
burnout
    .initialize({
        name: "Foo test.",
        remoteHost: "ondemand.saucelabs.com",
        remotePort: 80
    })
    // etc..
```

[1]: http://github.com/admc/wd
[2]: http://code.google.com/p/selenium/wiki/JsonWireProtocol
