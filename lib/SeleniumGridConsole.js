var grid = require('selenium-grid-status'),
    when = require('when'),
    http = require('http'),
    color = require('cli-color'),
    _ = require("underscore");

function SeleniumGridConsole(gridConfig) {
    var deferred = when.defer();

    process.on("uncaughtException", function (err) {
        console.log('[Grid]: unhandled exception'.red);
        deferred.reject(err);
    });

    return {
        getNodeInformation: function(sessionId) {
            var deferred = when.defer();

            http.get({
                host: gridConfig.host,
                path: '/grid/api/testsession?session=' + sessionId,
                port: gridConfig.port || 4444
            }, function(res) {
                var data = '';

                if (res.statusCode !== 200) {
                    deferred.reject('server returned status code ' + res.statusCode);
                }

                res.on('data', function(c) {
                    data += c;
                });

                res.on('end', function() {
                    deferred.resolve(data);
                });
            }).on('error', function(err) {
                deferred.reject(err);
            });

            return deferred.promise;
        },

        checkAvailability: function() {
            console.log('[Grid] Checking node availability on selected Selenium Grid (' +
                gridConfig.host + ':' + gridConfig.port + ')');

            grid.available({
                host: gridConfig.host,
                port: gridConfig.port
            }, function callMeBack(err, available) {
                if (err) {
                    deferred.reject(err);
                } else {
                    gridConfig.capabilities.forEach(function(capabilities) {
                        var filteredNodes = _.where(available, capabilities);

                        filteredNodes = _.sortBy(filteredNodes, 'host');
                        filteredNodes = _.uniq(filteredNodes, true, function(node) {
                            return node.host;
                        });

                        if (filteredNodes.length === 0) {
                            deferred.reject(
                                new Error('Unable to find nodes with the required capabilities:\n' +
                                JSON.stringify(capabilities))
                            );
                        } else {
                            console.log('[Grid] Browser %s found on grid server', color.bold(capabilities.browserName));
                        }
                    });

                    deferred.resolve();
                }
            });

            return deferred.promise;
        }
    }
}

module.exports = SeleniumGridConsole;
