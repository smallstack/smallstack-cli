module.exports = function (parameters, done) {

    require("../functions/copySmallstackFiles")();
    require("../functions/compile.version")();

    var fs = require("fs-extra");
    var _ = require("underscore");
    var find = require("find");
    var path = require("path");

    var config = require("../config");
    var compiler = require("../functions/compiler");
    var notifier = require("../functions/notifier");

    // var supersonicTargetFile = config.supersonicDirectory + "/www/scripts/smallstack.js";
    // var meteorTargetFile = config.meteorDirectory + "/shared/lib/smallstack.js";
    var ddpConnectorFile = path.join(config.smallstackDirectory, "ddp-connector.js");

    function shallBeCompiled(type) {
        var keys = _.keys(parameters);
        if (keys === undefined || keys.length === 0)
            return true;
        return keys.indexOf(type) !== -1;
    }

    function compileSmallstackDataLayer(nextFn) {

        // smallstack data layer
        if (shallBeCompiled("smallstack") && config.smallstackDirectoryAvailable()) {
            console.log("compiling smallstack");
            // compiler.compileTypescriptFiles(config.smallstackDirectory, { outFile: "bundle.js", consolePrefix: "[smallstack]" });
            compiler.compileTypescriptFiles(path.join(config.smallstackDirectory, "ddp-connector"), { outFile: ddpConnectorFile, consolePrefix: "[ddp-connector]" }, function () {
                if (config.supersonicProjectAvailable()) {
                    fs.copySync(ddpConnectorFile, path.join(config.supersonicDirectory, "www", "connector", "ddp-connector.js"));
                }
                nextFn();
            });
        }
        else
            nextFn();
    }

    function compileSuperSonicFiles(nextFn) {

        // supersonic files
        if (shallBeCompiled("supersonic") && config.supersonicProjectAvailable()) {
            console.log("compiling supersonic");
            compiler.compileTypescriptFiles(config.supersonicDirectory + "/www", { consolePrefix: "[supersonic]" }, nextFn);
        }
        else
            nextFn();
    }

    function compileMeteorFiles(nextFn) {

        // meteor files
        if (shallBeCompiled("meteor") && config.meteorProjectAvailable()) {
            var meteorBuiltPath = path.join(config.tmpDirectory, "meteorbuilt");
            fs.removeSync(meteorBuiltPath);
            console.log("compiling meteor");
            compiler.compileTypescriptFiles(config.meteorDirectory, { outDir: meteorBuiltPath, consolePrefix: "[meteor]    " }, function () {

                // cut of global scope
                console.log("removing global scope for meteor...");
                _.each(find.fileSync(/\.js$/, meteorBuiltPath), function (file) {
                    compiler.removeGlobalScope(file);
                });


                console.log("copying files into meteor folder...");
                if (fs.existsSync(path.join(meteorBuiltPath, "packages")))
                    fs.copySync(path.join(meteorBuiltPath, "packages"), path.join(config.meteorDirectory, "packages"), { clobber: true });

                if (fs.existsSync(path.join(meteorBuiltPath, "client")))
                    fs.copySync(path.join(meteorBuiltPath, "client"), path.join(config.meteorDirectory, "built", "client"), { clobber: true });

                if (fs.existsSync(path.join(meteorBuiltPath, "server")))
                    fs.copySync(path.join(meteorBuiltPath, "server"), path.join(config.meteorDirectory, "built", "server"), { clobber: true });

                if (fs.existsSync(path.join(meteorBuiltPath, "shared")))
                    fs.copySync(path.join(meteorBuiltPath, "shared"), path.join(config.meteorDirectory, "built", "shared"), { clobber: true });

                nextFn();
            });
        }
        else
            nextFn();

    }

    compileSmallstackDataLayer(function () {
        compileSuperSonicFiles(function () {
            compileMeteorFiles(function () {
                notifier("Compilation completed!");
                done();
            });
        });
    });
}