module.exports = function () {

    var fs = require("fs-extra");
    var _ = require("underscore");
    var glob = require("glob");
    var path = require("path");
    var config = require("../config");

    // delete meteor/built
    var meteorBuiltPath = path.join(config.meteorDirectory, "built");
    console.log("Cleaning meteor built folder : ", meteorBuiltPath);
    fs.removeSync(meteorBuiltPath);

    // delete smallstackFolder
    var smallstackPath = config.smallstackDirectory;
    console.log("Cleaning smallstack folder : ", smallstackPath);
    fs.removeSync(smallstackPath);

    // delete node_modules (since we once had one in the project root)
    var nodeModulesPath = path.join(config.rootDirectory, "node_modules");
    console.log("Cleaning node_modules folder (since we once had one in the project root) : ", nodeModulesPath);
    fs.removeSync(nodeModulesPath);

    // delete tmp folder
    console.log("Cleaning tmp folder : ", config.tmpDirectory);
    fs.removeSync(config.tmpDirectory);
    
    // delete all generated folders
    var alreadyDeleted = [];
    var allSmallstackFiles = glob.sync("**/*.smallstack.json", {
        cwd: config.meteorDirectory,
        follow: true
    });
    _.each(allSmallstackFiles, function (root) {
        var dir = path.join(config.meteorDirectory, path.dirname(root), "generated").replace(/\\/g, "/");
        if (!_.contains(alreadyDeleted, dir)) {
            console.log("Deleting : " + dir);
            fs.removeSync(dir);
            alreadyDeleted.push(dir);
        }
    });
        
    // delete all generated js files
    var compiledJsFiles = glob.sync("**/*.ts", {
        cwd: config.meteorDirectory,
        follow: true
    });
    _.each(compiledJsFiles, function (file) {
        file = path.join(config.meteorDirectory, file);
        if (file.indexOf("node_modules") === -1) {
            if (file.indexOf(".d.ts") === -1) {
                file = file.replace(".ts", ".js");
                console.log("Deleting : " + file);
                fs.removeSync(file);
                file = file.replace(".js", ".js.map");
                console.log("Deleting : " + file);
                fs.removeSync(file);
            }
        }
    });

    console.log("Deleting : app/built");
    fs.removeSync("app/built");

    console.log("Deleting : tmp");
    fs.removeSync("tmp");


}