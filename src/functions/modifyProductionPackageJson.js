var fs = require("fs-extra");
var _ = require("underscore");



module.exports = function modifyProductionPackageJson(file) {
    var content = require(file);
    delete content.devDependencies;
    delete content.scripts;
    content.main = content.main.replace("./dist/bundle/", "./");
    content.types = content.types.replace("./dist/bundle/", "./");

    var relativePath = "../";

    _.each(content.dependencies, function (version, name) {
        switch (name) {
            case "@smallstack/core-client":
                content.dependencies[name] = "file:" + relativePath + "core-client";
                break;
            case "@smallstack/core-common":
                content.dependencies[name] = "file:" + relativePath + "core-common";
                break;
            case "@smallstack/core-server":
                content.dependencies[name] = "file:" + relativePath + "core-server";
                break;
            case "@smallstack/meteor-client":
                content.dependencies[name] = "file:" + relativePath + "meteor-client";
                break;
            case "@smallstack/meteor-common":
                content.dependencies[name] = "file:" + relativePath + "meteor-common";
                break;
            case "@smallstack/meteor-server":
                content.dependencies[name] = "file:" + relativePath + "meteor-server";
                break;
            case "@smallstack/nativescript":
                content.dependencies[name] = "file:" + relativePath + "nativescript";
                break;
        }
    });

    fs.writeJSONSync(file, content);
}