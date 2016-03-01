var path = require("path");
var fs = require("fs-extra");
var config = require("../config");
var templating = require("./templating");  

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
            throw new Error("Could not find deployment with name '" + environment + "'! (You can specify the deployment via '--environment NAME)");
        currentDeployment.name = environment;
        currentDeployment.database = { name: "<%=projectName%>_" + currentDeployment.name };

        return currentDeployment;
    },
    apacheConfig: function (deployment) {

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

    }
}