var path = require("path");

var config = {};
config.rootDirectory = path.resolve("./");
config.dataLayerDirectory = path.join(config.rootDirectory, "datalayer");
config.pathToTypeDefinitions = path.join(config.dataLayerDirectory, "typedefinitions");
config.pathToSmallstackFiles = path.join(config.dataLayerDirectory, "smallstack");
config.pathToBaseCollectionFile = path.resolve("app/packages/smallstack-collections/BaseCollection.ts");
config.appDirectory = path.join(process.cwd(), "app");
config.packagesDirectory = path.join(config.appDirectory, "packages");
config.mscTemplatesPath = path.join(__dirname, "resources/templates/msc");
config.pathToGeneratedDefinitions = config.appDirectory + "/typedefinitions";
config.pathToGeneratedDefinitionsFile = path.join(config.pathToGeneratedDefinitions, "generated.d.ts");

module.exports = config;