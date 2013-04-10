var path = require("path"),
    testCli = require("buster-test-cli"),
    xmlFileReporter = require('./BusterReporter');


function BusterRunner(outputFilePath) {
    new xmlFileReporter(outputFilePath);

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
            process.on("uncaughtException", function (err) {
                callback.call(this, err);
            });

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
                console.log('[BusterRunner] Closing runner for %s', outputFilePath);
                callback(exitCode);
            }

            try {
                runner.run(getArguments(), callback);
            } catch (err) {
                callback(err);
            }
        }
    }
}

module.exports = BusterRunner;
