import * as fs from "fs-extra";
import * as path from "path";
import { Config } from "../Config";
import { CLICommandOption } from "./CLICommand";


export class CreatePluginPackageJSON {

    public static getHelpSummary(): string {
        return "Reads in the package.json, removes all devDependencies, renames dependencies to peerDependencies and copies the file to dist/bundle.";
    }

    public static getParameters(): { [parameterKey: string]: string } {
        return {};
    }

    public static execute(current: CLICommandOption, allCommands: CLICommandOption[]): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            const packageJSONPath: string = path.join(Config.rootDirectory, "package.json");
            if (!fs.existsSync(packageJSONPath))
                throw new Error("No package.json file found in current directory!");
            const packageJSON: any = require(packageJSONPath);
            packageJSON.peerDependencies = packageJSON.dependencies;
            delete packageJSON.devDependencies;
            delete packageJSON.scripts;
            delete packageJSON.dependencies;
            if (packageJSON.main)
                packageJSON.main = "./index.umd.js";
            if (packageJSON.types)
                packageJSON.types = "./dts/index.d.ts";
            fs.ensureDirSync(path.join("dist", "bundle"));
            fs.writeJSONSync(path.join("dist", "bundle", "package.json"), packageJSON, { spaces: 2, encoding: "UTF-8" });

            // // copy folder
            // console.log("Syncing project files...");
            // const basePath: string = path.join(Config.cliResourcesPath, "projectfiles");
            // glob(basePath + "/**", { nodir: true, dot: true }, (er, files) => {
            //     // console.log(files);
            //     _.each(files, (file: string) => {
            //         const relativePath: string = path.relative(basePath, file);
            //         templating.compileFileToFile(file, path.join(Config.rootDirectory, relativePath), {
            //             Config
            //         });
            //     });
            //     resolve();
            // });
        });
    }
}
