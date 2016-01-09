module.exports = function (projectName) {

    var fs = require("fs-extra");
    var path = require("path");
    var exec = require('child_process').exec;
    var copySmallstackFiles = require("../generator/copySmallstackFiles");

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
        var packageJSONContent = fs.readJSONSync(__dirname + "/../generator/resources/templates/project/package.json");
        packageJSONContent.name = projectName;
        packageJSONContent.version = projectVersion;
        fs.writeJSONSync(path.join(directory, "package.json"), packageJSONContent);
        
        // create default .gitignore
        fs.copySync(__dirname + "/../generator/resources/templates/project/default.gitignore", path.join(directory, ".gitignore"));
        createMeteorApplication();
    }


    function createMeteorApplication() {
        // create meteor application
        console.log("Creating Meteor application...");
        var appDirectory = path.join(directory, 'meteor');
        console.log(" |-- Using Folder : ", appDirectory);
        if (fs.existsSync(appDirectory + "/.meteor/packages"))
            console.log(" |-- Meteor Application exists, skipping code generation!");
        else {
            var process = exec("meteor create meteor", {
                cwd: directory
            });
            // process.stdout.on('data', function (data) {
            //     console.log(' |-- ' + data);
            // });
            process.stderr.on('data', function (data) {
                console.error(' |-- ' + data);
                throw new Error("Aborting since meteor application could not be created!");
            });
            process.on('close', function (code) {
                console.log(' |-- Done!');
                createSmallstackFolder();
            });
        }
    }



    function createSmallstackFolder() {
        console.log("Creating smallstack files...");
        var dir = path.join(directory, "smallstack");
        fs.mkdirsSync(dir);
        copySmallstackFiles(dir);
    }

    // start the chain
    prepareFiles();
}