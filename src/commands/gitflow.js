var fs = require("fs-extra");
var path = require("path");
var _ = require("underscore");
var exec = require("../functions/exec");
var config = require("../config");
var glob = require("glob");

module.exports = function (parameters, done) {

    if (config.isNPMPackageEnvironment() || config.isSmallstackEnvironment())
        console.log("starting gitflow operations...");
    else
        throw new Error("gitflow operations not supported in this environment!");

    if (parameters.toVersion) {

        // if (isSmallstack()) {
        //     _.each(fs.readdirSync("."), function (dir) {
        //         if (fs.statSync(dir).isDirectory() && dir.indexOf("smallstack-") === 0 && exists(dir + "/package.js")) {
        //             console.log("changing version to " + parameters.toVersion + " in this file : ", dir + "/package.js");
        //             replaceString(dir + "/package.js", /version([ :"']*)([0-9.\-A-Z]*)(['",]*)/, "version: \"" + parameters.toVersion + "\",");
        //         }
        //     });
        //     exec("git commit -a -m \"changing version to " + parameters.toVersion + "\"");
        // } else if (exists("./package.json")) {

        if (config.isNPMPackageEnvironment()) {
            exec("npm version -f --git-tag-version=false " + parameters.toVersion);
            exec("git commit -a -m \"changing version to " + parameters.toVersion + "\"");
            done();
        } else if (config.isSmallstackEnvironment()) {
            glob("**/package.json", {
                ignore: ["**/node_modules/**", "**/dist/**", "resources/projectfiles/meteor/**"]
            }, function (err, files) {
                _.each(files, function (file) {
                    var jsonContent = require(path.resolve(config.rootDirectory, file));
                    console.log("changing version of '" + jsonContent.name + "' from " + jsonContent.version + " to " + parameters.toVersion);
                    jsonContent.version = parameters.toVersion;
                    fs.writeJSONSync(file, jsonContent);
                });
                exec("git commit -a -m \"changing version to " + parameters.toVersion + "\"");
                done();
            });
        }
    }

    function replaceString(file, regex, replacement) {
        var fs = require('fs')
        var data = fs.readFileSync(file, 'utf8');
        var result = data.replace(regex, replacement);
        fs.writeFileSync(file, result, 'utf8');
    }
}
