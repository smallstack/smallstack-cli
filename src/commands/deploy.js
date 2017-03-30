var path = require("path");
var fs = require("fs-extra");
var inquirer = require("inquirer");
var _ = require("underscore");
var config = require("../config");
var request = require("request");
var Spinner = require('cli-spinner').Spinner;
var bundleJob = require("./bundle");
var SmallstackApi = require("../functions/smallstackApi");
var gitState = require("git-state");
var colors = require("colors");

module.exports = function (parameters, done) {

    var smallstackApi = new SmallstackApi(parameters);
    var forceMode = parameters && parameters.force === true;

    if (gitState.isGitSync(config.rootDirectory)) {
        var state = gitState.checkSync(config.rootDirectory);
        if (state.branch !== "master") {
            if (!forceMode)
                throw new Error("Please do releases from the master branch!");
            else
                console.error(colors.red("Warning: Not releasing from master branch!"));
        }
        if (state.dirty !== 0 || state.untracked !== 0) {
            if (!forceMode)
                throw new Error("Uncommitted changes detected! Please commit your code before deploying!");
            else
                console.error(colors.red("Warning: Uncommitted changes detected! Please commit your code before deploying!"));
        }
    } else console.error("Warning: Your project is not under (git) version control!");

    // some defaults
    var apiUrl = smallstackApi.url;
    var apiKey = smallstackApi.key;
    var filePath = config.builtDirectory + "/meteor.tar.gz";

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

            inquirer.prompt([{
                    type: "list",
                    name: "projectId",
                    message: "Which project",
                    choices: function () {
                        var projectKeys = [];
                        _.each(projects, function (project) {
                            projectKeys.push({
                                name: project.name,
                                value: project.id
                            });
                        });
                        return projectKeys;
                    },
                    when: parameters.environmentId === undefined
                },
                {
                    type: "list",
                    name: "instanceId",
                    message: "Which instance",
                    choices: function (answers) {
                        var doneAsync = this.async();
                        request({
                            url: apiUrl + "/instances?projectId=" + answers.projectId,
                            headers: {
                                "x-smallstack-apikey": apiKey
                            }
                        }, function (error, response, body) {
                            if (error) {
                                console.error(error);
                                doneAsync(error);
                            } else {
                                var instances = JSON.parse(body);
                                if (!(instances instanceof Array) || instances.length === 0)
                                    throw new Error("No instances found for this project! Please go to https://smallstack.io and create one!");

                                var instanceObjects = [];
                                _.each(instances, function (instance) {
                                    instanceObjects.push({
                                        name: instance.id,
                                        value: instance.id
                                    });
                                });
                                doneAsync(undefined, instanceObjects);
                            }
                        });
                    },
                    when: parameters.instanceId === undefined
                }
            ]).then(function (answers) {

                bundleJob({
                    skipBundle: parameters.skipBundle
                }, function () {

                    request({
                        method: "GET",
                        url: apiUrl + "/instances/" + answers.instanceId + "/bundleupload",
                        headers: {
                            "x-smallstack-apikey": apiKey
                        }
                    }, function (error, response, body) {
                        if (error)
                            console.error("Error while getting getting upload url:", error);
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
                                    url: apiUrl + "/instances/" + answers.instanceId + "/update",
                                    headers: {
                                        "x-smallstack-apikey": apiKey
                                    }
                                }, function (error, response, body) {
                                    if (error)
                                        console.error(error);
                                    else {
                                        if (body && body.message)
                                            console.log(body.message);
                                        else
                                            console.log("Update command triggered!")
                                    }
                                    spinner.stop(true);
                                    done();
                                });
                            }));
                        }
                    });
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
