var fs = require("fs-extra");
var _ = require("underscore");
var glob = require("glob");
var path = require("path");

module.exports = function (parameters, done) {

    var config = require("../config");
    var notifier = require("../functions/notifier");

    // delete meteor/built
    // removeDirOrFile(path.join(config.meteorDirectory, "built"));

    // delete smallstackFolder
    // removeDirOrFile(config.smallstackDirectory);

    // delete node_modules (since we once had one in the project root)
    // removeDirOrFile(path.join(config.rootDirectory, "node_modules"));

    // delete tmp folder
    removeDirOrFile(config.tmpDirectory);

    // delete all generated folders
    var alreadyDeleted = [];
    var allSmallstackFiles = glob.sync("**/*.smallstack.json", {
        cwd: config.meteorDirectory,
        follow: true
    });
    _.each(allSmallstackFiles, function (root) {
        var dir = path.join(config.meteorDirectory, path.dirname(root), "generated").replace(/\\/g, "/");
        if (!_.contains(alreadyDeleted, dir)) {
            removeDirOrFile(dir);
            alreadyDeleted.push(dir);
        }
    });

    // delete all generated js files
    // var compiledJsFiles = glob.sync("**/*.ts", {
    //     cwd: config.meteorDirectory,
    //     follow: true
    // });
    // _.each(compiledJsFiles, function (file) {
    //     file = path.join(config.meteorDirectory, file);
    //     if (file.indexOf("node_modules") === -1) {
    //         if (file.indexOf(".d.ts") === -1) {
    //             file = file.replace(".ts", ".js");
    //             removeDirOrFile(file);
    //             file = file.replace(".js", ".js.map");
    //             removeDirOrFile(file);
    //         }
    //     }
    // });

    // console.log("Deleting : app/built");
    // removeDirOrFile("app/built");

    // console.log("Deleting : tmp");
    // removeDirOrFile("tmp");

    notifier("Cleaning completed!");
    done();
}

function removeDirOrFile(directoryOrFile) {
    console.log("Removing:", directoryOrFile);
    try {
        fs.removeSync(directoryOrFile);
    } catch (e) {
        console.error(" ");
        console.error("ERROR : Files/Directory could not be removed, maybe they are opened/locked by an IDE?");
        console.error(" ");
        throw e;
    }
}
