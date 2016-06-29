module.exports = function (parameters) {

    var fs = require("fs-extra");
    var path = require("path");
    var _ = require("underscore");
    var exec = require("../functions/exec");

    if (isSmallstack())
        console.log("starting gitflow operations for smallstack framework...")

    if (parameters.changeVersion || parameters.toVersion) {
        if (!parameters.toVersion) {
            throw new Error("You must provide the version to change to via --toVersion=x.x.x!");
        }

        if (isSmallstack()) {
            _.each(fs.readdirSync("."), function (dir) {
                if (fs.statSync(dir).isDirectory() && dir.indexOf("smallstack-") === 0 && exists(dir + "/package.js")) {
                    console.log("changing version to " + parameters.toVersion + " in this file : ", dir + "/package.js");
                    replaceString(dir + "/package.js", /version([ :"']*)([0-9.\-A-Z]*)(['",]*)/, "version: \"" + parameters.toVersion + "\",");
                }
            });
            exec("git commit -a -m \"changing version to " + parameters.toVersion + "\"");
        }
    }


    function isSmallstack() {
        return exists("smallstack-core");
    }

    function isProject() {

    }

    function exists(fileOrDirectory) {
        try {
            fs.statSync(fileOrDirectory);
            return true;
        } catch (e) {
            return false;
        }
    }

    function replaceString(file, regex, replacement) {
        var fs = require('fs')
        var data = fs.readFileSync(file, 'utf8');
        var result = data.replace(regex, replacement);
        fs.writeFileSync(file, result, 'utf8');
    }
}