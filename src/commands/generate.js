module.exports = function () {

    var generateSources = require("../generator/generateSources");
    var copyTypescriptDefinitions = require("../generator/copyTypescriptDefinitions");
    var copySmallstackFiles = require("../generator/copySmallstackFiles");
    var smallstack = require("./smallstack.json");

    copyTypescriptDefinitions();
    copySmallstackFiles();
    generateSources();
}