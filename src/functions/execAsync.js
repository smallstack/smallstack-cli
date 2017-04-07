module.exports = function (command, options) {

    options = options || {};

    var exec = require('child_process').exec;
    var _ = require("underscore");
    var config = require("../config");

    console.log("executing : ", command);


    var process = exec(command, {
        cwd: options.cwd || config.rootDirectory,
        stdio: 'pipe'
    });

    if (options.finished)
        options.finished();

    return process;

}
