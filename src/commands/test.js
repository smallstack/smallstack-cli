var config = require('../Config').Config;
var path = require("path");
var _ = require("underscore");
var fs = require("fs-extra");
var execSync = require('child_process').execSync;
var execAsync = require("../functions/execAsync");
var spawn = require('child_process').spawn;

module.exports = function (parameters, done) {
    if (config.isProjectEnvironment()) {
        testProject(parameters);
    } else throw new Error("Unsupported Environment!");
}


function testProject(params) {
    var testDirectory = config.meteorTestsDirectory;

    if (fs.existsSync(path.join(testDirectory, "acceptance-tests.js"))) {

        var meteorProcess = startMeteor(function () {
            try {
                execSync("node acceptance-tests.js", {
                    cwd: testDirectory
                });
            } catch (e) {
                console.error(e);
            } finally {
                console.log("Killing meteor instance...");
                meteorProcess.kill("SIGINT");
            }
        });
    } else {
        console.log("No acceptance-tests.js file found in " + testDirectory + "!");
    }
}


function startMeteor(onStartedCallback) {

    console.log('Starting Meteor in Test Mode...');
    var meteorProcess = execAsync(
        "meteor test --raw-logs --full-app --driver-package tmeasday:acceptance-test-driver", {
            cwd: config.meteorDirectory
        }
    );

    meteorProcess.stderr.pipe(process.stderr);
    meteorProcess.stdout.on('data', function (data) {
        var line = data.toString();
        process.stdout.write("meteor : " + data);
        if (line.indexOf('App running at') !== -1) {
            if (typeof onStartedCallback === "function")
                onStartedCallback();
        }

        // watch for Meteor error messages
        if (line.indexOf('Your application is crashing') !== -1) {
            meteorProcess.kill('SIGINT');
            process.exit(1);
        }

    });

    meteorProcess.on('exit', function (code) {
        process.exit(code);
    });

    return meteorProcess;

}
