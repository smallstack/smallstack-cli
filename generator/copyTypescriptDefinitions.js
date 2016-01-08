module.exports = function () {

    var config = require("./config");
    var fs = require("fs-extra");
    try {
        fs.copySync(__dirname + "/resources/typedefinitions", config.pathToTypeDefinitions);
    } catch (e) {
        console.error("Could not copy typescript definitions!", e);
    }
}