var path = require("path");
var fs = require("fs-extra");
var inquirer = require("inquirer");
var _ = require("underscore");
var deploymentFunctions = require("../functions/deployment");
var DockerDeployment = require("../functions/deployments/DockerDeployment");
var config = require("../config");
var request = require("request");
var Spinner = require('cli-spinner').Spinner;

module.exports = function (parameters, done) {

    // some defaults
    var apiUrl = parameters.apiUrl || "https://smallstack.io/api";
    var apiKey = parameters.apiKey || process.env.SMALLSTACK_API_KEY;
    var filePath = config.builtDirectory + "/meteor.tar.gz";
    if (!apiKey) {
        console.info("ERROR: Please provide an API Key");
        console.info("\t* via SMALLSTACK_API_KEY environment variable");
        console.info("\t* via --apiKey parameter\n");
        console.info("If you don't have an api key, please generate one in your profile at https://smallstack.io/profile\n\n");
        return;
    }

    // getting available projects
    request({
        url: apiUrl + "/projects",
        headers: {
            "x-smallstack-apikey": apiKey
        }
    }, function (error, response, body) {
        if (error)
            console.error(error);
        else {
            var projects = JSON.parse(body);
            if (!(projects instanceof Array) || projects.length === 0)
                throw new Error("No projects found for this account! Please go to https://smallstack.io and create one!");

            inquirer.prompt([
                {
                    type: "list",
                    name: "projectId",
                    message: "Which project",
                    choices: function () {
                        var projectKeys = [];
                        _.each(projects, function (project) {
                            if (project.type === "developer")
                                projectKeys.push({ name: project.name, value: project.id });
                        });
                        return projectKeys;
                    },
                    when: parameters.environmentId === undefined
                },
                {
                    type: "list",
                    name: "environmentId",
                    message: "Which environment",
                    choices: function (answers) {
                        var doneAsync = this.async();
                        request({
                            url: apiUrl + "/environments?projectId=" + answers.projectId,
                            headers: {
                                "x-smallstack-apikey": apiKey
                            }
                        }, function (error, response, body) {
                            if (error)
                                console.error(error);
                            else {
                                var environments = JSON.parse(body);
                                if (!(environments instanceof Array) || environments.length === 0)
                                    throw new Error("No environments found for this project! Please go to https://smallstack.io and create one!");

                                var environmentKeys = [];
                                _.each(environments, function (environment) {
                                    environmentKeys.push({ name: environment.name, value: environment.id });
                                });
                                doneAsync(environmentKeys);
                            }
                        });
                    },
                    when: parameters.environmentId === undefined
                }
            ], function (answers) {

                request({
                    method: "POST",
                    url: apiUrl + "/deployments?environmentId=" + answers.environmentId,
                    headers: {
                        "x-smallstack-apikey": apiKey
                    }
                }, function (error, response, body) {
                    if (error)
                        console.error("Error while getting creating deployment : ", error);
                    else {
                        var data = JSON.parse(body);
                        if (!data || !data.signedUrl)
                            throw new Error("Could not get signed S3 url!");

                        var spinner = new Spinner('%s uploading file...');
                        spinner.start();
                        fs.createReadStream(filePath).pipe(request.put({
                            url: data.signedUrl,
                            headers: {
                                "Content-Length": fs.statSync(filePath)["size"]
                            }
                        }, function (error, response, body) {
                            if (error)
                                console.error(error);
                            else {
                                console.log(body);
                                console.log("File Upload Completed!");
                            }
                            spinner.setSpinnerTitle("%s deploying...");
                            request({
                                method: "GET",
                                url: apiUrl + "/deployments/" + data.deploymentId + "/deploy",
                                headers: {
                                    "x-smallstack-apikey": apiKey
                                }
                            }, function (error, response, body) {
                                if (error)
                                    console.error(error);
                                else {
                                    console.log(body.message);
                                }
                                spinner.stop(true);
                                done();
                            });
                        }));
                    }
                });
            });
        }
    });
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


