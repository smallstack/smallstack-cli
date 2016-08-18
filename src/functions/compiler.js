var fs = require("fs-extra");
var path = require("path");
var _ = require("underscore");
var glob = require("glob");
var config = require("../config");
var exec = require("./exec");

var compiler = {

    compileTypescriptFiles: function(directory, options, doneFn) {
        options = options || {};
        options.excludes = options.excludes || [];
        options.consolePrefix = options.consolePrefix || "";

        if (directory === undefined || !fs.existsSync(directory))
            throw new Error("Cannot compile non-existing directory : " + path.resolve(directory));

        console.log("searching typescript files in directory:", directory);
        var allTSFiles = glob.sync("**/*.ts", {
            cwd: directory,
            follow: true,
            ignore: "**/node_modules/**"
        });

        var filtered = "";
        _.each(allTSFiles, function(file) {
            if (file.indexOf(".d.ts") === -1)
                filtered += path.join(directory, file) + "\n";
        });

        if (!filtered.length) {
            console.log("No typescript files found in directory : ", path.resolve(directory));
            if (typeof doneFn === 'function')
                doneFn();
            return;
        }

        var tmpDirectory = config.tmpDirectory !== undefined ? config.tmpDirectory : "./tmp";
        var commandFile = tmpDirectory + "/tscfiles.txt";
        fs.ensureDirSync(tmpDirectory);
        fs.writeFileSync(commandFile, filtered);

        var command = "tsc @" + commandFile;
        if (options.outFile !== undefined)
            command += " --outFile " + options.outFile;
        if (options.outDir !== undefined)
            command += " --outDir " + options.outDir;
        command += " --experimentalDecorators";
        command += " --emitDecoratorMetadata";
        command += " --target ES5";
        // command += " --watch";

        exec(command, {
            cwd: directory,
            finished: doneFn,
            error: function(error) {
                throw new Error("Compilation failed : " + error);
            }
        });
    },

    removeGlobalScope: function(javascriptFilePath) {
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
}


module.exports = compiler