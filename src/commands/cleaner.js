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
            }
        }
    });

    console.log("Deleting : app/built");
    fs.removeSync("app/built");

    console.log("Deleting : tmp");
    fs.removeSync("tmp");


}