// modules
var logo = require("./src/functions/logo");
var config = require("./src/config");
var fs = require("fs-extra");
var _ = require("underscore");
var colors = require("colors");
var async = require("async");

var parseArguments = require("./src/functions/parseArguments");

// commands
var commands = {};
commands.help = require("./src/functions/help");
commands.generate = require("./src/commands/generate");
commands.create = require("./src/commands/create");
commands.supersonicCreate = require("./src/commands/supersonicCreate");
commands.showConfig = require("./src/commands/showConfig");
commands.compile = require("./src/commands/compile");
commands.packages = require("./src/commands/packageUpdater");
commands.clean = require("./src/commands/cleaner");
commands.bundle = require("./src/commands/bundle");
commands.jenkins = require("./src/commands/jenkins");
commands.deploy = require("./src/commands/deploy");
commands.compileNpmModule = require("./src/commands/compileNpmModule");
commands.gitflow = require("./src/commands/gitflow");
commands.signAndroid = require("./src/commands/signAndroid");
commands.upload = require("./src/commands/upload");
commands.convert = require("./src/commands/convert");

// show a nice logo
logo();

// update check
var updateCheck = require("./src/functions/updateCheck");
updateCheck.doCheck();

var parsedCommands = parseArguments(process.argv);

// first check all commands
var allCommandsFine = true;
_.each(parsedCommands, function (command) {
    if (commands[command.name] === undefined) {
        console.error("Command not found : '" + command.name + "'");
        allCommandsFine = false;
    }
});

// then execute
if (parsedCommands.length === 0 || !allCommandsFine) {
    commands.help();
    updateCheck.showResult();
} else if (allCommandsFine) {
    async.eachLimit(parsedCommands, 1, function (command, done) {
        console.log(colors.gray("################################################################################"));
        console.log(colors.gray("##### Command : " + command.name));
        if (command.parameters !== undefined && _.keys(command.parameters).length > 0)
            console.log(colors.gray("##### Parameters : ", JSON.stringify(command.parameters)));
        console.log(colors.gray("################################################################################\n"));
        try {
            commands[command.name](command.parameters, done);
        } catch (e) {
            console.error(colors.red("ERROR:", e.message));
            if (command.parameters.debug)
                throw e;
            updateCheck.showResult(function () {
                process.exit(1);
            });
        }
    }, function (error) {
        if (error) {
            console.error(colors.red(error));
            updateCheck.showResult(function () {
                process.exit(1);
            });
        } else {
            console.log(colors.green("Success!"));
            updateCheck.showResult(function () {
                process.exit(0);
            });
        }
    });
}
