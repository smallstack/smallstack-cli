var path = require("path");
var fs = require("fs-extra");
var moment = require('moment');
var request = require("request");
var Promise = require("promise");
var _ = require("underscore");
var config = require("../../config");
var templating = require("./../templating");
var genFunctions = require('./../generateSourcesFunctions');

require('promise/lib/rejection-tracking').enable(
    { allRejections: true }
);

module.exports = {
    dockerApiUrl: "https://cloud.docker.com/api/app/v1",
    mongodbServiceName: "mongodb",
    dockerDeploymentJson: {},
    start: function(deployment) {
        var that = this;
        console.log("Starting Docker Deployment...");

        that.preparePostJson(deployment).then(function() {
            return that.addMongoDBUrls();
        }).then(function() {
            return that.addEnvironmentVariables(deployment);
        }).then(function() {
            return that.createService();
        }).then(function(serviceUUID) {
            return that.startService(serviceUUID);
        }).catch(function(error) {
            throw error;
        });

        // create service

        // start service

        // check availablility

        // stop old services

        // terminate old services

    },
    createService: function() {
        var that = this;
        return new Promise(function(resolve, reject) {

            // get mongodb url
            request({
                method: "POST",
                url: that.dockerApiUrl + "/service/",
                headers: {
                    "Authorization": that.getBasicDockerAuth()
                },
                body: that.dockerDeploymentJson,
                json: true
            }, function(error, response, body) {
                if (error)
                    throw new Error(error);

                var statusCode = response.statusCode;
                if (statusCode !== 201) {
                    reject(new Error("Could not create service! - " + statusCode + " - " + JSON.stringify(body)));
                }
                else {
                    resolve(body.uuid);
                }
            });
        });
    },
    startService: function(serviceUUID) {
        var that = this;
        return new Promise(function(resolve, reject) {

            // get mongodb url
            request({
                method: "POST",
                url: that.dockerApiUrl + "/service/" + serviceUUID + "/start/",
                headers: {
                    "Authorization": that.getBasicDockerAuth()
                }
            }, function(error, response, body) {
                if (error)
                    throw new Error(error);

                var statusCode = response.statusCode;
                if (statusCode !== 202) {
                    reject(new Error("Could not start service! - " + statusCode + " - " + JSON.stringify(body)));
                }
                else {
                    resolve();
                }
            });
        });
    },
    preparePostJson: function(deployment) {
        var that = this;
        return new Promise(function(resolve, reject) {
            that.dockerDeploymentJson = {
                "image": "ulexus/meteor",
                "name": "project-" + config.name + "-" + that.getUniqueServiceIdentifier(),
                "autorestart": "ALWAYS",
                "autoredeploy": true,
                "net": "bridge",
                "container_envvars": [
                    {
                        "key": "RELEASE",
                        "value": "1.2.1"
                    },
                    {
                        "key": "DEPLOY_KEY",
                        "value": "/opt/docker/keys/private/bitbucket.id_rsa"
                    }],
                "container_ports":
                [{
                    "protocol": "tcp",
                    "inner_port": "80",
                    "published": true
                }],
                "linked_to_service": [],
                "bindings": [
                    {
                        "host_path": "/opt/docker/keys/private",
                        "container_path": "/opt/docker/keys/private"
                    }]
            };
            resolve();
        });
    },
    getUniqueServiceIdentifier: function() {
        return _.random(111, 999);
    },
    addEnvironmentVariables: function(deployment) {
        var that = this;
        return new Promise(function(resolve, reject) {

            var envs = {};
            if (deployment.url === undefined)
                reject(new Error("No deployment URL defined in deployment.json!"));
            else if (deployment.repository.url === undefined)
                reject(new Error("No repository.url defined in deployment.json!"));
            else if (deployment.repository.branch === undefined)
                reject(new Error("No repository.branch defined in deployment.json!"));
            else if (deployment.docker.database.name === undefined)
                reject(new Error("No docker.database.name defined in deployment.json!"));
            else {
                that.dockerDeploymentJson["container_envvars"].push({
                    "key": "REPO",
                    "value": deployment.repository.url
                });
                that.dockerDeploymentJson["container_envvars"].push({
                    "key": "BRANCH",
                    "value": deployment.repository.branch
                });
                that.dockerDeploymentJson["container_envvars"].push({
                    "key": "VIRTUAL_HOST",
                    "value": deployment.url.toLowerCase().replace("https://", "").replace("http://", "")
                });
                that.dockerDeploymentJson["container_envvars"].push({
                    "key": "ROOT_URL",
                    "value": deployment.url
                });
                that.dockerDeploymentJson["container_envvars"].push({
                    "key": "MONGO_URL",
                    "value": "mongodb://mongodb:27017/" + deployment.docker.database.name
                });
                resolve();
            }
        });
    },
    addMongoDBUrls: function() {
        var that = this;
        return new Promise(function(resolve, reject) {

            // get mongodb url
            request({
                method: "GET",
                uri: that.dockerApiUrl + "/service?name=" + that.mongodbServiceName,
                headers: {
                    "Authorization": that.getBasicDockerAuth()
                }
            }, function(error, response, body) {
                if (error)
                    throw new Error(error);

                var statusCode = response.statusCode;
                if (statusCode !== 200)
                    reject(new Error("Could not find mongodb instance, status code : " + statusCode));
                else {
                    var jsonResponse = JSON.parse(body);
                    if (jsonResponse.meta.total_count === 0)
                        reject(new Error("No service called '" + that.mongodbServiceName + "' deployed on " + that.dockerApiUrl));
                    var mongodbUri = jsonResponse.objects[0].resource_uri;
                    that.dockerDeploymentJson.linked_to_service.push({
                        "to_service": mongodbUri,
                        "name": "mongodb"
                    });
                    resolve(mongodbUri);
                }
            });
        });
    },
    getBasicDockerAuth: function() {
        return "Basic c21hbGxzdGFjazpmYzVhZTNhNi1hMWQzLTQ2ZTMtOGYyZC02YTMxMWViMjRkODA=";
    }
}