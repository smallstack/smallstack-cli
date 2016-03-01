var path = require("path");
var _ = require("underscore");
var fs = require("fs-extra");
var cliPackageJson = require(__dirname + "/../package.json");
var config = {};

if (fs.existsSync(process.cwd() + "/package.json")) {
    config = require(process.cwd() + "/package.json");
}


/** 
 * Determines how a project can be found
 */
config.projectFound = function (directory) {
    try {
        if (directory === undefined)
            directory = config.getRootDirectory();
        var packageJSONPath = path.join(directory, "package.json");
        if (!fs.existsSync(packageJSONPath))
            return false
        var packageJSONContent = require(packageJSONPath);
        if (packageJSONContent["smallstack"] !== undefined)
            return true;
    } catch (e) {
        return false;
    }
}

// config.calledWithNonProjectCommands = function () {
//     return process.argv[2] === undefined || !_.contains(["create", "--help", "-h", "-v", "--version"], process.argv[2].toLowerCase());
// }

config.calledWithCreateProjectCommand = function () {
    return process.argv[2] === "create" && process.argv[2] !== undefined;
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
    if (config.projectFound(root))
        return root;

    try {
        for (var tryIt = 0; tryIt < 15; tryIt++) {
            root = path.resolve(path.join(root, "../"));

            if (config.projectFound(root))
                return root;
        }
    } catch (e) { }

    throw new Error("No root directory found!");
}


config.cli = cliPackageJson;
try {
    config.rootDirectory = config.getRootDirectory();
    config.tmpDirectory = path.join(config.rootDirectory, "tmp");
    config.smallstackDirectory = path.join(config.rootDirectory, "smallstack");
    if (fs.existsSync(path.join(config.rootDirectory, "app"))) {
        console.warn("Warning: Folder called 'app' found. Please consider renaming it to 'meteor' if you don't need the old grunt tasks anymore!");
        config.meteorDirectory = path.join(config.rootDirectory, "app");
    }
    else
        config.meteorDirectory = path.join(config.rootDirectory, "meteor");

    config.pathToTypeDefinitions = path.join(config.meteorDirectory, "packages/smallstack-core/typedefinitions");
    config.supersonicDirectory = path.join(config.rootDirectory, "supersonic");
    config.packagesDirectory = path.join(config.meteorDirectory, "packages");
    config.cliResourcesPath = path.join(__dirname, "resources");
    config.cliTemplatesPath = path.join(config.cliResourcesPath, "templates");
    config.datalayerTemplatesPath = path.join(config.cliTemplatesPath, "datalayer");
    config.pathToGeneratedDefinitions = config.meteorDirectory + "/typedefinitions";
    config.pathToGeneratedDefinitionsFile = path.join(config.pathToGeneratedDefinitions, "generated.d.ts");
}
catch (e) {
    // console.error(e);
}

module.exports = config;