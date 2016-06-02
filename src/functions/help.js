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

    console.log(" ");
    console.log("Command Line Usage : command [options] [command [options] ...]");
    console.log(" ");
    console.log("     Example: smallstack clean generate compile --meteor");
    console.log(" ");
    console.log("Available Commands : ");
    console.log(" ");
    helpEntry("create", "", "creates a new project");
    helpEntry("compile", ["--meteor", "--smallstack", "--supersonic"], "compiles the project");
    helpEntry("generate", "", "generates all source files");
    helpEntry("clean", "", "removes all generated and compiled files");
    helpEntry("packages", "", "starts the package manager");


    // commander.command("create <name>").action(create);
    // commander.command("clean").action(cleaner);
    // commander.command("jenkins").action(jenkins).option("--environment [env]");
    // commander.command("deploy").action(deploy).option("--apache-config").option("--createDefaults").option("--environment [env]").option("--prepareMobile");
    // commander.command("bundle").action(bundle);
    // commander.command("generate").action(generate);
    // commander.command("compile [smallstack|meteor|supersonic]").action(compile);
    // commander.command("compileNpmModule").action(compileNpmModule);
    // commander.command("supersonic").action(supersonicCreate);
    // commander.command("showconfig").action(showConfig);
    // commander.command("packages").action(packageUpdater).option("--mode [mode]").option("--path [path]");

}