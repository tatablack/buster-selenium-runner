var path = require("path"),
    testCli = require("buster-test-cli"),
    xmlFileReporter = require('./BusterReporter');


function BusterRunner() {
    process.on("uncaughtException", function (err) {
        console.log('[BusterRunner process]: unhandled exception');
        throw new Error(err);
    });

    var requiredSpec,
        availableServerUrl

    function getArguments () {
        return [
            '--reporter', 'xmlFileReporter',
            '-c', requiredSpec,
            '-s', availableServerUrl
        ];
    };

    return {
        execute: function(spec, serverUrl, callback) {
            var busterPath = path.join(__dirname, '..', 'node_modules', 'buster', 'lib', 'buster');

            requiredSpec = spec;
            availableServerUrl = serverUrl;

            var runner = testCli.create(
                process.stdout,
                process.stderr,
                {
                    environmentVariable: 'BUSTER_TEST_OPT',
                    runners: testCli.runners,
                    extensions: {
                        browser: [
                            require(path.join(busterPath, 'framework-extension')),
                            require(path.join(busterPath, 'wiring-extension')),
                            require('buster-syntax').create({ ignoreReferenceErrors: true })
                        ]
                    }
                }
            );

            runner.exit = function(exitCode, callback) {
                callback(exitCode);
            }

            runner.run(getArguments(), callback);
        }
    }
}

module.exports = BusterRunner;
