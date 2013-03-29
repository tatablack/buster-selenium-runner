var grid = require('selenium-grid-status'),
    colors = require('colors'),
    _ = require("underscore");

function SeleniumGridConsole() {
    return {
        checkAvailability: function(host, port, capabilities, callback) {
            console.log('\nChecking node availability on selected Selenium Grid...'.grey);

            return grid.available({
                host: host,
                port: port
            }, function(err, available) {
                if (err) throw err;

                var filteredNodes = _.where(available, capabilities);
                filteredNodes = _.sortBy(filteredNodes, 'host');
                filteredNodes = _.uniq(filteredNodes, true, function(node) {
                    return node.host;
                });

                if (filteredNodes.length === 0) {
                    console.log('Unable to find nodes with the required capabilities. Exiting.')
                    process.exit(1);
                }

                callback();
            });
        }
    }
}

module.exports = SeleniumGridConsole;
