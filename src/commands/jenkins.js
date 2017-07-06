var http = require('http');
var Chance = require("chance"), chance = new Chance();
var inquirer = require("inquirer");
var _ = require("underscore");
var jenkinsAPI = require("jenkins-api");
var jsxml = require("node-jsxml");

var deploymentFunctions = require("../functions/deployment");
var config = require("../config");
var jenkinsTasks = require("../functions/jenkinsTasks");

var jenkinsTemplatesPath = "app/packages/smallstack-core/generator/resources/templates/jenkins";

module.exports = function (params, done) {

    if (!config.repository || !config.repository.url)
        throw new Error("For this action you need to set a repository.url in your project's root package.json file!");

    var questions = [
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


    inquirer.prompt(questions).then(function (answers) {
        var jenkinsUsername = params.jenkinsUsername || answers["jenkinsUsername"];
        var jenkinsPassword = params.jenkinsPassword || answers["jenkinsPassword"];
        var jenkinsServer = params.jenkinsServer || answers["jenkinsServer"];
        var authString = jenkinsUsername + ":" + jenkinsPassword;
        var url = "https://" + jenkinsServer;
        url = decodeURI(url);
        console.log(url);
        var jen = jenkinsAPI.init(url, {
            'auth': {
                'user': jenkinsUsername,
                'pass': jenkinsPassword,
                'sendImmediately': true
            }
        });

        jen.all_jobs(function (err, data) {
            if (err) {
                console.error(data);
                throw err;
            }

            inquirer.prompt([{
                type: "list",
                name: "jenkinsTemplatePlan",
                message: "Select a job to use as template",
                choices: function () {
                    return _.pluck(data, "name");
                },
                when: params.jenkinsTemplatePlan === undefined
            }]).then(function (answers) {
                var jenkinsTemplatePlan = params.jenkinsTemplatePlan || answers.jenkinsTemplatePlan;
                jen.get_config_xml(jenkinsTemplatePlan, function (err, jobConfig) {
                    if (err) {
                        console.error(jobConfig);
                        throw err;
                    }

                    var jobName = config.name;
                    if (jobName.indexOf("project-") === -1)
                        jobName = "project-" + jobName;

                    // modify config from template
                    var xml = new jsxml.XML(jobConfig);

                    // scm url
                    var scm = xml.child("scm");
                    var url = scm.child("userRemoteConfigs").child("hudson.plugins.git.UserRemoteConfig").child("url");
                    var repositoryUrl = config.repository.url;
                    if (repositoryUrl.indexOf("http") === 0) {
                        var regex = new RegExp("(\/\/)([a-z.]*)\/(.*)");
                        var result = regex.exec(repositoryUrl);
                        repositoryUrl = "git@" + result[2] + ":" + result[3];
                    }
                    url.setValue(repositoryUrl);

                    // disabled -> enabled
                    xml.child("disabled").setValue("false");

                    jobConfig = xml.toXMLString();

                    jen.job_info(jobName, function (err, data) {
                        if (err) {
                            console.log("Creating Job : " + jobName);
                            jen.create_job(jobName, jobConfig, function (error, data) {
                                if (error) { console.error(data); throw error; }
                                console.log(data);
                            });
                        } else {
                            console.log("Updating Job : " + jobName);
                            jen.update_job(jobName, function (config) {
                                return jobConfig;
                            }, function (error, data) {
                                if (error) { console.error(data); throw error; }
                                console.log(data);
                            });
                        }
                    });
                });
            });
            done();
        });
    });
}
