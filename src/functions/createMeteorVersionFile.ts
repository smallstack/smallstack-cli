// tslint:disable:no-var-requires
const templating = require("./templating");
import * as fs from "fs-extra";
import { join } from "path";
import { Config } from "../Config";

export function createMeteorVersionFile() {

    const destinationFilePath: string = join(Config.meteorDirectory, "server", "imports", "versions.ts");
    const sourceFilePath: string = join(Config.cliTemplatesPath, "versions.ts");
    if (fs.existsSync(sourceFilePath)) {
        const coreCommonPackageJson: any = require(join(Config.meteorSmallstackCoreCommonDirectory, "package.json"));
        templating.compileFileToFile(join(Config.cliTemplatesPath, "versions.ts"), destinationFilePath, {
            smallstackVersion: coreCommonPackageJson.version,
            projectVersion: Config.project.version
        });
        console.log("Updated versions.ts file: " + destinationFilePath);
    }
}
