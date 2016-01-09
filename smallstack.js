#! /usr/bin/env node

// modules
var logo = require("./src/logo");
var config = require("./src/config");
var commander = require('commander');
var generate = require("./src/commands/generate");
var create = require("./src/commands/create");
var fs = require("fs-extra");
var _ = require("underscore");

// show a nice logo
logo();

// parse command line options
commander.version(config.packageJSON.version);
commander.usage("command [options]");

commander.command("create <name>").action(create);
commander.command("generate").action(generate);


// no command given?
if (!process.argv.slice(2).length) {
    commander.outputHelp();
    process.exit(0);
}

// check if project is available
if (!fs.existsSync("smallstack.json") && (process.argv[2] === undefined || !_.contains(["create", "--help", "-h", "-v", "--version"], process.argv[2].toLowerCase()))) {
    console.log("No smallstack project found! Why don't you create one : ");
    console.log(" ");
    console.log("      smallstack create <name>");
    process.exit(0);
}


commander.parse(process.argv);