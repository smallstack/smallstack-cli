module.exports = function () {

    var generateSources = require("../generator/generateSources");
    var copyTypescriptDefinitions = require("../generator/copyTypescriptDefinitions");
    var copySmallstackFiles = require("../generator/copySmallstackFiles");

    copyTypescriptDefinitions();
    copySmallstackFiles();
    generateSources();
}