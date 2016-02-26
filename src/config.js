var path = require("path");
var _ = require("underscore");
var fs = require("fs-extra");
var cliPackageJson = require(__dirname + "/../package.json");
var config = {};

if (fs.existsSync(process.cwd() + "/smallstack.json")) {
    config = require(process.cwd() + "/smallstack.json");
}

if (fs.existsSync(process.cwd() + "/package.json")) {
    config.pkg = require(process.cwd() + "/package.json");
}


/** 
 * Determines how a project can be found
 */
config.projectFound = function (directory) {
    try {
        if (directory === undefined)
            directory = config.getRootDirectory();
        return fs.existsSync(path.join(directory, "smallstack.json"));
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

config.smallstackDirectoryAvailable = function() {
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
    config.smallstackDirectory = path.join(config.rootDirectory, "smallstack");
    config.pathToTypeDefinitions = path.join(config.smallstackDirectory, "typedefinitions");
    if (fs.existsSync(path.join(config.rootDirectory, "app"))) {
        console.warn("Warning: Folder called 'app' found. Please consider renaming it to 'meteor' if you don't need the old grunt tasks anymore!");
        config.meteorDirectory = path.join(config.rootDirectory, "app");
    }
    else
        config.meteorDirectory = path.join(config.rootDirectory, "meteor");

    config.supersonicDirectory = path.join(config.rootDirectory, "supersonic");
    config.packagesDirectory = path.join(config.meteorDirectory, "packages");
    config.datalayerTemplatesPath = path.join(__dirname, "resources/templates/datalayer");
    config.pathToGeneratedDefinitions = config.meteorDirectory + "/typedefinitions";
    config.pathToGeneratedDefinitionsFile = path.join(config.pathToGeneratedDefinitions, "generated.d.ts");
}
catch (e) {
    // console.error(e);
}

module.exports = config;