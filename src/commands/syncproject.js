var config = require('../Config').Config;
var path = require("path");
var _ = require("underscore");
var fs = require("fs-extra");
var exec = require('../functions/exec');

module.exports = function (parameters, done) {

    if (!config.isProjectEnvironment())
        throw new Error("You're not inside a smallstack project folder!");

    // copy folder
    console.log("Syncing project files...");
    fs.copySync(path.join(config.cliResourcesPath, "projectfiles"), config.rootDirectory);

    if (typeof done === "function")
        done();
}
