"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var templating = require("../functions/templating");
const path = require("path");
const Config_1 = require("../Config");
const glob = require("glob");
const _ = require("underscore");
class SyncProject {
    static getHelpSummary() {
        return "Synchronizes project files from the smallstack resources folder.";
    }
    static getParameters() {
        return {};
    }
    static execute(current, allCommands) {
        return new Promise((resolve, reject) => {
            if (!Config_1.Config.isProjectEnvironment())
                throw new Error("You're not inside a smallstack project folder!");
            // copy folder
            console.log("Syncing project files...");
            const basePath = path.join(Config_1.Config.cliResourcesPath, "projectfiles");
            glob(basePath + "/**", { nodir: true, dot: true }, (er, files) => {
                // console.log(files);
                _.each(files, (file) => {
                    const relativePath = path.relative(basePath, file);
                    templating.compileFileToFile(file, path.join(Config_1.Config.rootDirectory, relativePath), {
                        Config: Config_1.Config
                    });
                });
                resolve();
            });
        });
    }
}
exports.SyncProject = SyncProject;
