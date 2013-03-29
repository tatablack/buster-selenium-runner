var path = require("path"),
    testCli = require("buster-test-cli");


function BusterRunner(errorHandler) {
    process.on("uncaughtException", function (err) {
        console.log('[BusterRunner process]: unhandled exception');
        errorHandler(err);
    });

    var requiredSpec;
    var availableServerUrl;

    return {
        getArguments: function() {
            return [
                '--reporter', 'quiet',
                '-c', requiredSpec,
                '-s', availableServerUrl,
                '-vv'
            ];
        },

        execute: function(spec, serverUrl, callback) {
            var busterPath = path.join(__dirname, '..', 'node_modules', 'buster', 'lib', 'buster');

            requiredSpec = spec;
            availableServerUrl = serverUrl;

            testCli.create(process.stdout, process.stderr, {
                environmentVariable: 'BUSTER_TEST_OPT',
                runners: testCli.runners,
                configBaseName: 'buster',
                extensions: {
                    browser: [
                        require(path.join(busterPath, 'framework-extension')),
                        require(path.join(busterPath, 'wiring-extension')),
                        require('buster-syntax').create({ ignoreReferenceErrors: true })
                    ]
                }
            }).run(this.getArguments(), callback);
        }
    }
}

module.exports = BusterRunner;
