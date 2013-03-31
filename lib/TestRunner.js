#!/usr/bin/env node

// Loading dependencies
var nconf = require('nconf'),
    color = require('cli-color'),
    when = require('when'),
    Step = require('step'),
    util = require('util'),
    domain = require('domain'),
    BusterServer = require('./BusterServer'),
    BusterRunner = require('./BusterRunner'),
    SeleniumDriver = require('./SeleniumDriver'),
    SeleniumGridConsole = require('./SeleniumGridConsole');


console.log('\n%s', color.bgBlue.white('Application started'));

// Declaring and initializing variables
var gridConfig,
    grid,
    webdriver,
    busterServer,
    busterRunner;

//var applicationDomain = domain.create();
//
//applicationDomain.on('error', function(err) {
//    console.dir(err);
//    shutdown(err);
//});



// Let's roll
Step(
    function setup() {
        // Initializing configuration
        nconf.file({ file: './config.json' });

        gridConfig = nconf.get('gridConfig');
        grid = new SeleniumGridConsole(gridConfig);
        webdriver = new SeleniumDriver(gridConfig);
        busterServer = new BusterServer(nconf.get('busterServer').interface);
        busterRunner = new BusterRunner();

        return true;
    },

    function safetyChecks() {
        when(
            grid.checkAvailability(),
            this,
            function(reason) {
                console.error(color.bold(reason.message));
                process.exit(1);
            }
        );
    },

    function startServer() {
        when(
            busterServer.start(),
            this,
            function serverNotStarted(reason) {
                console.error(color.bold(reason));
                process.exit(1);
            }
        );
    },

    function captureSlave() {
        var busterServerUrl = busterServer.getUrl(nconf.get('busterServer').interface) + '/capture';

        when(
            webdriver.capture(gridConfig, busterServerUrl),

            this,
            function urlNotCaptured() {
                console.error('whoops');
            }
        );
    },

    function getWebdriverSession() {
        webdriver.getSession().then(
            this,
            function sessionNotRetrieved() {
                console.info('problem when retrieving session');
            }
        );
    },

    function getNodeInformation(session) {
        when(
            grid.getNodeInformation(session.id),
            this,
            function nodeInformationNotRetrieved() {
                throw new Error('unable to retrieve grid node information.')
            }
        );
    },

    function showNodeInformation(result) {
        var nodeInformation = JSON.parse(result);

        if (nodeInformation.success === true) {
            console.info(
                '[TestRunner] Captured %s instance on node %s',
                gridConfig.capabilities.browserName,
                nodeInformation.proxyId
            );

            return true;
        } else {
            throw new Error('grid node information unavailable.')
        }
    },

    function startTests(err) {
        console.log('[TestRunner] Starting tests');

        busterRunner.execute(
            nconf.get('busterRunner').spec,
            busterServer.getUrl(nconf.get('busterServer').interface),
            this
        );
    },

    function shutdown(err) {
        if (err) {
            console.log('\nAn unexpected error occurred: %s', color.red(err.message ? err.message : err));
        }

        if (webdriver && webdriver.isAvailable()) {
            console.log('\n[TestRunner] About to quit the browser instance')

            when(
                webdriver.quit(),
                function() {
                    console.log(color.bgBlue.white('Application terminated'));
                    process.exit(err ? 10 : 0);
                },
                function() {
                    console.log('beh');
                }
            );
        } else {
            console.log('\nBoh');
            console.log(color.bgBlue.white('Application terminated'));
            process.exit(err ? 10 : 0);
        }
    }
);
