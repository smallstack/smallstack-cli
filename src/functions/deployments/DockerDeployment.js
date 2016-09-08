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
    status: {
        blueAvailable: undefined,
        greenAvailable: undefined
    },
    start: function(deployment) {
        var that = this;
        that.deployment = deployment;
        console.log("Starting Docker Deployment...");

        that.preparePostJson(deployment).then(function() {
            return that.addMongoDBUrls();
        }).then(function() {
            return that.addEnvironmentVariables(deployment);
        }).then(function() {
            return that.createService(deployment);
        }).then(function(serviceUUID) {
            return that.serviceCommand(serviceUUID, "start");
        }).then(function(serviceUUID) {
            return that.tidyUp();
        }).catch(function(error) {
            throw error;
        });
    },
    createService: function(deployment) {
        var that = this;

        return new Promise(function(resolve, reject) {
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
    serviceCommand: function(serviceUUID, command) {
        var that = this;
        return new Promise(function(resolve, reject) {
            var url = that.dockerApiUrl + "/service/" + serviceUUID + "/" + command + "/";
            console.log("--> POST " + url);
            request({
                method: "POST",
                url: url,
                headers: {
                    "Authorization": that.getBasicDockerAuth()
                }
            }, function(error, response, body) {
                if (error)
                    throw new Error(error);

                var statusCode = response.statusCode;
                if (statusCode !== 202) {
                    console.error(body);
                    reject(new Error("Could not " + command + " service! - " + statusCode + " - " + JSON.stringify(body)));
                }
                else {
                    resolve();
                }
            });
        });
    },
    terminateService: function(serviceUUID) {
        var that = this;
        return new Promise(function(resolve, reject) {
            var url = that.dockerApiUrl + "/service/" + serviceUUID + "/";
            console.log("--> DELETE " + url);
            request({
                method: "DELETE",
                url: url,
                headers: {
                    "Authorization": that.getBasicDockerAuth()
                },
                followAllRedirects: true
            }, function(error, response, body) {
                if (error)
                    throw new Error(error);

                var statusCode = response.statusCode;
                if (statusCode !== 202) {
                    console.error(body);
                    reject(new Error("Could not terminate service! - " + statusCode + " - " + JSON.stringify(body)));
                }
                else {
                    resolve();
                }
            });
        });
    },
    tidyUp: function() {
        var that = this;
        return new Promise(function(resolve, reject) {
            console.log(that.status);
            if (that.deployment.docker.bluegreendeployment) {
                if (that.status.greenAvailable === false || that.status.greenAvailable === undefined) {
                    that.getServicesByName("project-" + config.name + "-green").then(function(services) {
                        _.each(services, function(service) {
                            if (service.state !== "Terminated")
                                that.terminateService(service.uuid);
                        });
                        resolve();
                    });
                }
                else if (that.status.blueAvailable === false || that.status.blueAvailable === undefined) {
                    that.getServicesByName("project-" + config.name + "-blue").then(function(services) {
                        _.each(services, function(service) {
                            if (service.state !== "Terminated")
                                that.terminateService(service.uuid);
                        });
                        resolve();
                    });
                }
            }
            resolve();
        });
    },
    preparePostJson: function(deployment) {
        var that = this;
        return new Promise(function(resolve, reject) {
            that.getNextServiceName(deployment).then(function(serviceName) {
                console.log("using service name : ", serviceName);
                that.dockerDeploymentJson = {
                    "image": "ulexus/meteor",
                    "name": serviceName,
                    "autorestart": "ALWAYS",
                    "autoredeploy": true,
                    "net": "bridge",
                    "container_envvars": [
                        {
                            "key": "RELEASE",
                            "value": "1.3.1"
                        },
                        {
                            "key": "DEPLOY_KEY",
                            "value": "/opt/docker/keys/private/bitbucket.id_rsa"
                        },
                        {
                            "key": "APP_DIR",
                            "value": "/opt/bundles/" + config.name + "/" + deployment.name
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
                        },
                        {
                            "host_path": "/opt/bundles",
                            "container_path": "/opt/bundles"
                        }]
                }
                resolve();
            });
        });
    },
    getNextServiceName: function(deployment) {
        var that = this;
        return new Promise(function(resolve, reject) {
            var serviceName = "project-" + config.name;
            if (serviceName.length > 25)
                throw new Error("Service name '" + serviceName + "' is too long!");
            var blueGreenDeploymentEnabled = deployment.docker.bluegreendeployment === true;
            if (blueGreenDeploymentEnabled) {
                that.checkServiceAvailablility(serviceName + "-blue").then(function(result) {
                    that.status.blueAvailable = result;
                    if (result) {
                        resolve(serviceName + "-blue");
                    }
                    else {
                        that.checkServiceAvailablility(serviceName + "-green").then(function(result) {
                            that.status.greenAvailable = result;
                            if (result) {
                                resolve(serviceName + "-green");
                            }
                            else
                                throw new Error("Blue Green Deployment is enabled, but both instances are running! Please terminate one of them!");
                        });
                    }
                });
            }
            else {
                resolve(serviceName);
            }
        });
    },
    checkServiceAvailablility: function(name) {
        console.log("Checking availablility of service:", name);
        var that = this;
        return new Promise(function(resolve, reject) {
            that.getServicesByName(name).then(function(results) {
                var foundUnterminatedServices = 0;
                _.each(results, function(result) {
                    if (result.state !== "Terminated")
                        foundUnterminatedServices++;
                });
                console.log("                   services found:", foundUnterminatedServices);
                resolve(foundUnterminatedServices === 0);
            });
        });
    },
    getServicesByName: function(name) {
        var that = this;
        return new Promise(function(resolve, reject) {
            var url = that.dockerApiUrl + "/service?name=" + name;
            console.log("--> GET  : ", url);
            request({
                method: "GET",
                uri: url,
                headers: {
                    "Authorization": that.getBasicDockerAuth()
                }
            }, function(error, response, body) {
                if (error)
                    throw new Error(error);
                resolve(JSON.parse(body).objects);
            });
        });
    },
    addEnvironmentVariables: function(deployment) {
        var that = this;
        return new Promise(function(resolve, reject) {

            var envs = {};
            if (deployment.url === undefined)
                reject(new Error("No deployment URL defined in deployment.json!"));
            // else if (deployment.repository.url === undefined)
            //     reject(new Error("No repository.url defined in deployment.json!"));
            // else if (deployment.repository.branch === undefined)
            //     reject(new Error("No repository.branch defined in deployment.json!"));
            else if (deployment.docker.database.name === undefined)
                reject(new Error("No docker.database.name defined in deployment.json!"));
            else {
                // that.dockerDeploymentJson["container_envvars"].push({
                //     "key": "REPO",
                //     "value": deployment.repository.url
                // });
                // that.dockerDeploymentJson["container_envvars"].push({
                //     "key": "BRANCH",
                //     "value": deployment.repository.branch
                // });
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
                    console.log("using mongo uri : ", mongodbUri);
                    resolve(mongodbUri);
                }
            });
        });
    },
    getBasicDockerAuth: function() {
        return "Basic c21hbGxzdGFjazpmYzVhZTNhNi1hMWQzLTQ2ZTMtOGYyZC02YTMxMWViMjRkODA=";
    }
}