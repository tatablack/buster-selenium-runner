#!/usr/bin/env node

// Loading dependencies
var nconf = require('nconf'),
    color = require('cli-color'),
    when = require('when'),
    pipeline = require('when/pipeline'),
    nodefn = require("when/node/function");
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
    webdrivers,
    busterServer,
    busterRunner;

//var applicationDomain = domain.create();
//
//applicationDomain.on('error', function(err) {
//    console.dir(err);
//    shutdown(err);
//});


var resultsPromise = pipeline([
    function setup() {
        var setupDeferred = when.defer();

        // Initializing configuration
        nconf.file({ file: './config.json' });

        gridConfig = nconf.get('gridConfig');
        grid = new SeleniumGridConsole(gridConfig);
        webdrivers = [],
        busterServer = new BusterServer(nconf.get('busterServer').interface);
        busterRunner = new BusterRunner();

        gridConfig.capabilities.forEach(function(capabilities) {
            webdrivers[webdrivers.length] = new SeleniumDriver(gridConfig.host, gridConfig.port, capabilities);
        }, this);

        setupDeferred.resolve();
        return setupDeferred.promise;
    },

    function safetyChecks() {
        return when(
            grid.checkAvailability(),
            function() {
                console.log('availability checked');
            },
            function(reason) {
                console.error(color.bold(reason.message));
                process.exit(1);
            }
        );
    },

    function startServer() {
        return when(
            busterServer.start(),
            function() {
                console.log('Server started');
            },
            function serverNotStarted(reason) {
                console.error(color.bold(reason));
                process.exit(1);
            }
        );
    },

    function captureSlave() {
        var busterServerUrl = busterServer.getUrl(nconf.get('busterServer').interface) + '/capture';

        var capturedDeferred = [];

        webdrivers.forEach(function captureBrowser(webdriver) {
            capturedDeferred[capturedDeferred.length] = when(
                webdriver.capture(busterServerUrl),
                function() {
                    console.log('captured');
                },
                function urlNotCaptured() {
                    throw new Error('[TestRunner] Unable to capture url');
                }
            );
        });

        return when.all(capturedDeferred);
    },

    function getWebdriverSession() {
        var sessionDeferred = [];

        console.log('getWebdriverSession');

        webdrivers.forEach(function captureBrowser(webdriver) {
            sessionDeferred[sessionDeferred.length] = when(
                webdriver.getSession(),
                function(session) {
                    console.log('session retrieved');
                    return session;
                },
                function sessionNotRetrieved() {
                    throw new Error('[TestRunner] problem when retrieving session');
                }
            );
        });

        return when.all(sessionDeferred);
    },

    function getNodeInformation(sessions) {
        var nodeInfoDeferred = [];

        sessions.forEach(function(session) {
            nodeInfoDeferred[nodeInfoDeferred.length] = when(
                grid.getNodeInformation(session.id),
                function(nodeInformation) {
                    console.log('nodeinfo retrieved');
                    nodeInformation = JSON.parse(nodeInformation);
                    nodeInformation.browserName = session.capabilities.browserName;
                    return nodeInformation;
                },
                function nodeInformationNotRetrieved() {
                    throw new Error('[TestRunner] unable to retrieve grid node information.')
                }
            );
        });

        return when.all(nodeInfoDeferred);
    },

    function showNodeInformation(results) {
        var resultDeferred = [];

        results.forEach(function(nodeInformation) {
            if (nodeInformation.success === true) {
                console.info(
                    '[TestRunner] Captured %s instance on node %s',
                    nodeInformation.browserName,
                    nodeInformation.proxyId
                );

                resultDeferred[resultDeferred.length] = when.resolve();
            } else {
                throw new Error('[TestRunner] grid node information unavailable.')
            }
        });

        return when.all(resultDeferred);
    },

    function startTests() {
        console.log('[TestRunner] Starting tests');

        return when(
            nodefn.call(
                busterRunner.execute,
                nconf.get('busterRunner').spec,
                busterServer.getUrl(nconf.get('busterServer').interface)
            ),
            function() {
                console.log('started');
            },
            function(err) {
                console.dir(err);
            }
        );
    },

    function shutdown(err) {
        if (err) {
            console.log('\n[TestRunner] An unexpected error occurred: %s', color.red(err.message ? err.message : err));
        }

        console.log('about to shutdown');

        var webdriversDeferred = [];

        webdrivers.forEach(function captureBrowser(webdriver) {
            if (webdriver.isAvailable()) {
                console.log('\n[TestRunner] About to quit the browser instance')

                webdriversDeferred[webdriversDeferred.length] = when(
                    webdriver.quit(),
                    function() {
                        console.info('webdriver terminated');
                    },
                    function() {
                        throw new Error('[TestRunner] unable to terminate webdriver');
                    }
                );
            } else {
                console.log('[TestRunner] webdriver unavailable');
                webdriversDeferred[webdriversDeferred.length] = true;
            }
        });

        return when.all(webdriversDeferred);
    },

    function shutdown() {
        console.log(color.bgBlue.white('Application terminated'));
    }
]);
