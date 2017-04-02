var path = require("path");
var _ = require("underscore");
var fs = require("fs-extra");
var config = require("../config");
var modifyProductionPackageJson = require("../functions/modifyProductionPackageJson");

module.exports = function (parameters, done) {
    if (parameters && parameters.file)
        modifyProductionPackageJson(path.resolve(config.rootDirectory, parameters.file));
    else
        modifyProductionPackageJson(path.resolve(config.rootDirectory, "package.json"));
}