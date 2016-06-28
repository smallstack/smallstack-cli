module.exports = function (parameters) {

    var config = require('../config')
    var path = require("path");
    var _ = require("underscore");
    var fs = require("fs-extra");
    var exec = require('../functions/exec');

    fs.removeSync(path.join(config.builtDirectory, "meteor.tar.gz"));

    console.log("Creating bundle in directory : ", config.builtDirectory);

    if (!parameters.server)
        throw new Error("Please set --server!");

    exec("meteor build " + path.relative(config.meteorDirectory, config.builtDirectory) + " --architecture os.linux.x86_64 --server " + parameters.server, {
        cwd: config.meteorDirectory
    });

}