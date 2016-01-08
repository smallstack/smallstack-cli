module.exports = function () {

    var config = require("./config");
    var fs = require("fs-extra");
    try {
        fs.copySync(__dirname + "/resources/smallstack", config.pathToSmallstackFiles);
    } catch (e) {
        console.error("Could not copy smallstack files!", e);
    }
}