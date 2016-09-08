var http = require("http");
var async = require("async");
var Chance = require("chance");
var _ = require("underscore");

var config = require("../config");
var templating = require("./templating");

var chance = new Chance();

module.exports = {

    createJobs: function(deployment, projectName, hostName, authString) {
        if (deployment === undefined)
            throw new Error("Deployment is undefined!");
        if (projectName === undefined)
            throw new Error("ProjectName is undefined!");
        if (hostName === undefined)
            throw new Error("HostName is undefined!");
        if (authString === undefined)
            throw new Error("AuthString is undefined!");
            
        var that = this;
        var workerQueue = async.queue(function(task, callback) {
            console.log("creating " + task.type + ": " + task.name);
            if (task.type === "job")
                that.createOrUpdateJob(task.hostName, task.authString, task.name, task.job, callback);
            if (task.type === "view")
                that.createOrUpdateView(task.hostName, task.authString, task.name, task.job, callback);
        }, 2);
        workerQueue.drain = function() {
            console.log('all done!');
        }

        var triggerHash = chance.hash({ length: 25 });
        console.log("Creating jenkins plans for environment : " + deployment.name);

        var scm = templating.compileFile(config.cliTemplatesPath + "/jenkins/partials/scm.xml", { deployment: deployment, projectName: projectName });
        var packagesPartial = templating.compileFile(config.cliTemplatesPath + "/jenkins/partials/packages.xml", { deployment: deployment });


        //build
        var buildJob = templating.compileFile(config.cliTemplatesPath + "/jenkins/build-job.xml", { deployment: deployment, triggerHash: triggerHash, pollTrigger: true, scm: scm, projectName: projectName, packagesPartial: packagesPartial });
        var buildJobName = "project-" + projectName + "-" + deployment.repository.branch + "-build";
        console.log("    |-- Build Trigger URL : http://" + hostName + "/job/" + buildJobName + "/build?token=" + triggerHash);
        workerQueue.push({ type: "job", hostName: hostName, authString: authString, name: buildJobName, job: buildJob });

        // deploy
        var deployJob = templating.compileFile(config.cliTemplatesPath + "/jenkins/deploy-job.xml", { deployment: deployment, triggerHash: triggerHash, pollTrigger: false, scm: scm, projectName: projectName, packagesPartial: packagesPartial });
        var deployJobName = "project-" + projectName + "-" + deployment.repository.branch + "-deploy";
        console.log("    |-- Deploy Trigger URL : http://" + hostName + "/job/" + deployJobName + "/build?token=" + triggerHash);
        workerQueue.push({ type: "job", hostName: hostName, authString: authString, name: deployJobName, job: deployJob });

        // android
        var androidJob = templating.compileFile(config.cliTemplatesPath + "/jenkins/android-job.xml", { deployment: deployment, triggerHash: triggerHash, pollTrigger: false, scm: scm, projectName: projectName, packagesPartial: packagesPartial });
        var androidJobName = "project-" + projectName + "-" + deployment.repository.branch + "-android";
        console.log("    |-- Android Trigger URL : http://" + hostName + "/job/" + androidJobName + "/build?token=" + triggerHash);
        workerQueue.push({ type: "job", hostName: hostName, authString: authString, name: androidJobName, job: androidJob });

        // android-localhost
        var androidJobLocalhost = templating.compileFile(config.cliTemplatesPath + "/jenkins/android-localhost-job.xml", { deployment: deployment, triggerHash: triggerHash, pollTrigger: false, scm: scm, projectName: projectName, packagesPartial: packagesPartial });
        var androidLocalhostJobName = "project-" + projectName + "-" + deployment.repository.branch + "-android-localhost";
        console.log("    |-- Android Localhost Trigger URL : http://" + hostName + "/job/" + androidLocalhostJobName + "/build?token=" + triggerHash);
        workerQueue.push({ type: "job", hostName: hostName, authString: authString, name: androidLocalhostJobName, job: androidJobLocalhost });

        // backup
        var backupJob = templating.compileFile(config.cliTemplatesPath + "/jenkins/backup-job.xml", { deployment: deployment, triggerHash: triggerHash, pollTrigger: false, scm: scm, projectName: projectName, packagesPartial: packagesPartial });
        var backupJobName = "project-" + projectName + "-" + deployment.repository.branch + "-backup";
        console.log("    |-- Backup Trigger URL : http://" + hostName + "/job/" + backupJobName + "/build?token=" + triggerHash);
        workerQueue.push({ type: "job", hostName: hostName, authString: authString, name: backupJobName, job: backupJob });

        // view
        var view = templating.compileFile(config.cliTemplatesPath + "/jenkins/view.xml", { projectName: projectName });
        workerQueue.push({ type: "view", hostName: hostName, authString: authString, name: "project-" + projectName, job: view });

    },
    createOrUpdateJob: function createOrUpdateJob(hostName, authString, jobName, configXmlContent, callback) {
        this.createOrUpdate(hostName, authString, jobName, configXmlContent, "job", "createItem", callback);
    },
    createOrUpdateView: function createOrUpdateView(hostName, authString, jobName, configXmlContent, callback) {
        this.createOrUpdate(hostName, authString, jobName, configXmlContent, "view", "createView", callback);
    },
    createOrUpdate: function createOrUpdate(hostName, authString, name, configXmlContent, type, method, callback) {
        // update or create
        var testReq = http.request({
            hostname: hostName,
            port: 80,
            path: "/" + type + "/" + name + "/config.xml",
            method: 'GET',
            auth: authString
        }, function(res) {
            console.log('GET STATUS: ' + res.statusCode);
            if (res.statusCode === 200) {
                update();
            }
            else {
                create();
            }
        });
        testReq.end();

        function update() {
            var req = http.request({
                hostname: hostName,
                port: 80,
                path: "/" + type + "/" + name + "/config.xml",
                method: 'POST',
                auth: authString,
                headers: {
                    'Content-Type': 'application/xml'
                }
            }, function(res) {
                console.log('UPDATE STATUS: ' + res.statusCode);
                if (res.statusCode === 200) {
                    console.log(type + " '" + name + "' successfully updated!");
                    callback();
                }
                else {
                    res.setEncoding('utf8');
                    res.on('data', function(chunk) {
                        console.log('BODY: ' + chunk);
                    });
                    throw new Error(type + " '" + name + "' could not get updated!");
                }
            });
            req.on('error', function(e) {
                console.log('problem with request: ' + e.message);
            });
            req.write(configXmlContent);
            req.end();
        }

        function create() {
            var req = http.request({
                hostname: hostName,
                port: 80,
                path: "/" + method + "?name=" + name,
                method: 'POST',
                auth: authString,
                headers: {
                    'Content-Type': 'application/xml'
                }
            }, function(res) {
                console.log('CREATE STATUS: ' + res.statusCode);
                if (res.statusCode === 200) {
                    console.log(type + " '" + name + "' successfully created!");
                    callback();
                }
                else {
                    res.setEncoding('utf8');
                    res.on('data', function(chunk) {
                        console.log('BODY: ' + chunk);
                    });
                    throw new Error(type + " '" + name + "' could not get created!");
                }
            });
            req.on('error', function(e) {
                console.log('problem with request: ' + e.message);
            });
            req.write(configXmlContent);
            req.end();
        }
    }
}