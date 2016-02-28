module.exports = function (type, watch) {
    if (watch === undefined)
        watch = false;

    require("../functions/copySmallstackFiles")();

    var fs = require("fs-extra");
    var _ = require("underscore");
    var find = require("find");
    var path = require("path");
    var config = require("../config");
    var compiler = require("../functions/compiler");

    var supersonicTargetFile = config.supersonicDirectory + "/www/scripts/smallstack.js";
    var meteorTargetFile = config.meteorDirectory + "/shared/lib/smallstack.js";
    var smallstackOutFile = "smallstack/smallstack.js";
    
    
    // smallstack data layer
    // if (type === "smallstack" || type === undefined && config.smallstackDirectoryAvailable()) {
    //     console.log("compiling smallstack");
    //     compiler.compileTypescriptFiles(config.smallstackDirectory, { outFile: smallstackOutFile, consolePrefix: "[smallstack]" }, copySingleJavascriptFile);
    // }

    // supersonic files
    if ((type === "supersonic" || type === undefined) && config.supersonicProjectAvailable()) {
        console.log("compiling supersonic");
        compiler.compileTypescriptFiles(config.supersonicDirectory, { consolePrefix: "[supersonic]" });
    }

    // meteor files
    if ((type === "meteor" || type === undefined) && config.meteorProjectAvailable()) {
        var meteorBuiltPath = path.join(config.tmpDirectory, "meteorbuilt");
        fs.removeSync(meteorBuiltPath);
        console.log("compiling meteor");
        compiler.compileTypescriptFiles(config.meteorDirectory, { outDir: meteorBuiltPath, consolePrefix: "[meteor]    " }, function () {

            // cut of global scope
            _.each(find.fileSync(/\.js$/, meteorBuiltPath), function (file) {
                compiler.removeGlobalScope(file);
            });


            if (fs.existsSync(path.join(meteorBuiltPath, "packages")))
                fs.copySync(path.join(meteorBuiltPath, "packages"), path.join(config.meteorDirectory, "packages"), { clobber: true });

            if (fs.existsSync(path.join(meteorBuiltPath, "client")))
                fs.copySync(path.join(meteorBuiltPath, "client"), path.join(config.meteorDirectory, "built", "client"), { clobber: true });

            if (fs.existsSync(path.join(meteorBuiltPath, "server")))
                fs.copySync(path.join(meteorBuiltPath, "server"), path.join(config.meteorDirectory, "built", "server"), { clobber: true });

            if (fs.existsSync(path.join(meteorBuiltPath, "shared")))
                fs.copySync(path.join(meteorBuiltPath, "shared"), path.join(config.meteorDirectory, "built", "shared"), { clobber: true });
        });
    }


    function copySingleJavascriptFile() {
        if (config.supersonicProjectAvailable()) {
            fs.copySync(smallstackOutFile, supersonicTargetFile);
            compiler.removeGlobalScope(supersonicTargetFile);
            console.log("Created : " + supersonicTargetFile);
        }

        if (config.meteorProjectAvailable()) {
            fs.copySync(smallstackOutFile, meteorTargetFile);
            compiler.removeGlobalScope(meteorTargetFile);
            console.log("Created : " + meteorTargetFile);
        }
    }

  
    
    
    

    // grunt.registerTask("typescriptToMeteorFix", function () {
    //     console.log("Deleting obsolete files...");
    //     fs.removeSync("tmp/built/app/packages");
    //     fs.removeSync("tmp/built/packages/server");
    //     fs.removeSync("tmp/built/packages/shared");
    //     fs.removeSync("tmp/built/packages/client");

    //     console.log("Fixing typescript files...");
    //     var processFunction = function (content) {
    //         var returnContent = "";
    //         var splitArray = content.split("\n");
    //         for (var i = 0; i < splitArray.length; i++) {
    //             if (returnContent.length > 0)
    //                 returnContent += "\n";
    //             if (splitArray[i].indexOf("var ") === 0)
    //                 returnContent += splitArray[i].substr(4);
    //             else if (splitArray[i].indexOf("///") === 0)
    //                 returnContent += "";
    //             else
    //                 returnContent += splitArray[i];
    //         }
    //         return returnContent;
    //     };
    //     grunt.util.recurse(grunt.file.expand(["tmp/built/**/*.js"]), function (file) {
    //         grunt.file.copy(file, file, {
    //             process: processFunction
    //         });
    //     });
        
    //     // move files
    //     if (grunt.file.exists("tmp/built/app")) {
    //         fs.removeSync("app/built");
    //         fs.copySync("tmp/built/app", "app/built", { clobber: true });
    //     }
    //     if (grunt.file.exists("tmp/built/packages")) {
    //         fs.copySync("tmp/built/packages", "app", { clobber: true });
    //     }

    //     fs.removeSync("tmp/built");
    // });


}