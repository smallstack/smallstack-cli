var config = require("../config");
var syncRequest = require("sync-request");
var semver = require("semver");
var colors = require("colors");

module.exports = function () {

    try {
        var url = "https://raw.githubusercontent.com/smallstack/smallstack-cli/master/package.json";
        var response = syncRequest("GET", url, { timeout: 1000 });
        var packageJSON = JSON.parse(response.body);

        if (semver.lt(config.cli.version, packageJSON.version)) {
            console.log(colors.green("***********************************************************************"));
            console.log(colors.green("*                   New Version available :"), colors.green.bold(packageJSON.version), colors.green("                    *"));
            console.log(colors.green("* Call 'npm install -g smallstack-cli' to install the latest version! *"));
            console.log(colors.green("***********************************************************************"));
        }

    } catch (e) {
        console.error("Error while checking for updates :", e);
    }

}