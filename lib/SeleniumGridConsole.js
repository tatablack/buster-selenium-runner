var grid = require('selenium-grid-status'),
    _ = require("underscore");

function SeleniumGridConsole() {
    return {
        checkAvailability: function(host, port, capabilities, callback) {
            return grid.available({
                host: host,
                port: port
            }, function(err, available) {
                if (err) throw err;

                var windowsNodes = _.where(available, capabilities);
                windowsNodes = _.sortBy(windowsNodes, 'host');
                windowsNodes = _.uniq(windowsNodes, true, function(node) {
                    return node.host;
                });

                if (windowsNodes.length === 0) {
                    console.log('Unable to find nodes with the required capabilities. Exiting.')
                    process.exit(1);
                }

                callback.apply();
            });
        }
    }
}

module.exports = SeleniumGridConsole;
