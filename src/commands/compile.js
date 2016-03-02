module.exports = function (type, watch) {
    if (watch === undefined)
        watch = false;

    require("../functions/copySmallstackFiles")();
    var compileVersion = require("../functions/compile.version");

    var fs = require("fs-extra");
    var _ = require("underscore");
    var find = require("find");
    var path = require("path");
    var config = require("../config");
    var compiler = require("../functions/compiler");
    var notifier = require("../functions/notifier");

    // var supersonicTargetFile = config.supersonicDirectory + "/www/scripts/smallstack.js";
    // var meteorTargetFile = config.meteorDirectory + "/shared/lib/smallstack.js";
    
    
    // smallstack data layer
    if (type === "smallstack" || type === undefined && config.smallstackDirectoryAvailable()) {
        console.log("compiling smallstack");
        // compiler.compileTypescriptFiles(config.smallstackDirectory, { outFile: "bundle.js", consolePrefix: "[smallstack]" });
        compiler.compileTypescriptFiles(path.join(config.smallstackDirectory, "ddp-connector"), { outFile: "../ddp-connector.js", consolePrefix: "[ddp-connector]" });
    }

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

    compileVersion();

    // function copySingleJavascriptFile() {
    //     if (config.supersonicProjectAvailable()) {
    //         fs.copySync(smallstackOutFile, supersonicTargetFile);
    //         compiler.removeGlobalScope(supersonicTargetFile);
    //         console.log("Created : " + supersonicTargetFile);
    //     }

    //     if (config.meteorProjectAvailable()) {
    //         fs.copySync(smallstackOutFile, meteorTargetFile);
    //         compiler.removeGlobalScope(meteorTargetFile);
    //         console.log("Created : " + meteorTargetFile);
    //     }
    // }


    notifier("Compilation completed!");




}