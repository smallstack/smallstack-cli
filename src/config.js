var path = require("path");
var _ = require("underscore");
var fs = require("fs-extra");
var cliPackageJson = require(__dirname + "/../package.json");
var config = {};


/** 
 * Determines how a project can be found
 */
config.projectFound = function (directory) {
    try {
        if (directory === undefined)
            directory = config.getRootDirectory();
        var meteorPackagesFilePath = path.join(directory, "meteor", ".meteor", "packages");
        return fs.existsSync(meteorPackagesFilePath);
    } catch (e) {
        return false;
    }
}
config.smallstackFound = function (directory) {
    try {
        var packageJSONPath = path.join(directory, "package.json");
        if (!fs.existsSync(packageJSONPath))
            return false;
        var packageJSONContent = require(packageJSONPath);
        return packageJSONContent["name"] === "@smallstack/core";
    } catch (e) {
        return false;
    }
}

config.isSmallstackEnvironment = function () {
    return config.smallstackFound(config.rootDirectory);
}

config.isProjectEnvironment = function () {
    return config.projectFound(config.rootDirectory);
}

config.calledWithCreateProjectCommand = function () {
    return process.argv[2] === "create" && process.argv[2] !== undefined;
}


config.calledWithNonProjectCommand = function () {
    return process.argv[2] === "compileNpmModule";
}

config.supersonicProjectAvailable = function () {
    return fs.existsSync(config.supersonicDirectory);
}

config.meteorProjectAvailable = function () {
    return fs.existsSync(config.meteorDirectory);
}

config.smallstackDirectoryAvailable = function () {
    return fs.existsSync(config.smallstackDirectory);
}


config.getRootDirectory = function () {

    var root = path.resolve("./");
    try {
        for (var tryIt = 0; tryIt < 15; tryIt++) {
            if (config.projectFound(root))
                return root;
            if (config.smallstackFound(root))
                return root;

            root = path.resolve(path.join(root, "../"));
        }
    } catch (e) {}
}


config.cli = cliPackageJson;
try {
    config.rootDirectory = config.getRootDirectory();

    if (config.rootDirectory) {
        if (config.isProjectEnvironment()) {
            config.builtDirectory = path.join(config.rootDirectory, "built");
            config.meteorDirectory = path.join(config.rootDirectory, "meteor");
            config.meteorSmallstackCoreDirectory = path.join(config.meteorDirectory, "node_modules", "@smallstack/core");
            config.meteorSmallstackMeteorDirectory = path.join(config.meteorDirectory, "node_modules", "@smallstack/meteor");
            config.meteorDatalayerPath = path.join(config.meteorDirectory, "node_modules", "@smallstack/datalayer");
            config.datalayerPath = path.join(config.rootDirectory, "datalayer");
            config.datalayerSmallstackDirectory = path.join(config.datalayerPath, "node_modules", "@smallstack/core");
            config.cliResourcesPath = path.join(config.datalayerSmallstackDirectory, "resources");
            config.cliTemplatesPath = path.join(config.cliResourcesPath, "templates");
            config.datalayerTemplatesPath = path.join(config.cliTemplatesPath, "datalayer");

            if (fs.existsSync(path.join(config.rootDirectory, "nativescript-app"))) {
                config.nativescriptDirectory = path.join(config.rootDirectory, "nativescript-app");
                config.nativescriptSmallstackCoreDirectory = path.join(config.rootDirectory, "nativescript-app", "node_modules", "@smallstack/core");
                config.nativescriptSmallstackNativescriptDirectory = path.join(config.rootDirectory, "nativescript-app", "node_modules", "@smallstack/nativescript");
                config.nativescriptDatalayerDirectory = path.join(config.rootDirectory, "nativescript-app", "node_modules", "@smallstack/datalayer");
            }
        }
        if (config.isSmallstackEnvironment()) {
            config.cliResourcesPath = path.join(config.rootDirectory, "resources");
            config.cliTemplatesPath = path.join(config.cliResourcesPath, "templates");
            config.datalayerTemplatesPath = path.join(config.cliTemplatesPath, "datalayer");
        }
    }

    if (fs.existsSync(config.rootDirectory + "/package.json")) {
        _.extend(config, require(config.rootDirectory + "/package.json"));
    }
} catch (e) {
    console.error(e);
}

module.exports = config;
