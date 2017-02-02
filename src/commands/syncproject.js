var config = require('../config')
var path = require("path");
var _ = require("underscore");
var fs = require("fs-extra");
var exec = require('../functions/exec');

module.exports = function (parameters, done) {

    if (!config.isProjectEnvironment())
        throw new Error("You're not inside a smallstack project folder!");

    // copy folder
    fs.copySync(path.join(config.cliResourcesPath, "projectfiles"), config.rootDirectory);
    done();

}
