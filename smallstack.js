#! /usr/bin/env node

// modules
var logo = require("./src/logo");
var config = require("./src/config");
var commander = require('commander');
var generate = require("./src/commands/generate");

// show a nice logo
logo();

// parse command line options
commander.version(config.packageJSON.version);
commander.usage("command [options]");
commander.command("generate").action(generate);

commander.parse(process.argv);