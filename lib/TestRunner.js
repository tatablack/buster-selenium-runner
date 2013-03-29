#!/usr/bin/env node

// Loading dependencies
var nconf = require('nconf'),
    colors = require('colors'),
    Step = require('step'),
    BusterServer = require('./BusterServer'),
    BusterRunner = require('./BusterRunner'),
    SeleniumDriver = require('./SeleniumDriver'),
    SeleniumGridConsole = require('./SeleniumGridConsole');


// Initializing configuration
nconf.file({ file: './config.json' });


// Declaring and initializing variables
var gridServer = nconf.get('gridServer'),
    busterServer,
    busterRunner,
    driver;


// Make sure we clean up after ourselves
process.on("uncaughtException", function (err) {
    console.log(('\n[TestRunner process]: ' + err).red);

    if (driver) {
        driver.quit(function() {
            process.exit(1);
        });
    } else {
        process.exit(1);
    }
});


// Let's roll
Step(
    function setup() {
        busterServer = new BusterServer(this),
        busterRunner = new BusterRunner(this),
        driver = new SeleniumDriver(this);

        return true;
    },

    function safetyChecks() {
        var grid = new SeleniumGridConsole();

        grid.checkAvailability(
            gridServer.host,
            gridServer.port,
            gridServer.capabilities,
            this
        );

        console.log('...' + gridServer.capabilities.browserName.bold +
            (' found on grid server (' +
            gridServer.host + ':' + gridServer.port + ')\n').grey);
    },

    function startServer(err) {
        if (err) throw err;

        busterServer.start(this);
    },

    function captureSlave(err) {
        if (err) throw err;

        driver.capture(
            gridServer,
                busterServer.getUrl(nconf.get('busterServer').interface) +
                '/capture',
            this
        );

        console.info(('Captured ' + gridServer.capabilities.browserName + ' instance').grey);
    },

    function startTests(err) {
        if (err) throw err;

        console.info('Starting tests');

        busterRunner.execute(
            nconf.get('busterRunner').spec,
            busterServer.getUrl(nconf.get('busterServer').interface),
            this
        );
    },

    function closeBrowser(err) {
        if (err) throw err;

        console.info('About to close the browser instance..');
        driver.quit(this);
    },

    function cleanUp(err) {
        if (err) throw err;

        console.info(('Closed ' + gridServer.capabilities.browserName + ' instance').grey);

        process.exit(0);
    }
)







