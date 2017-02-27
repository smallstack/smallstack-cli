var _ = require("underscore");

module.exports = function () {

    var commandRowWidth = 20;
    var descriptionRowWidth = 80 - commandRowWidth;

    function padStringRight(string, width) {
        var difference = width - string.length;
        if (difference > 0) {
            for (var i = 0; i < difference; i++) {
                string += " ";
            }
        }
        return string;
    }

    function printOptions(options) {
        if (options instanceof Array)
            for (var i = 0; i < options.length; i++) {
                process.stdout.write(padStringRight(options));
            }
    }

    function helpEntry(commandName, options, description) {
        process.stdout.write(padStringRight(commandName, commandRowWidth));
        process.stdout.write(padStringRight(description, descriptionRowWidth));
        if (options instanceof Array) {
            _.each(options, function (opt) {
                process.stdout.write("\n");
                process.stdout.write("  " + opt);
            });
        }
        process.stdout.write("\n");
    }

    console.log("Usage : command [options] [command [options] ...]");
    console.log(" ");
    console.log("     Example: smallstack clean setup generate compile --watch");
    console.log(" ");
    console.log("Available Commands : ");
    console.log(" ");
    helpEntry("setup", "", "sets up/updates a smallstack project or smallstack module");
    helpEntry("clean", "", "cleans generated and compiled files in a project or module");
    helpEntry("generate", "", "generates source files from *.smallstack.json");
    helpEntry("compile", ["--watch"], "compiles *.ts files in smallstack modules");
    helpEntry("bundle", "", "bundles smallstack modules");
}
