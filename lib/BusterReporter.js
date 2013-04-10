var buster = require("buster-core"),
    fs = require('fs'),
    reporters = reporters = require('../node_modules/buster-test-cli/node_modules/buster-test').reporters;


function xmlFileReporter(outputFilePath) {
    var outputFile = fs.createWriteStream(outputFilePath, { encoding: 'utf8', flags: 'w', mode: 0666 }),
        xmlFileReporter = reporters.load('xml');

    var io = {
        puts: function(str) {
            outputFile.write(str + '\n');
        },

        print: function(str) {
            outputFile.write(str);
        }
    }

    xmlFileReporter.create = function(opt) {
        return buster.extend(buster.create(this), {
            io: io,
            uncaught: []
        });
    };


    reporters.xmlFileReporter = xmlFileReporter;
}

module.exports = xmlFileReporter;
