var http = require('http');
var Chance = require("chance"), chance = new Chance();

var inquirer = require("inquirer");
var _ = require("underscore");


var deploymentFunctions = require("../functions/deployment");
var config = require("../config");
var jenkinsTasks = require("../functions/jenkinsTasks");

var jenkinsTemplatesPath = "app/packages/smallstack-core/generator/resources/templates/jenkins";

module.exports = function (params) {

    var deployments = deploymentFunctions.getDeployments();

    var questions = [
        {
            type: "list",
            name: "environment",
            message: "Which environment",
            choices: _.keys(deployments),
            when: params.environment === undefined
        },
        {
            type: "input",
            name: "jenkinsServer",
            message: "Jenkins Server",
            default: "jenkins.smallstack.io",
            when: params.jenkinsServer === undefined
        },
        {
            type: "input",
            name: "jenkinsUsername",
            message: "Jenkins Username",
            when: params.jenkinsUsername === undefined
        },
        {
            type: "password",
            name: "jenkinsPassword",
            message: "Jenkins Password",
            when: params.jenkinsPassword === undefined
        }
    ]


    inquirer.prompt(questions, function (answers) {
        var environment = params.environment || answers["environment"];
        var jenkinsUsername = params.jenkinsUsername || answers["jenkinsUsername"];
        var jenkinsPassword = params.jenkinsPassword || answers["jenkinsPassword"];
        var jenkinsServer = params.jenkinsServer || answers["jenkinsServer"];

        var currentDeployment = deploymentFunctions.getDeployment(environment);
        var authString = jenkinsUsername + ":" + jenkinsPassword;
        var projectName = config["name"];

        jenkinsTasks.createJobs(currentDeployment, projectName, jenkinsServer, authString);
    });
}

