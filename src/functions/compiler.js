var fs = require("fs-extra");
var path = require("path");
var _ = require("underscore");
var find = require("find");
var exec = require('child_process').exec;
var config = require("../config");


var compiler = {

    compileTypescriptFiles: function (directory, options, doneFn) {
        options = options || {};
        options.excludes = options.excludes || [];
        options.consolePrefix = options.consolePrefix || "";

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
        if (options.outFile !== undefined)
            command += "--outFile " + options.outFile;
        if (options.outDir !== undefined)
            command += "--outDir " + options.outDir;

        // command += " --watch";

        //console.log("Command : ", command);
        var process = exec(command, {
            cwd: directory
        });
        process.stdout.on('data', function (data) {
            _.each(data.split("\n"), function (line) {
                console.log(' |-- ' + options.consolePrefix + " INFO " + line);
            });
        });
        process.stderr.on('data', function (data) {
            _.each(data.split("\n"), function (line) {
                console.error(' |-- ' + options.consolePrefix + " ERROR " + line);
            });
        });
        process.on('close', function (code) {
            console.log(' |-- Done with return code : ', code);
            if (code !== 0)
                throw new Error("Process did not return 0! Please have a look at the log for errors!");
            if (typeof doneFn === 'function')
                doneFn();
        });
    },

    removeGlobalScope: function (javascriptFilePath) {
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