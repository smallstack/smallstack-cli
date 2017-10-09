import { cloud } from "./src/commands/cloud";
import { CreateDockerImages } from "./src/commands/CreateDockerImages";
import { Config } from "./src/Config";
import { stringifyParametersWithoutPasswords } from "./src/functions/stringifyParametersWithoutPasswords";

export async function CLI() {
    const startDate: Date = new Date();

    Config.init();

    // modules
    const logo = require("./src/functions/logo");
    const fs = require("fs-extra");
    const _ = require("underscore");
    const colors = require("colors");
    const moment = require("moment");
    const parseArguments = require("./src/functions/parseArguments");

    // commands
    const commands: any = {};
    commands.help = require("./src/commands/help");
    commands.generate = require("./src/commands/generate");
    commands.create = require("./src/commands/create");
    commands.showConfig = require("./src/commands/showConfig");
    commands.setup = require("./src/commands/setup");
    commands.clean = require("./src/commands/cleaner");
    commands.test = require("./src/commands/test");
    commands.bundle = require("./src/commands/bundle").bundle;
    commands.deploy = require("./src/commands/deploy");
    commands.compileNpmModule = require("./src/commands/compileNpmModule");
    commands.gitflow = require("./src/commands/gitflow");
    commands.signAndroid = require("./src/commands/signAndroid");
    commands.upload = require("./src/commands/upload");
    commands.convert = require("./src/commands/convert");
    commands.watch = require("./src/commands/watch");
    commands.syncproject = require("./src/commands/syncproject");
    commands.modifyproductionpackagejson = require("./src/commands/modifyProductionPackageJson");
    commands.createDockerImages = CreateDockerImages;
    commands.cloud = cloud;

    // show a nice logo
    logo();

    // display some information
    if (Config.isSmallstackEnvironment())
        console.log("Environment:     smallstack framework");
    else if (Config.isProjectEnvironment())
        console.log("Environment:     smallstack project");
    else if (Config.isComponentEnvironment())
        console.log("Environment:     smallstack component");
    else if (Config.isNativescriptEnvironment())
        console.log("Environment:     nativescript app");
    else if (Config.isNPMPackageEnvironment())
        console.log("Environment:     NPM package");
    else if (Config.calledWithCreateProjectCommand())
        console.log("Environment:     project creation");
    console.log("Root Directory: ", Config.getRootDirectory());
    console.log("\n");

    // update check
    const updateCheck = require("./src/functions/updateCheck");
    updateCheck.doCheck();

    const parsedCommands = parseArguments(process.argv);

    // first check all commands
    let allCommandsFine = true;
    _.each(parsedCommands, (command) => {
        if (commands[command.name] === undefined) {
            console.error("Command not found : '" + command.name + "'");
            allCommandsFine = false;
        }
    });

    function getDurationString(): string {
        return moment((new Date().getTime() - startDate.getTime())).format("mm:ss.SSS");
    }

    // then execute
    if (parsedCommands.length === 0 || !allCommandsFine) {
        commands.help();
        updateCheck.showResult();
    } else if (allCommandsFine) {
        for (const command of parsedCommands) {
            console.log(colors.gray("################################################################################"));
            console.log(colors.gray("##### Command : " + command.name));
            if (command.parameters !== undefined && _.keys(command.parameters).length > 0) {
                console.log(colors.gray("##### Parameters : "));
                console.log(colors.gray(stringifyParametersWithoutPasswords(command.parameters, "#####  |- ")));
            }
            console.log(colors.gray("################################################################################\n"));
            try {
                if (typeof commands[command.name].prototype.execute === "function") {
                    await new commands[command.name]().execute(command, parsedCommands);
                }
                else if (typeof commands[command.name] === "function")
                    await commands[command.name](command.parameters, () => {
                        console.error("done callback is deprecated, please use async/await!");
                    });
                else
                    throw new Error("Could not find command " + command.name);
            } catch (e) {
                if (e.message)
                    console.error(colors.red("ERROR:", e.message));
                else
                    console.error(colors.red("ERROR:", e));
                console.error(colors.red("Failure was executed in " + getDurationString()));
                if (command.parameters.debug)
                    console.error(colors.red(e.stack));
                updateCheck.showResult();
                if (command.parameters.failOnError === false) {
                    console.warn("exiting process with code 0 since failOnError=false!");
                    process.exit(0);
                }
                else
                    process.exit(1);
            }
        }
        // , function (error) {
        //     var executionText = "Command Execution finished in " + getDurationString();
        //     if (error) {
        //         console.error(colors.red(error + " " + executionText));
        //         updateCheck.showResult(function () {
        //             process.exit(1);
        //         });
        //     } else {
        //         console.log(colors.green("Success! " + executionText));
        //         updateCheck.showResult(function () {
        //             process.exit(0);
        //         });
        //     }
        // });
    }
}
