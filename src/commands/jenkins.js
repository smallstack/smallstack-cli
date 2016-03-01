var http = require('http');
var Chance = require("chance"), chance = new Chance();

var inquirer = require("inquirer");
var _ = require("underscore");


var deploymentConfig = require("../functions/config.deployment");
var config = require("../config");
var jenkinsTasks = require("../functions/jenkinsTasks");

var jenkinsTemplatesPath = "app/packages/smallstack-core/generator/resources/templates/jenkins";

module.exports = function (commander, environment, jenkinsServer, jenkinsUsername, jenkinsPassword) {

    var deployments = deploymentConfig.getDeployments();

    var questions = [
        {
            type: "list",
            name: "environment",
            message: "Which environment",
            choices: _.keys(deployments),
            when: environment === undefined
        },
        {
            type: "input",
            name: "jenkinsServer",
            message: "Jenkins Server",
            default: "jenkins.smallstack.io",
            when: jenkinsServer === undefined
        },
        {
            type: "input",
            name: "jenkinsUsername",
            message: "Jenkins Username",
            when: jenkinsUsername === undefined
        },
        {
            type: "password",
            name: "jenkinsPassword",
            message: "Jenkins Password",
            when: jenkinsPassword === undefined
        }
    ]


    inquirer.prompt(questions, function (answers) {
        console.log("answers : ", answers);
        environment = environment || answers["environment"];
        jenkinsUsername = jenkinsUsername || answers["jenkinsUsername"];
        jenkinsPassword = jenkinsPassword || answers["jenkinsPassword"];
        jenkinsServer = jenkinsServer || answers["jenkinsServer"];

        var currentDeployment = deploymentConfig.getDeployment(environment);
        var authString = jenkinsUsername + ":" + jenkinsPassword;
        var projectName = config["name"];

        jenkinsTasks.createJobs(currentDeployment, projectName, jenkinsServer, authString);
    });
}

