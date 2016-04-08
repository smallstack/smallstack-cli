module.exports = function() {


    var fs = require("fs-extra");
    var _ = require("underscore");
    var find = require("find");
    var path = require("path");

    var compiler = require("../functions/compiler");
    var notifier = require("../functions/notifier");

    compiler.compileTypescriptFiles(path.resolve("./"), { outFile: "bundle.js" }, function() {
        notifier("Compilation completed!");
    });

}