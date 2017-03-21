var path = require("path");
var _ = require("underscore");
var fs = require("fs-extra");
var config = require("../config");


module.exports = function (parameters, done) {
    if (parameters && parameters.file)
        modifyProductionPackageJson(path.resolve(config.rootDirectory, parameters.file));
    else
        modifyProductionPackageJson(path.resolve(config.rootDirectory, "package.json"));
}


function modifyProductionPackageJson(file) {
    var content = require(file);
    delete content.devDependencies;
    delete content.dependencies;
    delete content.scripts;
    content.main = content.main.replace("./dist/bundle/", "./")
    content.types = content.types.replace("./dist/bundle/", "./")
    fs.writeJSONSync(file, content);
}
