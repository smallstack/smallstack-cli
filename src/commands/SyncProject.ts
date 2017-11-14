import * as templating from "../functions/templating";
import * as fs from "fs-extra";
import * as path from "path";
import { copySync } from "fs-extra";
import { Config } from "../Config";
import { CLICommandOption } from "./CLICommand";
import * as glob from "glob";
import * as _ from "underscore";

export class SyncProject {

    public static getHelpSummary(): string {
        return "Synchronizes project files from the smallstack resources folder.";
    }

    public static getParameters(): { [parameterKey: string]: string } {
        return {};
    }

    public static execute(current: CLICommandOption, allCommands: CLICommandOption[]): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            if (!Config.isProjectEnvironment())
                throw new Error("You're not inside a smallstack project folder!");

            // copy folder
            console.log("Syncing project files...");
            const basePath: string = path.join(Config.cliResourcesPath, "projectfiles");
            glob(basePath + "/**", { nodir: true, dot: true }, (er, files) => {
                // console.log(files);
                _.each(files, (file: string) => {
                    const relativePath: string = path.relative(basePath, file);
                    templating.compileFileToFile(file, path.join(Config.rootDirectory, relativePath), {
                        Config
                    });
                });
                resolve();
            });
        });
    }
}
