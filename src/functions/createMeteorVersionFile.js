"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-var-requires
const templating = require("./templating");
const fs = require("fs-extra");
const path_1 = require("path");
const Config_1 = require("../Config");
function createMeteorVersionFile() {
    const destinationFilePath = path_1.join(Config_1.Config.meteorDirectory, "server", "imports", "versions.ts");
    const sourceFilePath = path_1.join(Config_1.Config.cliTemplatesPath, "versions.ts");
    if (fs.existsSync(sourceFilePath)) {
        const coreCommonPackageJson = require(path_1.join(Config_1.Config.meteorSmallstackCoreCommonDirectory, "package.json"));
        templating.compileFileToFile(path_1.join(Config_1.Config.cliTemplatesPath, "versions.ts"), destinationFilePath, {
            smallstackVersion: coreCommonPackageJson.version,
            projectVersion: Config_1.Config.project.version
        });
        console.log("Updated versions.ts file: " + destinationFilePath);
    }
}
exports.createMeteorVersionFile = createMeteorVersionFile;
