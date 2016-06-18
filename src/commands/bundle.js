module.exports = function (projectName) {

    var config = require('../config')
    var path = require("path");
    var _ = require("underscore");
    var fs = require("fs-extra");
    var exec = require('child_process').exec;

    fs.removeSync(path.join(config.builtDirectory, "meteor.tar.gz"));

    console.log("Creating bundle in directory : ", config.builtDirectory);

    var process = exec("meteor build " + path.relative(config.meteorDirectory, config.builtDirectory) + " --architecture os.linux.x86_64", {
        cwd: config.meteorDirectory
    });
    process.stdout.on('data', function (data) {
        var lines = data.split("\n");
        _.each(lines, function (line) {
            console.log(' |-- ' + line);
        });
    });
    process.stderr.on('data', function (data) {
        console.error(' |-- ' + data);
        throw new Error("Aborting since meteor bundle could not be created!");
    });
    process.on('close', function (code) {
        console.log(' |-- Bundling done!\n');
    });

}