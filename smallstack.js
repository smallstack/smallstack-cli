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

// show a nice logo
logo();

// parse command line options
commander.version(config.cli.version);
commander.usage("command [options]");

commander.command("create <name>").action(create);
commander.command("generate").action(generate);
commander.command("compile").action(compile);
commander.command("supersonic create").action(supersonicCreate);
commander.command("showconfig").action(showConfig);


// no command given?
if (!process.argv.slice(2).length) {
    commander.outputHelp();
    process.exit(0);
}

// check if project is available
if (!config.projectFound()) {
    console.log("No smallstack project found! Why don't you create one : ");
    console.log(" ");
    console.log("      smallstack create <name>");
    process.exit(0);
}


commander.parse(process.argv);