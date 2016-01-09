var path = require("path");
var fs = require("fs-extra");
var cliPackageJson = require(__dirname + "/../package.json");
var config = {};

if (fs.existsSync(process.cwd() + "/smallstack.json")) {
    config = require(process.cwd() + "/smallstack.json");
}

if (fs.existsSync(process.cwd() + "/package.json")) {
    config.pkg = require(process.cwd() + "/package.json");
}

config.cli = cliPackageJson;
config.rootDirectory = path.resolve("./");
config.smallstackDirectory = path.join(config.rootDirectory, "smallstack");
config.pathToTypeDefinitions = path.join(config.smallstackDirectory, "typedefinitions");
config.meteorDirectory = path.join(process.cwd(), "meteor");
config.packagesDirectory = path.join(config.meteorDirectory, "packages");
config.datalayerTemplatesPath = path.join(__dirname, "resources/templates/datalayer");
config.pathToGeneratedDefinitions = config.meteorDirectory + "/typedefinitions";
config.pathToGeneratedDefinitionsFile = path.join(config.pathToGeneratedDefinitions, "generated.d.ts");




module.exports = config;