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


function checkModule(path, name) {
    if (!fs.existsSync(path))
        return false;
    var packageContent = require(path);
    return packageContent["name"] === name;
}



config.smallstackFound = function (directory) {
    try {
        // core common module available?
        if (checkModule(path.join(directory, "modules", "core-common", "package.json"), "@smallstack/core-common"))
            return true;
    } catch (e) {
        return false;
    }
}

config.smallstackModuleFound = function (directory) {
    try {
        if (checkModule(path.join(directory, "package.json"), "@smallstack/core-common"))
            return true;
        if (checkModule(path.join(directory, "package.json"), "@smallstack/core-client"))
            return true;
        if (checkModule(path.join(directory, "package.json"), "@smallstack/core-server"))
            return true;
        if (checkModule(path.join(directory, "package.json"), "@smallstack/meteor-common"))
            return true;
        if (checkModule(path.join(directory, "package.json"), "@smallstack/meteor-client"))
            return true;
        if (checkModule(path.join(directory, "package.json"), "@smallstack/meteor-server"))
            return true;
        if (checkModule(path.join(directory, "package.json"), "@smallstack/nativescript-client"))
            return true;
    } catch (e) {
        return false;
    }
}

config.npmPackageFound = function (directory) {
    if (!directory)
        return false;
    if (fs.existsSync(path.join(directory, ".meteor")) || config.smallstackFound(directory))
        return false;
    var packageJSONPath = path.join(directory, "package.json");
    if (!fs.existsSync(packageJSONPath))
        return false;
    var packageContent = require(packageJSONPath);
    return packageContent["name"] !== undefined;
}

config.isSmallstackEnvironment = function () {
    return config.smallstackFound(config.rootDirectory);
}

config.isProjectEnvironment = function () {
    return config.projectFound(config.rootDirectory);
}

config.isNPMPackageEnvironment = function () {
    return config.npmPackageFound(config.rootDirectory);
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

config.projectHasNativescriptApp = function() {
    return fs.existsSync(path.join(config.rootDirectory, "nativescript-app"));
}


config.getRootDirectory = function () {

    var root = path.resolve("./");
    try {
        for (var tryIt = 0; tryIt < 15; tryIt++) {
            if (config.projectFound(root))
                return root;
            if (config.smallstackFound(root))
                return root;
            if (config.npmPackageFound(root))
                return root;

            root = path.resolve(path.join(root, "../"));
        }
    } catch (e) {
        throw new Error("No suitable environment found! The smallstack CLI only works inside smallstack projects and smallstack module folders!");
    }
}


config.cli = cliPackageJson;
try {
    config.rootDirectory = config.getRootDirectory();

    if (config.rootDirectory) {
        config.tmpDirectory = path.join(config.rootDirectory, "tmp");
        if (config.isProjectEnvironment()) {
            config.builtDirectory = path.join(config.rootDirectory, "built");
            config.meteorDirectory = path.join(config.rootDirectory, "meteor");
            config.smallstackDirectory = path.join(config.rootDirectory, "smallstack");
            config.meteorSmallstackCoreClientDirectory = path.join(config.meteorDirectory, "node_modules", "@smallstack/core-client");
            config.meteorSmallstackCoreServerDirectory = path.join(config.meteorDirectory, "node_modules", "@smallstack/core-server");
            config.meteorSmallstackCoreCommonDirectory = path.join(config.meteorDirectory, "node_modules", "@smallstack/core-common");
            config.meteorSmallstackMeteorClientDirectory = path.join(config.meteorDirectory, "node_modules", "@smallstack/meteor-client");
            config.meteorSmallstackMeteorServerDirectory = path.join(config.meteorDirectory, "node_modules", "@smallstack/meteor-server");
            config.meteorSmallstackMeteorCommonDirectory = path.join(config.meteorDirectory, "node_modules", "@smallstack/meteor-common");
            config.meteorDatalayerPath = path.join(config.meteorDirectory, "node_modules", "@smallstack/datalayer");
            config.datalayerPath = path.join(config.rootDirectory, "datalayer");
            config.datalayerSmallstackCoreCommonDirectory = path.join(config.datalayerPath, "node_modules", "@smallstack/core-common");
            config.cliResourcesPath = path.join(config.smallstackDirectory, "resources");
            config.cliTemplatesPath = path.join(config.cliResourcesPath, "templates");
            config.datalayerTemplatesPath = path.join(config.cliTemplatesPath, "datalayer");

            if (config.projectHasNativescriptApp()) {
                config.nativescriptDirectory = path.join(config.rootDirectory, "nativescript-app");
                config.nativescriptSmallstackCoreClientDirectory = path.join(config.rootDirectory, "nativescript-app", "node_modules", "@smallstack/core-client");
                config.nativescriptSmallstackCoreCommonDirectory = path.join(config.rootDirectory, "nativescript-app", "node_modules", "@smallstack/core-common");
                config.nativescriptSmallstackNativescriptDirectory = path.join(config.rootDirectory, "nativescript-app", "node_modules", "@smallstack/nativescript");
                config.nativescriptDatalayerDirectory = path.join(config.rootDirectory, "nativescript-app", "node_modules", "@smallstack/datalayer");
            }
        }
        if (config.isSmallstackEnvironment()) {
            config.cliResourcesPath = path.join(config.rootDirectory, "", "resources");
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
