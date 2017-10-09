module.exports = function (command, options) {

    options = options || {};

    var execSync = require('child_process').execSync;
    var _ = require("underscore");
    var config = require("../Config").Config;
    var cwd = options.cwd || config.rootDirectory;

    console.log("executing : ", (options && options.commandString) ? options.commandString : command);
    console.log("  |- CWD : ", cwd);


    var process = execSync(command, {
        cwd: cwd,
        stdio: 'inherit'
    });

    if (options.finished)
        options.finished();

}