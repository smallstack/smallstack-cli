// tslint:disable:no-var-requires

import { createMeteorVersionFile } from "../functions/createMeteorVersionFile";

const config = require("../config");
const path = require("path");
const _ = require("underscore");
const fs = require("fs-extra");
const exec = require("../functions/exec");
const archiver = require("archiver");
const modifyProductionPackageJson = require("../functions/modifyProductionPackageJson");

export function bundle(parameters): Promise<any> {
    if (parameters.skipBundle) {
        console.log("Skipping building bundle...");
        return Promise.resolve();
    }

    if (config.isProjectEnvironment()) {
        createMeteorVersionFile();
        if (parameters.frontendOnly)
            return bundleFrontendProject();
        if (parameters.meteorOnly)
            return bundleMeteorProject();
        return Promise.all([bundleMeteorProject(), bundleFrontendProject()]);
    }

    if (config.isSmallstackEnvironment()) {
        return bundleSmallstack();
    }

    throw new Error("Bundling only works for smallstack projects and for smallstack modules!");
}

function bundleMeteorProject(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        fs.removeSync(path.join(config.builtDirectory, "meteor.tar.gz"));

        console.log("Creating meteor bundle in directory : ", config.builtDirectory);

        exec("meteor build " + path.relative(config.meteorDirectory, config.builtDirectory) + " --architecture os.linux.x86_64 --server-only", {
            cwd: config.meteorDirectory,
            finished: () => {
                resolve();
            }
        });
    });
}

function bundleFrontendProject(): Promise<void> {
    if (config.frontendDirectory === undefined) {
        console.log("No frontend directory found, skipping frontend bundling!");
        return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
        const destinationFile: string = path.join(config.builtDirectory, "frontend.zip");
        fs.removeSync(destinationFile);

        console.log("Creating frontend bundle in directory : ", config.builtDirectory);

        exec("npm install && npm run build:aot", {
            cwd: config.frontendDirectory,
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

function bundleSmallstack(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        fs.emptyDirSync(path.resolve(config.rootDirectory, "dist"));

        exec("npm run bundle", {
            cwd: path.resolve(config.rootDirectory, "modules", "core-common")
        });
        exec("npm run bundle", {
            cwd: path.resolve(config.rootDirectory, "modules", "core-client")
        });
        exec("npm run bundle", {
            cwd: path.resolve(config.rootDirectory, "modules", "core-server")
        });
        exec("npm run bundle", {
            cwd: path.resolve(config.rootDirectory, "modules", "meteor-common")
        });
        exec("npm run bundle", {
            cwd: path.resolve(config.rootDirectory, "modules", "meteor-client")
        });
        exec("npm run bundle", {
            cwd: path.resolve(config.rootDirectory, "modules", "meteor-server")
        });
        exec("npm run bundle", {
            cwd: path.resolve(config.rootDirectory, "modules", "nativescript")
        });

        console.log("modifying production package.json files...");
        modifyProductionPackageJson(path.resolve(config.rootDirectory, "dist", "modules", "core-client", "package.json"));
        modifyProductionPackageJson(path.resolve(config.rootDirectory, "dist", "modules", "core-server", "package.json"));
        modifyProductionPackageJson(path.resolve(config.rootDirectory, "dist", "modules", "core-common", "package.json"));

        modifyProductionPackageJson(path.resolve(config.rootDirectory, "dist", "modules", "meteor-client", "package.json"));
        modifyProductionPackageJson(path.resolve(config.rootDirectory, "dist", "modules", "meteor-server", "package.json"));
        modifyProductionPackageJson(path.resolve(config.rootDirectory, "dist", "modules", "meteor-common", "package.json"));

        modifyProductionPackageJson(path.resolve(config.rootDirectory, "dist", "modules", "nativescript", "package.json"));

        const version = require(path.resolve(config.rootDirectory, "dist", "modules", "core-common", "package.json")).version;
        const destinationFile = path.resolve(config.rootDirectory, "dist", "smallstack-" + version + ".zip");
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
            createSymlink(destinationFile, path.resolve(config.rootDirectory, "dist", "smallstack.zip"));
            console.log(archive.pointer() + " total bytes");
            resolve();
        });

        archive.directory("dist/modules", "modules");
        archive.directory("resources", "resources");
        archive.finalize();
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
