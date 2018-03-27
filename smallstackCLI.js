"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("underscore");
const bundle_1 = require("./src/commands/bundle");
const ChangelogCommand_1 = require("./src/commands/ChangelogCommand");
const cloud_1 = require("./src/commands/cloud");
const CreateDockerImages_1 = require("./src/commands/CreateDockerImages");
const CreatePluginPackageJSON_1 = require("./src/commands/CreatePluginPackageJSON");
const GitflowCommand_1 = require("./src/commands/GitflowCommand");
const GitlabBoardFixCommand_1 = require("./src/commands/GitlabBoardFixCommand");
const GitlabProjectFixCommand_1 = require("./src/commands/GitlabProjectFixCommand");
const help_1 = require("./src/commands/help");
const Publish_1 = require("./src/commands/Publish");
const Setup_1 = require("./src/commands/Setup");
const SyncProject_1 = require("./src/commands/SyncProject");
const workspace_1 = require("./src/commands/workspace");
const Config_1 = require("./src/Config");
const parseArguments_1 = require("./src/functions/parseArguments");
const stringifyParametersWithoutPasswords_1 = require("./src/functions/stringifyParametersWithoutPasswords");
const UpdateCheck_1 = require("./src/functions/UpdateCheck");
function CLI() {
    return __awaiter(this, void 0, void 0, function* () {
        const startDate = new Date();
        Config_1.Config.init();
        // modules
        const logo = require("./src/functions/logo");
        const colors = require("colors");
        const moment = require("moment");
        // commands
        const commands = {};
        commands.generate = require("./src/commands/generate");
        commands.showConfig = require("./src/commands/showConfig");
        commands.setup = Setup_1.Setup;
        commands.clean = require("./src/commands/cleaner");
        commands.test = require("./src/commands/test");
        commands.bundle = bundle_1.BundleCommand;
        commands.deploy = require("./src/commands/deploy");
        commands.compileNpmModule = require("./src/commands/compileNpmModule");
        commands.gitflow = GitflowCommand_1.GitflowCommand;
        commands.signAndroid = require("./src/commands/signAndroid");
        commands.upload = require("./src/commands/upload");
        commands.convert = require("./src/commands/convert");
        commands.watch = require("./src/commands/watch");
        commands.syncproject = SyncProject_1.SyncProject;
        commands.modifyproductionpackagejson = require("./src/commands/modifyProductionPackageJson");
        commands.createDockerImages = CreateDockerImages_1.CreateDockerImages;
        commands.cloud = cloud_1.cloud;
        commands.publish = Publish_1.PublishCommand;
        commands.createPluginPackageJSON = CreatePluginPackageJSON_1.CreatePluginPackageJSON;
        commands.changelog = ChangelogCommand_1.ChangelogCommand;
        commands.gitlabBoardFix = GitlabBoardFixCommand_1.GitlabBoardFixCommand;
        commands.workspace = workspace_1.Workspace;
        commands.gitlabProjectFix = GitlabProjectFixCommand_1.GitlabProjectFixCommand;
        // show a nice logo
        logo();
        // display some information
        if (Config_1.Config.isSmallstackEnvironment())
            console.log("Environment:     smallstack framework");
        else if (Config_1.Config.isProjectEnvironment())
            console.log("Environment:     smallstack project");
        else if (Config_1.Config.isWorkspaceEnvironment())
            console.log("Environment:     smallstack workspace");
        else if (Config_1.Config.isComponentEnvironment())
            console.log("Environment:     smallstack component");
        else if (Config_1.Config.isNativescriptEnvironment())
            console.log("Environment:     nativescript app");
        else if (Config_1.Config.isNPMPackageEnvironment())
            console.log("Environment:     NPM package");
        else if (Config_1.Config.isMultiNPMPackageEnvironment())
            console.log("Environment:     Multi NPM package");
        else if (Config_1.Config.calledWithCreateProjectCommand())
            console.log("Environment:     project creation");
        console.log("Root Directory: ", Config_1.Config.getRootDirectory());
        console.log("\n");
        const parsedCommands = parseArguments_1.parseArguments(process.argv);
        // update check
        if (!Config_1.Config.isCIMode() && process.argv.indexOf("--skipUpdateCheck") === -1)
            yield UpdateCheck_1.UpdateCheck.check();
        // first check all commands
        let allCommandsFine = true;
        _.each(parsedCommands, (command) => {
            if (commands[command.name] === undefined && command.name !== "help") {
                console.error("Command not found : '" + command.name + "'");
                allCommandsFine = false;
            }
        });
        function getDurationString() {
            return moment((new Date().getTime() - startDate.getTime())).format("mm:ss.SSS");
        }
        // then execute
        if (parsedCommands.length === 0 || !allCommandsFine || parsedCommands[0].name === "help") {
            new help_1.HelpCommand().showHelp(commands);
        }
        else if (allCommandsFine) {
            for (const command of parsedCommands) {
                console.log(colors.gray("################################################################################"));
                console.log(colors.gray("##### Command : " + command.name));
                if (command.parameters !== undefined && _.keys(command.parameters).length > 0) {
                    console.log(colors.gray("##### Parameters : "));
                    console.log(colors.gray(stringifyParametersWithoutPasswords_1.stringifyParametersWithoutPasswords(command.parameters, "#####  |- ")));
                }
                console.log(colors.gray("################################################################################\n"));
                try {
                    if (typeof commands[command.name].execute === "function") {
                        yield commands[command.name].execute(command, parsedCommands);
                    }
                    else if (typeof commands[command.name] === "function")
                        yield commands[command.name](command.parameters);
                    else
                        throw new Error("Could not find command " + command.name);
                }
                catch (e) {
                    if (e.message)
                        console.error(colors.red("ERROR:", e.message));
                    else
                        console.error(colors.red("ERROR:", e));
                    console.error(colors.red("Failure was executed in " + getDurationString()));
                    if (e.stack)
                        console.error(colors.red(e.stack));
                    if (command.parameters.failOnError === false) {
                        console.warn("exiting process with code 0 since failOnError=false!");
                        process.exit(0);
                    }
                    else
                        process.exit(1);
                }
            }
            console.info(colors.green("Executed in " + getDurationString()));
        }
    });
}
exports.CLI = CLI;
