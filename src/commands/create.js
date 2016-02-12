module.exports = function (projectName) {

    var fs = require("fs-extra");
    var path = require("path");
    var _ = require("underscore");
    var exec = require('child_process').exec;
    var copySmallstackFiles = require("../functions/copySmallstackFiles");

    var directory = path.join(process.cwd(), projectName);

    if (fs.existsSync(directory))
        throw new Error("Can't create new project: directory '" + projectName + "' exists!");
    fs.mkdirsSync(directory);

    var projectVersion = "0.1.0";

    function prepareFiles() {

        console.log("Preparing files...");

        // create smallstack.json
        var smallstack = {
            project: {
                name: projectName,
                version: projectVersion
            }
        }
        fs.writeJSONSync(path.join(directory, "smallstack.json"), smallstack);

        // create package.json
        var packageJSONContent = fs.readJSONSync(__dirname + "/../resources/templates/project/package.json");
        packageJSONContent.name = projectName;
        packageJSONContent.version = projectVersion;
        fs.writeJSONSync(path.join(directory, "package.json"), packageJSONContent);
        
        // create default .gitignore
        fs.copySync(__dirname + "/../resources/templates/project/default.gitignore", path.join(directory, ".gitignore"));
        console.log(' |-- Done\n');
        createMeteorApplication();
    }


    function createMeteorApplication() {
        // create meteor application
        var appDirectory = path.join(directory, 'meteor');
        console.log("Creating Meteor application in", appDirectory);
        if (fs.existsSync(appDirectory + "/.meteor/packages"))
            console.log(" |-- Meteor Application exists, skipping code generation!");
        else {
            var process = exec("meteor create meteor", {
                cwd: directory
            });
            process.stdout.on('data', function (data) {
                var lines = data.split("\n");
                _.each(lines, function (line) {
                    console.log(' |-- ' + line);
                })
            });
            process.stderr.on('data', function (data) {
                console.error(' |-- ' + data);
                throw new Error("Aborting since meteor application could not be created!");
            });
            process.on('close', function (code) {
                console.log(' |-- Done\n');
                createSmallstackFolder();
            });
        }
    }



    function createSmallstackFolder() {
        console.log("Creating smallstack files...");
        var dir = path.join(directory, "smallstack");
        fs.mkdirsSync(dir);
        copySmallstackFiles(dir);
        console.log(' |-- Done\n');
    }

    // start the chain
    prepareFiles();
}