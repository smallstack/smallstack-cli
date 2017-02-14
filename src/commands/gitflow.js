var fs = require("fs-extra");
var path = require("path");
var _ = require("underscore");
var exec = require("../functions/exec");
var config = require("../config");

module.exports = function (parameters) {

    if (config.isNPMPackageEnvironment())
        console.log("starting gitflow operations for NPM Package...");
    else
        throw new Error("gitflow operantions not supported in this environment!");

    if (parameters.toVersion) {
        if (!parameters.toVersion) {
            throw new Error("You must provide the version to change to via --toVersion=x.x.x!");
        }

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
        }
    }

    function replaceString(file, regex, replacement) {
        var fs = require('fs')
        var data = fs.readFileSync(file, 'utf8');
        var result = data.replace(regex, replacement);
        fs.writeFileSync(file, result, 'utf8');
    }
}
