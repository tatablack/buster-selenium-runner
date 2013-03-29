var webdriver = require('selenium-webdriver'),
    colors = require('colors');

function SeleniumDriver(errorHandler) {
    var currentDriver;

    process.on("uncaughtException", function (err) {
        console.log('[SeleniumDriver process]: unhandled exception'.red);
        errorHandler(err);
    });

    webdriver.promise.controlFlow().on('uncaughtException', function(err) {
        console.error('[SeleniumDriver controlFlow]: unhandled exception'.red);
        errorHandler(err);
    });

    return {
        capture: function(gridServer, busterServerUrl, callback) {
            currentDriver = new webdriver.Builder().
                usingServer('http://' + gridServer.host + ':' + gridServer.port + '/wd/hub').
                withCapabilities(gridServer.capabilities).
                build();

            console.log('Asking the Selenium node to connect to ' + busterServerUrl);

            currentDriver.get(busterServerUrl).
                then(callback);
        },

        quit: function(callback) {
            if (!currentDriver) {
                callback();
            } else {
                currentDriver.quit().then(callback);
            }
        }
    }
}

module.exports = SeleniumDriver;
