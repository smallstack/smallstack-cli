var path = require("path");
var fs = require("fs-extra");
var config = require("../config");

module.exports = {

    getDeployments: function () {

        var deploymentConfig = {};

        // init 
        deploymentConfig.path = path.join(config.rootDirectory, "deployment");
        deploymentConfig.fileName = "deployments";
        deploymentConfig.fileEnding = ".json";
        deploymentConfig.file = path.join(deploymentConfig.path, deploymentConfig.fileName + deploymentConfig.fileEnding);

        // prepare
        if (!fs.existsSync(deploymentConfig.file)) {
            throw new Error("Deployments File (" + deploymentConfig.file + ") not found. Use 'smallstack deploy --createDefaults' to create a default one!");
        }

        return require(deploymentConfig.file);
    },
    getDeployment: function (environment) {

        var currentDeployment = this.getDeployments()[environment];
        if (currentDeployment === undefined)
            throw new Error("Could not find deployment with name '" + environment + "'! (You can specify the deployment via 'smallstack deploy [COMMAND] --environment NAME)");
        currentDeployment.name = environment;
        currentDeployment.database = { name: "<%=projectName%>_" + currentDeployment.name };

        return currentDeployment;
    }
}