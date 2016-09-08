module.exports = function (parameters, done) {

    var config = require('../config')
    var path = require("path");
    var _ = require("underscore");
    var fs = require("fs-extra");
    var exec = require('../functions/exec');

    if (!config.projectFound())
        throw new Error("You're not inside a smallstack project folder!");

    fs.removeSync(path.join(config.builtDirectory, "meteor.tar.gz"));

    console.log("Creating bundle in directory : ", config.builtDirectory);

    exec("meteor build " + path.relative(config.meteorDirectory, config.builtDirectory) + " --architecture os.linux.x86_64 --server-only", {
        cwd: config.meteorDirectory,
        finished: function () {
            done();
        }
    });

}