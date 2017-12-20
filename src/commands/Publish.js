"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _ = require("underscore");
const Config_1 = require("../Config");
// tslint:disable-next-line:no-var-requires
const execNPM = require("../functions/execNPM");
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
class PublishCommand {
    static getParameters() {
        return {};
    }
    static getHelpSummary() {
        return "publishes modules to NPM";
    }
    static execute(currentCLICommandOption, allCommands) {
        _.each(Config_1.Config.getModuleNames(), (moduleName) => {
            if (!fs_extra_1.existsSync(path_1.join(Config_1.Config.rootDirectory, "modules", moduleName, "dist")))
                throw new Error("Seems like the module is not built yet. This folder does not exist: " + path_1.join(Config_1.Config.rootDirectory, "modules", moduleName, "dist"));
            execNPM("npm publish", { cwd: path_1.join(Config_1.Config.rootDirectory, "modules", moduleName) });
        });
        return Promise.resolve();
    }
}
exports.PublishCommand = PublishCommand;
