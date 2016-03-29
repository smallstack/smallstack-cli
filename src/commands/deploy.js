var path = require("path");
var fs = require("fs-extra");
var inquirer = require("inquirer");
var _ = require("underscore");
var deploymentFunctions = require("../functions/deployment");
var DockerDeployment = require("../functions/deployments/DockerDeployment");

module.exports = function(commander) {

    var questions = [
        {
            type: "list",
            name: "environment",
            message: "Which environment",
            choices: _.keys(deploymentFunctions.getDeployments()),
            when: commander.environment === undefined && commander.createDefaults !== true
        }
    ];


    inquirer.prompt(questions, function(answers) {

        if (commander.createDefaults === true) {
            deploymentFunctions.createDefaults();
            return;
        }


        var environment = commander.environment || answers["environment"];
        var deployment = deploymentFunctions.getDeployment(environment);
        console.log("deployment : ", deployment);

        if (commander.apacheConfig === true) {
            deploymentFunctions.apacheConfig(deployment);
        }


        if (commander.prepareMobile === true) {
            deploymentFunctions.prepareMobile(deployment);
        }

        switch (deployment.type) {
            case "modulus":
                console.log("Type 'modulus deploy'!");
                break;
            case "docker":
                DockerDeployment.start(deployment);
        }

    });


    // grunt.registerTask("deploy:mobilePrepare", function () {
    //     var mobileTemplate = path.join(grunt.config.get("deploy.deploymentsPath"), "mobile-config-template.js");
    //     var conf = getCurrentDeployment();
    //     if (grunt.file.exists(mobileTemplate)) {
    //         functions.processTemplate(grunt, mobileTemplate, "app/mobile-config.js", {
    //             deployment: conf,
    //             projectName: grunt.config.get("project.name"),
    //             f: functions
    //         });
    //     }
    // });





    // grunt.registerTask("deploy:deploy", function () {
    //     var conf = getCurrentDeployment();

    //     switch (conf.type) {
    //         case "rootserver":
    //             rootServerDeployment(conf);
    //             break;
    //         default:
    //             throw new Error("Unknown deployment type : " + conf.type);
    //     }
    // });


    // function rmdir(path) {
    //     exec("rm -Rf " + path);
    //     if (grunt.file.exists(path) && grunt.file.isDir(path))
    //         throw new Error("Tried deleting directory '" + path + "' but it still exists!");
    // }

    // function rootServerDeployment(conf) {
    //     var restartArgs = "";

    //     exec("node -v");

    //     // create bundle
    //     console.log("Creating Meteor Bundle...");
    //     exec("meteor bundle package.tar.gz", {
    //         cwd: grunt.config.get("project.appDirectory")
    //     });


    //     // move bundle    
    //     console.log("Moving Meteor Bundle...");
    //     grunt.file.copy(path.join(grunt.config.get("project.appDirectory"), "package.tar.gz"), path.join(conf.rootServerPath, "package.tar.gz"));

    //     // extract bundle
    //     console.log("Extracting Meteor Bundle...");
    //     var tmpDirectory = path.join(conf.rootServerPath, "tmp");
    //     rmdir(tmpDirectory);
    //     grunt.file.mkdir(tmpDirectory);
    //     exec("tar xzf " + path.join(conf.rootServerPath, "package.tar.gz"), {
    //         cwd: tmpDirectory
    //     });

    //     // remove bundle
    //     console.log("Removing Meteor Bundle...");
    //     fs.unlinkSync(path.join(conf.rootServerPath, "package.tar.gz"));

    //     // install dependencies
    //     console.log("Installing Node Dependencies...");
    //     exec("npm install --production", {
    //         cwd: path.join(conf.rootServerPath, "tmp/bundle/programs/server")
    //     });
    //     exec("npm prune --production", {
    //         cwd: path.join(conf.rootServerPath, "tmp/bundle/programs/server")
    //     });

    //     // deploy and restart app
    //     console.log("Deploying and Restarting Application...");
    //     var bundleDirectory = path.join(conf.rootServerPath, "bundle");
    //     var bundleTmpDirectory = path.join(conf.rootServerPath, "tmp", "bundle");
    //     var bundleOldDirectory = path.join(conf.rootServerPath, "bundle.old");

    //     // move current bundle folder   
    //     rmdir(bundleOldDirectory);
    //     if (grunt.file.isDir(bundleDirectory))
    //         fs.renameSync(bundleDirectory, bundleOldDirectory);

    //     // move extracted bundle to real location
    //     fs.renameSync(bundleTmpDirectory, bundleDirectory);

    //     // restart app
    //     try {
    //         exec("passenger-config restart-app --ignore-app-not-running --ignore-passenger-not-running" + restartArgs + " " + bundleDirectory);
    //     } catch (e) {
    //         console.warn(e);
    //     }

    //     // tidy up
    //     console.log("Tidying Up...");
    //     rmdir(path.join(conf.rootServerPath, "bundle.old"));
    //     rmdir(path.join(conf.rootServerPath, "tmp"));
    // }

}

