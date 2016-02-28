module.exports = function () {

    var fs = require("fs-extra");
    var path = require("path");
    var config = require("../config");

    var meteorBuiltPath = path.join(config.meteorDirectory, "built");
    console.log("Cleaning meteor built folder : ", meteorBuiltPath);
    fs.removeSync(meteorBuiltPath);

    console.log("Cleaning tmp folder : ", config.tmpDirectory);
    fs.removeSync(config.tmpDirectory);


}