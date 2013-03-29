var path = require("path"),
    server = require("buster-server-cli"),
    Step = require('step'),
    colors = require('colors'),
    freeport = require('freeport'),
    os=require('os'),
    _ = require("underscore");


function BusterServer(errorHandler) {
    process.on("uncaughtException", function (err) {
        console.log('[BusterServer process]: unhandled exception');
        errorHandler(err);
    });

    var usedPort,
        usedAddress;

    function getArguments() {
        return ['--port', '' + usedPort]
    }

    return {
        start: function(callback) {
            Step(
                function findAvailablePort() {
                    freeport(this);
                },

                function createServer(err, availablePort) {
                    if (err) throw err;

                    console.log('Starting buster server on port '.grey + (availablePort + '').bold);

                    usedPort = availablePort;

                    var serverInstance = server.create(process.stdout, process.stderr, {
                        name: "Buster.<span>JS</span>",
                        binary: "buster-server",
                        unexpectedErrorMessage: "Something went horribly wrong. This is most likely " +
                                                "a bug, please report at\n" +
                                                "http://github.com/busterjs/buster/issues\n"
                    });

                    serverInstance.run(getArguments(), callback);
                }
            )
        },

        getUrl: function(iface) {
            return 'http://' +
                this.getIpAddressFor(iface) +
                ':' + this.getPort();
        },

        getPort: function() {
            return usedPort;
        },

        getAddress: function() {
            return usedAddress;
        },

        getIpAddressFor: function(iface) {
            var interfaces = os.networkInterfaces();

            if (!interfaces[iface]) throw new Error('The requested network interface (' + iface + ') is not available');

            return _.where(interfaces[iface], { family: 'IPv4'} )[0].address;
        }
    }
}

module.exports = BusterServer;
