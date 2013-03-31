var webdriver = require('selenium-webdriver'),
    when = require('when');

function SeleniumDriver(errorHandler) {
    var currentDriver;

    process.on("uncaughtException", function (err) {
        console.log('[SeleniumDriver]: unhandled exception');
        console.dir(err);
    });

    webdriver.promise.controlFlow().on('uncaughtException', function(err) {
        console.error('[SeleniumDriver]: controlflow, unhandled exception');
        console.dir(err);
    });

    return {
        capture: function(gridServer, busterServerUrl) {
            currentDriver = new webdriver.Builder().
                usingServer('http://' + gridServer.host + ':' + gridServer.port + '/wd/hub').
                withCapabilities(gridServer.capabilities).
                build();

            console.log('\n[SeleniumDriver] Asking the Selenium node to connect to %s', busterServerUrl);

            return this.navigate(busterServerUrl);
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
