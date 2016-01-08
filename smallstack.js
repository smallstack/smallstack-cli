#! /usr/bin/env node


var path = require('path');
var pkg = require(path.join(__dirname, 'package.json'));

console.log(" ");
console.log(" ");
console.log("                        _  _       _                 _    ");
console.log(" ___  _ __ ___    __ _ | || | ___ | |_   __ _   ___ | | __");
console.log("/ __|| '_ ` _ \\  / _` || || |/ __|| __| / _` | / __|| |/ /");
console.log("\\__ \\| | | | | || (_| || || |\\__ \\| |_ | (_| || (__ |   < ");
console.log("|___/|_| |_| |_| \\__,_||_||_||___/ \\__| \\__,_| \\___||_|\\_\\");
console.log("                             command line interface v" + pkg.version);
console.log(" ");






var generateSources = require("./generator/generateSources");
var copyTypescriptDefinitions = require("./generator/copyTypescriptDefinitions");
var copySmallstackFiles = require("./generator/copySmallstackFiles");

// Parse command line options
var commander = require('commander');
commander.version(pkg.version);
commander.usage("command [options]");
commander.command("generate").action(function () {
    copyTypescriptDefinitions();
    copySmallstackFiles();
    generateSources();
});


commander.parse(process.argv);

console.log("the end!");