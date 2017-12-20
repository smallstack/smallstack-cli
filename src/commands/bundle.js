"use strict";
// tslint:disable:no-var-requires
Object.defineProperty(exports, "__esModule", { value: true });
const Config_1 = require("../Config");
const createMeteorVersionFile_1 = require("../functions/createMeteorVersionFile");
const path = require("path");
const _ = require("underscore");
const fs = require("fs-extra");
const exec = require("../functions/exec");
const archiver = require("archiver");
class BundleCommand {
    static getParameters() {
        return {
            skipBundle: "can be used to skip the whole process (e.g. in a CI environment)",
            meteorOnly: "only build the meteor app",
            frontendOnly: "only build the frontend app"
        };
    }
    static getHelpSummary() {
        return "creates a meteor bundle";
    }
    static execute(currentCLICommandOption, allCommands) {
        if (currentCLICommandOption.parameters.skipBundle) {
            console.log("Skipping building bundle...");
            return Promise.resolve(true);
        }
        if (Config_1.Config.isProjectEnvironment()) {
            createMeteorVersionFile_1.createMeteorVersionFile();
            if (currentCLICommandOption.parameters.frontendOnly)
                return bundleFrontendProject();
            if (currentCLICommandOption.parameters.meteorOnly)
                return bundleMeteorProject();
            return Promise.all([bundleMeteorProject(), bundleFrontendProject()]);
        }
        if (Config_1.Config.isSmallstackEnvironment()) {
            return bundleSmallstack(currentCLICommandOption);
        }
        throw new Error("Bundling only works for smallstack projects and for smallstack modules!");
    }
}
exports.BundleCommand = BundleCommand;
function bundleMeteorProject() {
    return new Promise((resolve, reject) => {
        fs.removeSync(path.join(Config_1.Config.builtDirectory, "meteor.tar.gz"));
        console.log("Creating meteor bundle in directory : ", Config_1.Config.builtDirectory);
        exec("meteor build " + path.relative(Config_1.Config.meteorDirectory, Config_1.Config.builtDirectory) + " --architecture os.linux.x86_64 --server-only", {
            cwd: Config_1.Config.meteorDirectory,
            finished: () => {
                resolve();
            }
        });
    });
}
function bundleFrontendProject() {
    if (Config_1.Config.frontendDirectory === undefined) {
        console.log("No frontend directory found, skipping frontend bundling!");
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const destinationFile = path.join(Config_1.Config.builtDirectory, "frontend.zip");
        fs.removeSync(destinationFile);
        console.log("Creating frontend bundle in directory : ", Config_1.Config.builtDirectory);
        exec("npm install && npm run build:aot", {
            cwd: Config_1.Config.frontendDirectory,
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
function bundleSmallstack(currentCLICommandOption) {
    return new Promise((resolve, reject) => {
        const createArchive = currentCLICommandOption.parameters.createArchive === true;
        if (currentCLICommandOption.parameters.buildPackages === undefined)
            fs.emptyDirSync(path.resolve(Config_1.Config.rootDirectory, "dist"));
        else
            console.log("skipping deletion of dist directory since not all bundles will get rebuild...");
        const version = require(path.resolve(Config_1.Config.rootDirectory, "modules", "core-common", "package.json")).version;
        let bundleModuleNames = Config_1.Config.getModuleNames();
        if (currentCLICommandOption.parameters.bundlePackages !== undefined && typeof currentCLICommandOption.parameters.bundlePackages === "string")
            bundleModuleNames = currentCLICommandOption.parameters.bundlePackages.split(",");
        let buildModuleNames = Config_1.Config.getModuleNames();
        if (currentCLICommandOption.parameters.buildPackages !== undefined && typeof currentCLICommandOption.parameters.buildPackages === "string")
            buildModuleNames = currentCLICommandOption.parameters.buildPackages.split(",");
        let npmCommand = "npm run bundle";
        if (createArchive)
            npmCommand += " && npm pack";
        _.each(buildModuleNames, (moduleName) => {
            console.log("packaging module " + moduleName);
            exec(npmCommand, {
                cwd: path.resolve(Config_1.Config.rootDirectory, "modules", moduleName)
            });
            if (createArchive)
                fs.copySync(path.resolve(Config_1.Config.rootDirectory, "modules", moduleName, "smallstack-" + moduleName + "-" + version + ".tgz"), path.resolve(Config_1.Config.rootDirectory, "dist/smallstack-" + moduleName + "-" + version + ".tgz"));
        });
        if (createArchive) {
            const destinationFile = path.resolve(Config_1.Config.rootDirectory, "dist", "smallstack-" + version + ".zip");
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
                createSymlink(destinationFile, path.resolve(Config_1.Config.rootDirectory, "dist", "smallstack.zip"));
                console.log(archive.pointer() + " total bytes");
                resolve();
            });
            _.each(bundleModuleNames, (moduleName) => {
                const modulePath = "dist/smallstack-" + moduleName + "-" + version + ".tgz";
                console.log("zipping " + modulePath);
                archive.file(path.resolve(Config_1.Config.rootDirectory, modulePath), { name: moduleName + ".tgz" });
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
    }
    catch (e) {
        console.error(e);
    }
}
