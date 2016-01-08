module.exports = function (grunt) {

    var http = require('http');
    var Chance = require(process.cwd() + "/node_modules/chance"), chance = new Chance();
    var async = require(process.cwd() + "/node_modules/async");

    grunt.registerTask("jenkins:createJobs", ["deploy:init", "prompt:jenkins", "jenkinsCreateJobs"]);

    grunt.registerTask("jenkinsCreateJobs", function () {

        var jenkinsTemplatesPath = "app/packages/smallstack-core/generator/resources/templates/jenkins";
        var deploymentFileContent = grunt.file.readJSON(grunt.config.get("deploy.deploymentsFile"));
        var authString = grunt.config.get("jenkins.username") + ":" + grunt.config.get("jenkins.password");
        var hostName = grunt.option("jenkins.server") || "jenkins.smallstack.io";
        var projectName = grunt.config.get("project.name");

        var done = this.async();
        var workerQueue = async.queue(function (task, callback) {
            console.log("creating " + task.type + ": " + task.name);
            if (task.type === "job")
                createOrUpdateJob(task.hostName, task.authString, task.name, task.job, callback);
            if (task.type === "view")
                createOrUpdateView(task.hostName, task.authString, task.name, task.job, callback);
        }, 2);
        workerQueue.drain = function () {
            console.log('all done!');
            done();
        }

        for (var key in deploymentFileContent) {
            var triggerHash = chance.hash({ length: 25 });
            var deployment = deploymentFileContent[key];
            deployment.name = key;
            console.log("Creating jenkins plans for environment : " + key);

            var scm = grunt.template.process(grunt.file.read(jenkinsTemplatesPath + "/partials/scm.xml"), { data: { deployment: deployment, projectName: projectName } });
            var packagesPartial = grunt.template.process(grunt.file.read(jenkinsTemplatesPath + "/partials/packages.xml"), { data: { deployment: deployment } });

			
            //build
            var buildJob = grunt.template.process(grunt.file.read(jenkinsTemplatesPath + "/build-job.xml"), { data: { deployment: deployment, triggerHash: triggerHash, pollTrigger: true, scm: scm, projectName: projectName, packagesPartial: packagesPartial } });
            var buildJobName = "project-" + projectName + "-" + deployment.repository.branch + "-build";
            console.log("    |-- Build Trigger URL : http://" + hostName + "/job/" + buildJobName + "/build?token=" + triggerHash);
            workerQueue.push({ type: "job", hostName: hostName, authString: authString, name: buildJobName, job: buildJob });
			
            // deploy
            var deployJob = grunt.template.process(grunt.file.read(jenkinsTemplatesPath + "/deploy-job.xml"), { data: { deployment: deployment, triggerHash: triggerHash, pollTrigger: false, scm: scm, projectName: projectName, packagesPartial: packagesPartial } });
            var deployJobName = "project-" + projectName + "-" + deployment.repository.branch + "-deploy";
            console.log("    |-- Deploy Trigger URL : http://" + hostName + "/job/" + deployJobName + "/build?token=" + triggerHash);
            workerQueue.push({ type: "job", hostName: hostName, authString: authString, name: deployJobName, job: deployJob });
			
            // android
            var androidJob = grunt.template.process(grunt.file.read(jenkinsTemplatesPath + "/android-job.xml"), { data: { deployment: deployment, triggerHash: triggerHash, pollTrigger: false, scm: scm, projectName: projectName, packagesPartial: packagesPartial } });
            var androidJobName = "project-" + projectName + "-" + deployment.repository.branch + "-android";
            console.log("    |-- Android Trigger URL : http://" + hostName + "/job/" + androidJobName + "/build?token=" + triggerHash);
            workerQueue.push({ type: "job", hostName: hostName, authString: authString, name: androidJobName, job: androidJob });
			
            // android-localhost
            var androidJobLocalhost = grunt.template.process(grunt.file.read(jenkinsTemplatesPath + "/android-localhost-job.xml"), { data: { deployment: deployment, triggerHash: triggerHash, pollTrigger: false, scm: scm, projectName: projectName, packagesPartial: packagesPartial } });
            var androidLocalhostJobName = "project-" + projectName + "-" + deployment.repository.branch + "-android-localhost";
            console.log("    |-- Android Localhost Trigger URL : http://" + hostName + "/job/" + androidLocalhostJobName + "/build?token=" + triggerHash);
            workerQueue.push({ type: "job", hostName: hostName, authString: authString, name: androidLocalhostJobName, job: androidJobLocalhost });
			
            // backup
            var backupJob = grunt.template.process(grunt.file.read(jenkinsTemplatesPath + "/backup-job.xml"), { data: { deployment: deployment, triggerHash: triggerHash, pollTrigger: false, scm: scm, projectName: projectName, packagesPartial: packagesPartial } });
            var backupJobName = "project-" + projectName + "-" + deployment.repository.branch + "-backup";
            console.log("    |-- Backup Trigger URL : http://" + hostName + "/job/" + backupJobName + "/build?token=" + triggerHash);
            workerQueue.push({ type: "job", hostName: hostName, authString: authString, name: backupJobName, job: backupJob });
        }
		
        // view
        var view = grunt.template.process(grunt.file.read(jenkinsTemplatesPath + "/view.xml"), { data: { projectName: projectName } });
        workerQueue.push({ type: "view", hostName: hostName, authString: authString, name: "project-" + projectName, job: view });
    });


    function createOrUpdateJob(hostName, authString, jobName, configXmlContent, callback) {
        createOrUpdate(hostName, authString, jobName, configXmlContent, "job", "createItem", callback);
    }

    function createOrUpdateView(hostName, authString, jobName, configXmlContent, callback) {
        createOrUpdate(hostName, authString, jobName, configXmlContent, "view", "createView", callback);
    }

    function createOrUpdate(hostName, authString, name, configXmlContent, type, method, callback) { 
				
        // update or create
        var testReq = http.request({
            hostname: hostName,
            port: 80,
            path: "/" + type + "/" + name + "/config.xml",
            method: 'GET',
            auth: authString
        }, function (res) {
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
            }, function (res) {
                console.log('UPDATE STATUS: ' + res.statusCode);
                if (res.statusCode === 200) {
                    console.log(type + " '" + name + "' successfully updated!");
                    callback();
                }
                else {
                    res.setEncoding('utf8');
                    res.on('data', function (chunk) {
                        console.log('BODY: ' + chunk);
                    });
                    throw new Error(type + " '" + name + "' could not get updated!");
                }
            });
            req.on('error', function (e) {
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
            }, function (res) {
                console.log('CREATE STATUS: ' + res.statusCode);
                if (res.statusCode === 200) {
                    console.log(type + " '" + name + "' successfully created!");
                    callback();
                }
                else {
                    res.setEncoding('utf8');
                    res.on('data', function (chunk) {
                        console.log('BODY: ' + chunk);
                    });
                    throw new Error(type + " '" + name + "' could not get created!");
                }
            });
            req.on('error', function (e) {
                console.log('problem with request: ' + e.message);
            });
            req.write(configXmlContent);
            req.end();
        }
    }
}
