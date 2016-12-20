var config = require("../config");
var request = require("request");
var semver = require("semver");
var colors = require("colors");

module.exports = {
    "newVersion": undefined,
    "asyncCallback": undefined,
    "doCheck": function () {
        var checker = this;
        try {
            var url = "https://raw.githubusercontent.com/smallstack/smallstack-cli/master/package.json";
            this.request = request(url, function (error, response, body) {
                var packageJSON = JSON.parse(body);
                if (semver.lt(config.cli.version, packageJSON.version)) {
                    checker.newVersion = packageJSON.version
                }
                if (checker.asyncCallback)
                    checker.asyncCallback();
            });
        } catch (e) {
            console.error("Error while checking for updates :", e);
        }
    },
    "showResult": function (done) {
        if (this.newVersion) {
            console.log(" ");
            console.log(colors.green("***********************************************************************"));
            console.log(colors.green("*                   New Version available :"), colors.green.bold(this.newVersion), colors.green("                    *"));
            console.log(colors.green("* Call 'npm install -g smallstack-cli' to install the latest version! *"));
            console.log(colors.green("***********************************************************************"));
            if (typeof done === 'function')
                done();
        } else {
            var checker = this;
            this.asyncCallback = function () {
                checker.showResult();
                if (typeof done === 'function')
                    done();
            };
        }
    }
}
