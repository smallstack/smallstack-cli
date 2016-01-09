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

// check if project is available
if (!fs.existsSync("smallstack.json") && !_.contains(["create", "--help", "-h", "-v", "--version"], process.argv[2].toLowerCase())) {
    console.log("No smallstack project found! Why don't you create one : ");
    console.log(" ");
    console.log("      smallstack create <name>");
    process.exit(0);
}

// parse command line options
commander.version(config.packageJSON.version);
commander.usage("command [options]");

commander.command("create <name>").action(create);
commander.command("generate").action(generate);

commander.parse(process.argv);