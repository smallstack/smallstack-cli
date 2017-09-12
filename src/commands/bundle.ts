var config = require('../config')
var path = require("path");
var _ = require("underscore");
var fs = require("fs-extra");
var exec = require('../functions/exec');
var archiver = require('archiver');
var modifyProductionPackageJson = require("../functions/modifyProductionPackageJson");

export function bundle(parameters): Promise<any> {
    if (parameters.skipBundle) {
        console.log("Skipping building bundle...");
        return Promise.resolve();
    }

    if (config.isProjectEnvironment()) {
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
            finished: function () {
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
        const destinationFile: string = path.join(config.builtDirectory, "frontend.tar.gz");
        fs.removeSync(destinationFile);
        fs.emptyDirSync(config.builtDirectory);

        console.log("Creating frontend bundle in directory : ", config.builtDirectory);

        exec("npm install && npm run build:aot", {
            cwd: config.frontendDirectory,
            finished: function () {

                const output = fs.createWriteStream(destinationFile);
                const archive = archiver('zip', {
                    store: true
                });

                archive.pipe(output);

                archive.on('error', function (err) {
                    console.error(err);
                    reject(err);
                });

                output.on('close', function () {
                    console.log(archive.pointer() + ' total bytes');
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

        var version = require(path.resolve(config.rootDirectory, "dist", "modules", "core-common", "package.json")).version;
        var destinationFile = path.resolve(config.rootDirectory, "dist", "smallstack-" + version + ".zip");
        fs.removeSync(destinationFile);
        console.log("Packaging smallstack modules to ", destinationFile);
        var output = fs.createWriteStream(destinationFile);
        var archive = archiver('zip', {
            store: true
        });

        archive.pipe(output);

        archive.on('error', function (err) {
            console.error(err);
            reject(err);
        });

        output.on('close', function () {
            createSymlink(destinationFile, path.resolve(config.rootDirectory, "dist", "smallstack.zip"));
            console.log(archive.pointer() + ' total bytes');
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