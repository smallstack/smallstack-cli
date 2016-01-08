module.exports = function (grunt) {

    var path = require("path");
    var fs = require(process.cwd() + "/node_modules/fs-extra");
    var _ = require(process.cwd() + "/node_modules/underscore");

    grunt.registerTask("clean", function () {
        
        // delete all generated folders
        var alreadyDeleted = [];
        var allSmallstackDatas = grunt.file.expand("**/*.smallstack.json");
        _.each(allSmallstackDatas, function (root) {
            var dir = path.join(path.dirname(root), "generated").replace(/\\/g, "/");
            if (!_.contains(alreadyDeleted, dir)) {
                console.log("Deleting : " + dir);
                fs.removeSync(dir);
                alreadyDeleted.push(dir);
            }
        });
        
        // delete all generated js files
        grunt.util.recurse(grunt.file.expand("**/*.ts"), function (file) {
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
    });

}