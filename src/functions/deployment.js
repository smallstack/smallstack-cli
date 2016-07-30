var path = require("path");
var fs = require("fs-extra");
var config = require("../config");
var templating = require("./templating");
var moment = require('moment');
var genFunctions = require('./generateSourcesFunctions');

module.exports = {
    deploymentsFileDirectory: config.rootDirectory + "/deployment",
    deploymentsFileName: "deployments",
    deploymentsFileEnding: ".json",

    getDeploymentsFilePath: function() {
        return path.join(this.deploymentsFileDirectory, this.deploymentsFileName + this.deploymentsFileEnding);
    },
    getDeployments: function() {
        return config.smallstack.environments;
    },
    getDeployment: function(environment) {

        var currentDeployment = this.getDeployments()[environment];
        if (currentDeployment === undefined)
            throw new Error("Could not find deployment with name '" + environment + "'! (You can specify the deployment via '--environment NAME)");
        currentDeployment.name = environment;
        currentDeployment.database = { name: "<%=projectName%>_" + currentDeployment.name };

        return currentDeployment;
    },
    apacheConfig: function(deployment) {

        if (deployment === undefined)
            throw new Error("deployment is undefined!");

        if (deployment.type !== "rootserver")
            throw new Error("apache configuration is only available for deployment.type = 'rootserver'!");

        console.log("\nCopy the following into you apache configuration for phusion passenger : \n");
        console.log("\n##############################################################################\n");
        console.log(templating.compileFile(path.join(config.cliTemplatesPath, "deployments", "apache-configuration.template"), {
            rootServerPath: deployment.rootServerPath,
            envName: deployment.name,
            rootUrl: deployment.url,
            databaseName: deployment.database.name,
            projectName: config.name
        }));
        console.log("\n##############################################################################\n");

    },
    createDefaults: function() {

        var deploymentsFilePath = this.getDeploymentsFilePath();
        console.log("Creating default deployments file:", deploymentsFilePath);

        if (fs.existsSync(deploymentsFilePath)) {
            var backupFile = path.join(this.deploymentsFileDirectory, this.deploymentsFileName + "_backup_" + moment().format("YYYY-MM-DD-HH-mm-SS") + this.deploymentsFileEnding);
            fs.copySync(deploymentsFilePath, backupFile);
            console.log("Created backup file of deployments: ", backupFile);
        }

        var standardDeployment = {
            "dev": {
                "type": "rootserver",
                "url": "http://" + config.name + ".dev.projects.smallstack.io",
                "rootServerPath": "/var/www/apps/" + config.name + "/dev",
                "repository": {
                    "url": "https://bitbucket.org/smallstack/project-" + config.name + ".git",
                    "branch": "develop"
                },
                "smallstack": {
                    "version": "develop"
                },
                "autoDeploy": true
            },
            "prod": {
                "type": "rootserver",
                "url": "http://" + config.name + ".prod.projects.smallstack.io",
                "rootServerPath": "/var/www/apps/" + config.name + "/prod",
                "repository": {
                    "url": "https://bitbucket.org/smallstack/project-" + config.name + ".git",
                    "branch": "master"
                },
                "smallstack": {
                    "version": "develop"
                },
                "dailyBackup": true
            }
        }
        fs.writeFileSync(deploymentsFilePath, JSON.stringify(standardDeployment, null, 4));
        console.log("Created File : ", deploymentsFilePath);
        var mobileConfigTemplateFilePath = path.join(this.deploymentsFileDirectory, "/mobile-config-template.js");
        fs.copySync(config.cliTemplatesPath + "/project/mobile-config-template.js", mobileConfigTemplateFilePath);
        console.log("Created File : ", mobileConfigTemplateFilePath)
    },
    prepareMobile: function(deployment) {
        var mobileTemplate = path.join(this.deploymentsFileDirectory, "mobile-config-template.js");
        if (fs.existsSync(mobileTemplate)) {
            templating.compileFileToFile(mobileTemplate, path.join(config.meteorDirectory, "mobile-config.js"), {
                deployment: deployment,
                projectName: config.name,
                f: genFunctions
            });
        }
    }
}