// tslint:disable:no-var-requires
const config = require("../config");
const templating = require("./templating");
import * as fs from "fs-extra";
import { join } from "path";

export function createMeteorVersionFile() {

    const destinationFilePath: string = join(config.meteorDirectory, "server", "imports", "versions.ts");
    const sourceFilePath: string = join(config.cliTemplatesPath, "versions.ts");
    if (fs.existsSync(sourceFilePath)) {
        const coreCommonPackageJson: any = require(join(config.meteorSmallstackCoreCommonDirectory, "package.json"));
        templating.compileFileToFile(join(config.cliTemplatesPath, "versions.ts"), destinationFilePath, {
            smallstackVersion: coreCommonPackageJson.version,
            projectVersion: config.version
        });
        console.log("Updated versions.ts file: " + destinationFilePath);
    }
}
