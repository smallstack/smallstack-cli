module.exports = function (type, watch) {
    if (watch === undefined)
        watch = false;

    var fs = require("fs-extra");
    var path = require("path");
    var _ = require("underscore");
    var find = require("find");
    var exec = require('child_process').exec;

    require("../functions/copySmallstackFiles")();
    var config = require("../config");

    var supersonicTargetFile = config.supersonicDirectory + "/www/scripts/smallstack.js";
    var meteorTargetFile = config.meteorDirectory + "/shared/lib/smallstack.js";
    
    // smallstack data layer
    if (type === "smallstack" || type === undefined) {
        var smallstackOutFile = "smallstack/smallstack.js";
        compileTypescriptFiles(config.smallstackDirectory, smallstackOutFile, copySingleJavascriptFile);
    }

    // supersonic files
    if (type === "supersonic" || type === undefined)
        compileTypescriptFiles(config.supersonicDirectory);

    function compileTypescriptFiles(directory, outFile, doneFn) {
        if (directory === undefined || !fs.existsSync(directory))
            throw new Error("Cannot compile non-existing directory : " + path.resolve(directory));

        var allTSFiles = "";
        _.each(find.fileSync(/\.ts$/, directory), function (file) {
            if (file.indexOf(".d.ts") === -1)
                allTSFiles += "\"" + file + "\" ";
        });

        if (allTSFiles === "") {
            console.log("No typescript files found in directory : ", path.resolve(directory));
            if (typeof doneFn === 'function')
                doneFn();
            return;
        }

        var command = "tsc " + allTSFiles.toString();
        if (outFile !== undefined)
            command += "--outFile " + outFile;

        console.log("Command : ", command);
        var process = exec(command, {
            cwd: directory
        });
        process.stdout.on('data', function (data) {
            console.log(' |-- ' + data);
        });
        process.stderr.on('data', function (data) {
            console.error(' |-- ' + data);
            throw new Error("Aborting since meteor application could not be created!");
        });
        process.on('close', function (code) {
            console.log(' |-- Done!');
            if (typeof doneFn === 'function')
                doneFn();
        });
    }

    function copySingleJavascriptFile() {
        if (config.supersonicProjectAvailable()) {
            fs.copySync(smallstackOutFile, supersonicTargetFile);
            removeGlobalScope(supersonicTargetFile);
            console.log("Created : " + supersonicTargetFile);
        }

        if (config.meteorProjectAvailable()) {
            fs.copySync(smallstackOutFile, meteorTargetFile);
            removeGlobalScope(meteorTargetFile);
            console.log("Created : " + meteorTargetFile);
        }
    }

    function removeGlobalScope(javascriptFilePath) {
        var content = fs.readFileSync(javascriptFilePath).toString();
        var returnContent = "";
        var splitArray = content.split("\n");
        for (var i = 0; i < splitArray.length; i++) {
            if (returnContent.length > 0)
                returnContent += "\n";
            if (splitArray[i].indexOf("var ") === 0)
                returnContent += splitArray[i].substr(4);
            else if (splitArray[i].indexOf("///") === 0)
                returnContent += "";
            else
                returnContent += splitArray[i];
        }
        fs.writeFileSync(javascriptFilePath, returnContent);
    }
    
    
    
    
    

    // grunt.registerTask("compile:auto", ["compile", "watch"]);

    // grunt.registerTask("compile", ["cleanBuiltDirectory", "persistVersion", "ts:packages", "ts:project", "typescriptToMeteorFix"]);
    // grunt.registerTask("compile:project", ["cleanBuiltDirectory", "persistVersion", "ts:project", "typescriptToMeteorFix"]);
    // grunt.registerTask("compile:packages", ["cleanBuiltDirectory", "persistVersion", "ts:packages", "typescriptToMeteorFix"]);



    // // CUSTOM TASKS
    // grunt.registerTask("cleanBuiltDirectory", function () {
    //     fs.removeSync("tmp/built");
    // });

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

    // grunt.registerTask("persistVersion", function () {
    //     console.log("Persisting Versions...");

    //     // smallstack version
    //     var versionCheckFile = "app/packages/smallstack-core/package.js";
    //     if (!grunt.file.exists(versionCheckFile)) {
    //         throw new Error("Version cannot be persisted since file does not exist : " + versionCheckFile);
    //     }

    //     var versionCheckFileContent = grunt.file.read(versionCheckFile);
    //     var regex = /([\'|\"]?version[\'|\"]?[ ]*:[ ]*[\'|\"]?)(\d+\.\d+\.\d+-?[a-zA-Z]*)([\'|\"]?)/;
    //     var matches = regex.exec(versionCheckFileContent);
    //     var version = matches[2];
    //     if (version === null || version === undefined)
    //         throw new Error("Could not find version in file : ", versionCheckFile);
            
    //     // project version
    //     var packageJson = grunt.file.readJSON('package.json');

    //     var content = "";
    //     content += "// THIS FILE IS AUTO-GENERATED BY 'grunt compile'!\n\n";
    //     content += "declare var versions: { smallstack: string, project: string, compileDate: number };\n\n";
    //     content += "versions = {\n";
    //     content += "\tsmallstack: \"" + version + "\",\n";
    //     content += "\tproject: \"" + packageJson.version + "\",\n";
    //     content += "\tcompileDate: " + new Date().getTime() + "\n";
    //     content += "}";

    //     grunt.file.write("app/shared/versions.ts", content);
    // });
}