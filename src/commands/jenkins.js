var http = require('http');
var Chance = require("chance"), chance = new Chance();

var inquirer = require("inquirer");
var _ = require("underscore");


var deploymentFunctions = require("../functions/deployment");
var config = require("../config");
var jenkinsTasks = require("../functions/jenkinsTasks");

var jenkinsTemplatesPath = "app/packages/smallstack-core/generator/resources/templates/jenkins";

module.exports = function (commander) {

    var deployments = deploymentFunctions.getDeployments();

    var questions = [
        {
            type: "list",
            name: "environment",
            message: "Which environment",
            choices: _.keys(deployments),
            when: commander.environment === undefined
        },
        {
            type: "input",
            name: "jenkinsServer",
            message: "Jenkins Server",
            default: "jenkins.smallstack.io",
            when: commander.jenkinsServer === undefined
        },
        {
            type: "input",
            name: "jenkinsUsername",
            message: "Jenkins Username",
            when: commander.jenkinsUsername === undefined
        },
        {
            type: "password",
            name: "jenkinsPassword",
            message: "Jenkins Password",
            when: commander.jenkinsPassword === undefined
        }
    ]


    inquirer.prompt(questions, function (answers) {
        var environment = commander.environment || answers["environment"];
        var jenkinsUsername = commander.jenkinsUsername || answers["jenkinsUsername"];
        var jenkinsPassword = commander.jenkinsPassword || answers["jenkinsPassword"];
        var jenkinsServer = commander.jenkinsServer || answers["jenkinsServer"];

        var currentDeployment = deploymentFunctions.getDeployment(environment);
        var authString = jenkinsUsername + ":" + jenkinsPassword;
        var projectName = config["name"];

        jenkinsTasks.createJobs(currentDeployment, projectName, jenkinsServer, authString);
    });
}

