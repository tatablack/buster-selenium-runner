var webdriver = require('selenium-webdriver'),
    when = require('when');

function SeleniumDriver(host, port, capabilities) {
    var currentDriver;

    process.on("uncaughtException", function (err) {
        console.log('[SeleniumDriver]: unhandled exception');
        if (err && err.stack) console.log(err.stack);
    });

    webdriver.promise.controlFlow().on('uncaughtException', function(err) {
        console.log('[SeleniumDriver]: controlflow, unhandled exception');
        if (err && err.stack) console.log(err.stack);
    });

    return {
        capture: function(busterServerUrl) {
            currentDriver = new webdriver.Builder().
                usingServer('http://' + host + ':' + port + '/wd/hub').
                withCapabilities(capabilities).
                build();

            console.log('[SeleniumDriver] Asking the grid server to connect a node with %s to %s',
                capabilities.browserName, busterServerUrl);

            return this.navigate(busterServerUrl);
        },

        getCapabilities: function() {
            return capabilities;
        },

        navigate: function(url) {
            return currentDriver.get(url);
        },

        isAvailable: function() {
            return !!currentDriver;
        },

        getSession: function() {
            return currentDriver.getSession();
        },

        quit: function() {
            return currentDriver.quit();
        }
    }
}

module.exports = SeleniumDriver;
