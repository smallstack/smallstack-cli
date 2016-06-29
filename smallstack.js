// modules
var logo = require("./src/functions/logo");
var config = require("./src/config");
// var commander = require('commander');
var fs = require("fs-extra");
var _ = require("underscore");
var colors = require("colors");

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

// show a nice logo
logo();

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
if (allCommandsFine) {
    _.each(parsedCommands, function (command) {
        console.log("################################################################################");
        console.log("##### Command : " + command.name);
        console.log("##### Parameters : ", command.parameters);
        console.log("################################################################################");
        commands[command.name](command.parameters);
    });
}

if (parsedCommands.length === 0 || !allCommandsFine) {
    commands.help();
}