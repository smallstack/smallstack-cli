#! /usr/bin/env node

// modules
var logo = require("./src/functions/logo");
var config = require("./src/config");
var commander = require('commander');
var fs = require("fs-extra");
var _ = require("underscore");

// commands
var generate = require("./src/commands/generate");
var create = require("./src/commands/create");
var supersonicCreate = require("./src/commands/supersonicCreate");
var showConfig = require("./src/commands/showConfig");
var compile = require("./src/commands/compile");
var packageUpdater = require("./src/commands/packageUpdater");
var cleaner = require("./src/commands/cleaner");

// show a nice logo
logo();

// parse command line options
commander.version(config.cli.version);
commander.usage("command [options]");

commander.command("create <name>").action(create);
commander.command("clean").action(cleaner);
commander.command("generate").action(generate);
commander.command("compile [smallstack|meteor|supersonic]").action(compile);
commander.command("supersonic").action(supersonicCreate);
commander.command("showconfig").action(showConfig);
commander.command("packages").action(packageUpdater).option("--mode [mode]").option("--path [path]");


// no command given?
if (!process.argv.slice(2).length) {
    commander.outputHelp();
    console.error("No valid command given!");
    process.exit(0);
}

// check if project is available
if (!config.projectFound() && !config.calledWithCreateProjectCommand()) {
    console.log("No smallstack project found! If you want to create one:");
    console.log(" ");
    console.log("      smallstack create <name>");
    process.exit(0);
}
else {
    showConfig();
}

commander.parse(process.argv);