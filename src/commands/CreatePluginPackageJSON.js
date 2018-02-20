"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs-extra");
const path = require("path");
const Config_1 = require("../Config");
class CreatePluginPackageJSON {
    static getHelpSummary() {
        return "Reads in the package.json, removes all devDependencies, renames dependencies to peerDependencies and copies the file to dist/bundle.";
    }
    static getParameters() {
        return {};
    }
    static execute(current, allCommands) {
        return new Promise((resolve, reject) => {
            const packageJSONPath = path.join(Config_1.Config.rootDirectory, "package.json");
            if (!fs.existsSync(packageJSONPath))
                throw new Error("No package.json file found in current directory!");
            const packageJSON = require(packageJSONPath);
            delete packageJSON.devDependencies;
            delete packageJSON.scripts;
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
exports.CreatePluginPackageJSON = CreatePluginPackageJSON;
