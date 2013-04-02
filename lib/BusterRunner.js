var path = require("path"),
    fs = require('fs'),
    testCli = require("buster-test-cli");


function BusterRunner() {
    process.on("uncaughtException", function (err) {
        console.log('[BusterRunner process]: unhandled exception');
        console.dir(err);
    });

    var requiredSpec,
        availableServerUrl,
        outputFile = fs.createWriteStream('./junit-output.xml', { encoding: 'utf8', flags: 'w', mode: 0666 });

    function getArguments () {
        return [
            '--reporter', 'quiet',
            '-c', requiredSpec,
            '-s', availableServerUrl,
            '-vv'
        ];
    };

    return {
        execute: function(spec, serverUrl, callback) {
            var busterPath = path.join(__dirname, '..', 'node_modules', 'buster', 'lib', 'buster');

            requiredSpec = spec;
            availableServerUrl = serverUrl;

            var runner = testCli.create(process.stdout, process.stderr, {
                environmentVariable: 'BUSTER_TEST_OPT',
                runners: testCli.runners,
                extensions: {
                    browser: [
                        require(path.join(busterPath, 'framework-extension')),
                        require(path.join(busterPath, 'wiring-extension')),
                        require('buster-syntax').create({ ignoreReferenceErrors: true })
                    ]
                }
            });

            runner.exit = function(exitCode, callback) {
                callback(exitCode);
            }

            runner.run(getArguments(), callback);
        }
    }
}

module.exports = BusterRunner;
