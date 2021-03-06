#!/usr/bin/env node

// Loading dependencies
var nconf = require('nconf'),
    color = require('cli-color'),
    when = require('when'),
    fs = require('fs'),
    path = require('path'),
    pipeline = require('when/pipeline'),
    sequence = require('when/sequence'),
    nodefn = require("when/node/function");
    BusterServer = require('./BusterServer'),
    BusterRunner = require('./BusterRunner'),
    SeleniumDriver = require('./SeleniumDriver'),
    SeleniumGridConsole = require('./SeleniumGridConsole');

// Declaring and initializing variables
var gridConfig,
    grid,
    webdrivers,
    busterServer,
    busterRunner,
    configPath = '',
    exitStatus = 0;


console.log('\n%s', color.bgBlue.white('Application started (node.js ' + process.version + ')'));
console.log('\n');

pipeline([
    function setup() {
        var setupDeferred = when.defer();

        // Initializing configuration
        nconf.argv();

        // If the --config command line parameter was passed,
        // it must be the absolute path to a different config file
        var customConfiguration = nconf.get('config');

        if (customConfiguration && fs.existsSync(customConfiguration)) {
            nconf.file(customConfiguration);
            configPath = path.dirname(customConfiguration);
        }


        // Let's load the default configuration. Any values already present
        // in the custom configuration file will NOT be overridden.
        nconf.defaults(
            JSON.parse(fs.readFileSync('config.json').toString('utf8'))
        );


        // We can already check whether spec files have been passes, and exist.
        if (!nconf.get('busterRunner')
            || !nconf.get('busterRunner').specs) {
//            || (!fs.existsSync(path.join(configPath, nconf.get('busterRunner').spec))) ) {

            throw new Error('setup: no spec file found. Check your configuration.')
        }


        // If the output folder exists, remove it, otherwise create it
        var resultsFolder = path.join(configPath, 'test-results');

        if (!fs.existsSync(resultsFolder)) {
            fs.mkdirSync(resultsFolder);
        } else {
            when(
                nodefn.call(fs.readdir, resultsFolder),
                function(files) {
                    files.forEach(function(file) {
                        fs.unlinkSync(file);
                    });

                    fs.rmdir(resultsFolder);
                }
            );
        }


        // Component initialization
        gridConfig = nconf.get('gridConfig');
        grid = new SeleniumGridConsole(gridConfig);
        busterServer = new BusterServer(nconf.get('busterServer').interface);
        webdrivers = [];


        // Initialize an array of webdriver instances
        gridConfig.capabilities.forEach(function(capabilities) {
            webdrivers[webdrivers.length] = new SeleniumDriver(
                gridConfig.host,
                gridConfig.port,
                capabilities
            );
        }, this);

        setupDeferred.resolve();

        return setupDeferred.promise;
    },

    function safetyChecks() {
        var gridChecksDeferred = when.defer();

        when(
            grid.checkAvailability(),

            function() {
                gridChecksDeferred.resolve();
            },

            function(reason) {
                gridChecksDeferred.reject('[TestRunner] > [Grid] ' + reason);
            }
        );

        return gridChecksDeferred.promise;
    },

    function startServer() {
        var busterStartDeferred = when.defer();

        when(
            busterServer.start(),

            function() {
                console.log('[TestRunner] > [BusterServer] Server started');
                busterStartDeferred.resolve();
            },

            function serverNotStarted(reason) {
                busterStartDeferred.reject('[BusterServer]: ' + reason);
            }
        );

        return busterStartDeferred.promise;
    },

    function captureSlave() {
        var busterServerUrl = busterServer.getUrl(nconf.get('busterServer').interface) + '/capture';

        var capturedDeferred = [];

        webdrivers.forEach(function captureBrowser(webdriver) {
            capturedDeferred[capturedDeferred.length] = when(
                webdriver.capture(busterServerUrl),

                function() {},

                function urlNotCaptured() {
                    throw new Error('[TestRunner] Unable to capture url');
                }
            );
        });

        return when.all(capturedDeferred);
    },

    function getWebdriverSession() {
        var sessionDeferred = [];

        webdrivers.forEach(function captureBrowser(webdriver) {
            sessionDeferred[sessionDeferred.length] = when(
                webdriver.getSession(),

                function(session) {
                    console.log('[TestRunner] Found session with id %s', session.id);
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
                    console.log('[TestRunner] Retrieved node information for %s', session.capabilities.browserName);
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
                console.log(
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

    function runTests() {
        console.log('[TestRunner] Starting tests...');

        var runTasks = [],
            resultsFolder = path.join(configPath, 'test-results');

        nconf.get('busterRunner').specs.forEach(function(spec) {
            runTasks[runTasks.length] = (function(spec, index) {
                return function() {
                    var busterRunner = new BusterRunner(path.join(resultsFolder, 'junit-output-' + index + '.xml'));

                    return when(
                        nodefn.call(
                            busterRunner.execute,
                            path.join(configPath, spec),
                            busterServer.getUrl(nconf.get('busterServer').interface)
                        ),

                        undefined,

                        function(exitCode) {
                            console.log(color.red('[BusterRunner] Probably a test failed; check the XML output. Error code: ' + exitCode));
                        }
                    )
                }
            })(spec, runTasks.length);
        });

        return sequence(runTasks);
    }
]).then(
    undefined,
    function(err) {
        console.log(color.bgRed.white('[TestRunner] An unexpected error occurred in %s'), (err.message ? err.message : err));
        if (err && err.stack) console.log(err.stack);
        exitStatus = 1;
    }
).ensure(
    function shutdown() {
        var webdriversDeferred = [];

        webdrivers.forEach(function captureBrowser(webdriver) {
            if (webdriver.isAvailable()) {
                console.log('[TestRunner] About to quit a browser instance');

                webdriversDeferred[webdriversDeferred.length] = when(
                    webdriver.quit(),
                    function() {
                        console.log('[TestRunner] Webdriver connection terminated');
                    },
                    function() {
                        throw new Error('[TestRunner] unable to terminate webdriver');
                    }
                );
            } else {
                webdriversDeferred[webdriversDeferred.length] = true;
            }
        });

        return when.all(webdriversDeferred);
    }
).ensure(
    function() {
        console.log('\n%s', color.bgBlue.white('Application terminated'));
        process.exit(exitStatus);
    }
);
