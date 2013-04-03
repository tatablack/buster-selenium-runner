var path = require("path"),
    server = require("buster-server-cli"),
    Step = require('step'),
    when = require('when'),
    color = require('cli-color'),
    freeport = require('freeport'),
    os = require('os'),
    _ = require("underscore");


function BusterServer(networkInterface) {
    var usedPort,
        usedAddress,
        networkInterface = networkInterface,
        ipAddress = getIpAddressFor(networkInterface);

    function getArguments() {
        return [
            '--port', '' + usedPort,
            '--binding', getIpAddressFor(networkInterface)
        ]
    }

    function getIpAddressFor(iface) {
        var interfaces = os.networkInterfaces(),
            requestedInterface = _.where(interfaces[iface], { family: 'IPv4'} );

        if (!interfaces[iface]) throw new Error('[BusterServer]: the requested network interface (' + iface + ') is not available. Check your config.json file.');

        return requestedInterface[0].address;
    }

    function findAvailablePort() {
        var deferred = when.defer();

        freeport(function(err, availablePort) {
            deferred.resolve(availablePort);
        });

        return deferred.promise;
    }

    return {
        start: function() {
            var deferred = when.defer();

            when(
                findAvailablePort(),
                function(availablePort) {
                    usedPort = availablePort;
                    console.log('[BusterServer] Starting buster server on port %d', usedPort);

                    var serverInstance = server.create(
                        process.stdout,
                        process.stderr,
                        {
                            name: "Buster.JS",
                            binary: "buster-server",
                            unexpectedErrorMessage: "Something went horribly wrong."
                        }
                    );

                    serverInstance.run(getArguments(), function(err) {
                        if (err) {
                            deferred.reject(err);
                        } else {
                            deferred.resolve();
                        }
                    });
                },

                function() {
                    deferred.reject('unable to find an available port');
                }
            )

            return deferred.promise;
        },

        getUrl: function() {
            return 'http://' + ipAddress + ':' + this.getPort();
        },

        getPort: function() {
            return usedPort;
        },

        getAddress: function() {
            return usedAddress;
        }
    }
}

module.exports = BusterServer;
