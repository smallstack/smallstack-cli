module.exports = function (projectName) {

    var fs = require("fs-extra");
    var path = require("path");
    var exec = require('child_process').exec;

    if (fs.existsSync("smallstack.json"))
        throw new Error("Can't create new project: smallstack.json found!");

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
        fs.writeJSONSync("smallstack.json", smallstack);

        // create package.json
        var packageJSONContent = fs.readJSONSync(__dirname + "/../generator/resources/templates/project/package.json");
        packageJSONContent.name = projectName;
        packageJSONContent.version = projectVersion;
        fs.writeJSONSync("package.json", packageJSONContent);
        
        // create default .gitignore
        fs.copySync(__dirname + "/../generator/resources/templates/project/default.gitignore", ".gitignore");

        createMeteorApplication();
    }


    function createMeteorApplication() {
        // create meteor application
        console.log("Creating Meteor application...");
        var appDirectory = path.resolve('meteor');
        console.log(" |-- Using Folder : ", appDirectory);
        if (fs.existsSync(appDirectory + "/.meteor/packages"))
            console.log(" |-- Meteor Application exists, skipping code generation!");
        else {
            var process = exec("meteor create meteor");
            // process.stdout.on('data', function (data) {
            //     console.log(' |-- ' + data);
            // });
            process.stderr.on('data', function (data) {
                console.error(' |-- ' + data);
                throw new Error("Aborting since meteor application could not be created!");
            });
            process.on('close', function (code) {
                console.log(' |-- Done!');
            });
        }
    }

    // start the chain
    prepareFiles();
}