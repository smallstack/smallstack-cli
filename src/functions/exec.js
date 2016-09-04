module.exports = function (command, options) {

    options = options || {};

    var execSync = require('child_process').execSync;
    var _ = require("underscore");
    var config = require("../config");

    console.log("executing : ", command);


    var process = execSync(command, {
        cwd: options.cwd || config.rootDirectory,
        stdio: 'inherit'
    });

    if (options.finished)
        options.finished();

}