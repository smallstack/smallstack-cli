module.exports = function (parameters, done) {

    var fs = require("fs-extra");
    var path = require("path");
    var _ = require("underscore");
    var exec = require('../functions/exec');

    var projectName = parameters.name;

    if (!projectName)
        throw new Error("Please provide a project name via --name!");

    var directory = path.join(process.cwd(), projectName);

    if (fs.existsSync(directory))
        throw new Error("Can't create new project: directory '" + projectName + "' exists!");
    fs.mkdirsSync(directory);

    var projectVersion = "0.1.0";

    console.log("Preparing files...");

    // create package.json
    var packageJSONContent = fs.readJSONSync(__dirname + "/../resources/templates/project/package.json");
    packageJSONContent.name = projectName;
    packageJSONContent.version = projectVersion;
    packageJSONContent.smallstack = {};
    fs.writeJSONSync(path.join(directory, "package.json"), packageJSONContent);

    // create default .gitignore
    fs.copySync(__dirname + "/../resources/templates/project/default.gitignore", path.join(directory, ".gitignore"));
    console.log(' |-- Done\n');

    // create meteor application
    var appDirectory = path.join(directory, 'meteor');
    console.log("Creating Meteor application in", appDirectory);
    if (fs.existsSync(appDirectory + "/.meteor/packages")) {
        console.log(" |-- Meteor Application exists, skipping code generation!");
        done();
    }
    else {
        exec("meteor create app", {
            cwd: directory,
            finished: function () {
                fs.renameSync(path.join(directory, "app"), path.join(directory, "meteor"));
                done();
            }
        });
    }
}