// tslint:disable:no-var-requires

import { Config } from "../Config";
import { createMeteorVersionFile } from "../functions/createMeteorVersionFile";
import { CLICommandOption } from "./CLICommand";
const path = require("path");
const _ = require("underscore");
import * as fs from "fs-extra";
const exec = require("../functions/exec");
const archiver = require("archiver");

export class BundleCommand {

    public static getParameters(): { [parameterKey: string]: string } {
        return {
            skipBundle: "can be used to skip the whole process (e.g. in a CI environment)"
        };
    }

    public static getHelpSummary(): string {
        return "creates a meteor bundle";
    }

    public static execute(currentCLICommandOption: CLICommandOption, allCommands: CLICommandOption[]): Promise<any> {
        if (currentCLICommandOption.parameters.skipBundle) {
            console.log("Skipping building bundle...");
            return Promise.resolve(true);
        }

        if (Config.isProjectEnvironment()) {
            createMeteorVersionFile();
            if (currentCLICommandOption.parameters.frontendOnly)
                return bundleFrontendProject();
            if (currentCLICommandOption.parameters.meteorOnly)
                return bundleMeteorProject();
            return Promise.all([bundleMeteorProject(), bundleFrontendProject()]);
        }

        if (Config.isSmallstackEnvironment()) {
            return bundleSmallstack(currentCLICommandOption);
        }

        throw new Error("Bundling only works for smallstack projects and for smallstack modules!");
    }

}

function bundleMeteorProject(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        fs.removeSync(path.join(Config.builtDirectory, "meteor.tar.gz"));

        console.log("Creating meteor bundle in directory : ", Config.builtDirectory);

        exec("meteor build " + path.relative(Config.meteorDirectory, Config.builtDirectory) + " --architecture os.linux.x86_64 --server-only", {
            cwd: Config.meteorDirectory,
            finished: () => {
                resolve();
            }
        });
    });
}

function bundleFrontendProject(): Promise<void> {
    if (Config.frontendDirectory === undefined) {
        console.log("No frontend directory found, skipping frontend bundling!");
        return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
        const destinationFile: string = path.join(Config.builtDirectory, "frontend.zip");
        fs.removeSync(destinationFile);

        console.log("Creating frontend bundle in directory : ", Config.builtDirectory);

        exec("npm install && npm run build:aot", {
            cwd: Config.frontendDirectory,
            finished: () => {

                const output = fs.createWriteStream(destinationFile);
                const archive = archiver("zip", {
                    store: true
                });

                archive.pipe(output);

                archive.on("error", (err) => {
                    console.error(err);
                    reject(err);
                });

                output.on("close", () => {
                    console.log(archive.pointer() + " total bytes");
                    resolve();
                });

                archive.directory("frontend/dist", "");
                archive.finalize();
            }
        });
    });
}

function bundleSmallstack(currentCLICommandOption: CLICommandOption): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const createArchive: boolean = currentCLICommandOption.parameters.createArchive === true;
        if (currentCLICommandOption.parameters.buildPackages === undefined)
            fs.emptyDirSync(path.resolve(Config.rootDirectory, "dist"));
        else
            console.log("skipping deletion of dist directory since not all bundles will get rebuild...");

        const version = require(path.resolve(Config.rootDirectory, "modules", "core-common", "package.json")).version;

        let bundleModuleNames: string[] = Config.getModuleNames();
        if (currentCLICommandOption.parameters.bundlePackages !== undefined && typeof currentCLICommandOption.parameters.bundlePackages === "string")
            bundleModuleNames = currentCLICommandOption.parameters.bundlePackages.split(",");

        let buildModuleNames: string[] = Config.getModuleNames();
        if (currentCLICommandOption.parameters.buildPackages !== undefined && typeof currentCLICommandOption.parameters.buildPackages === "string")
            buildModuleNames = currentCLICommandOption.parameters.buildPackages.split(",");

        let npmCommand: string = "npm run bundle";
        if (createArchive)
            npmCommand += " && npm pack";

        _.each(buildModuleNames, (moduleName: string) => {
            console.log("packaging module " + moduleName);
            exec(npmCommand, {
                cwd: path.resolve(Config.rootDirectory, "modules", moduleName)
            });
            if (createArchive)
                fs.copySync(path.resolve(Config.rootDirectory, "modules", moduleName, "smallstack-" + moduleName + "-" + version + ".tgz"), path.resolve(Config.rootDirectory, "dist/smallstack-" + moduleName + "-" + version + ".tgz"));
        });

        if (createArchive) {
            const destinationFile = path.resolve(Config.rootDirectory, "dist", "smallstack-" + version + ".zip");
            fs.removeSync(destinationFile);
            console.log("Packaging smallstack modules to ", destinationFile);
            const output = fs.createWriteStream(destinationFile);
            const archive = archiver("zip", {
                store: true
            });

            archive.pipe(output);

            archive.on("error", (err) => {
                console.error(err);
                reject(err);
            });

            output.on("close", () => {
                createSymlink(destinationFile, path.resolve(Config.rootDirectory, "dist", "smallstack.zip"));
                console.log(archive.pointer() + " total bytes");
                resolve();
            });

            _.each(bundleModuleNames, (moduleName: string) => {
                const modulePath: string = "dist/smallstack-" + moduleName + "-" + version + ".tgz";
                console.log("zipping " + modulePath);
                archive.file(path.resolve(Config.rootDirectory, modulePath), { name: moduleName + ".tgz" });
            });
            archive.directory("resources", "resources");
            archive.finalize();
        }
        else {
            resolve();
        }
    });
}

function createSymlink(from, to) {

    try {
        fs.removeSync(to);
        console.log("creating symlink: " + from + " -> " + to);
        fs.ensureSymlinkSync(from, to);
    } catch (e) {
        console.error(e);
    }
}
