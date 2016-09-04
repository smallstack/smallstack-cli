var path = require("path");
var fs = require("fs-extra");
var inquirer = require("inquirer");
var _ = require("underscore");
var deploymentFunctions = require("../functions/deployment");
var DockerDeployment = require("../functions/deployments/DockerDeployment");
var smallstackAPI = require("../functions/smallstackAPI");
var config = require("../config");

module.exports = function (parameters, done) {

    // getting available projects
    smallstackAPI({
        host: parameters.apiHost,
        protocol: parameters.apiProtocol,
        port: parameters.apiPort,
        path: "/api/projects"
    }, function (projects) {

        inquirer.prompt([
            {
                type: "list",
                name: "projectId",
                message: "Which project",
                choices: function () {
                    var projectKeys = [];
                    _.each(projects, function (project) {
                        projectKeys.push({ name: project.name, value: project.id });
                    });
                    return projectKeys;
                },
                when: parameters.projectId === undefined && parameters.environmentId === undefined
            },
            {
                type: "list",
                name: "environmentId",
                message: "Which environment",
                choices: function (answers) {
                    var done = this.async();
                    smallstackAPI({
                        host: parameters.apiHost,
                        protocol: parameters.apiProtocol,
                        port: parameters.apiPort,
                        path: "/api/environments?projectId=" + answers.projectId
                    }, function (environments) {
                        var environmentKeys = [];
                        _.each(environments, function (environment) {
                            environmentKeys.push({ name: environment.name, value: environment.id });
                        });
                        done(environmentKeys);
                    }).end();
                },
                when: parameters.environmentId === undefined
            }
        ], function (answers) {
            var request = smallstackAPI({
                host: parameters.apiHost,
                protocol: parameters.apiProtocol,
                port: parameters.apiPort,
                method: "POST",
                path: "/api/deployments?projectId=" + answers.projectId + "&environmentId=" + answers.environmentId
            });

            console.log("Uploading File");
            fs.readFile(config.builtDirectory + "/meteor.tar.gz", function (err, data) {
                request.write(data);
                request.on("end", function () {
                    console.log("Meteor Bundle successfully uploaded!");
                });
                request.end();
            });
        });
    }).end();
}

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


