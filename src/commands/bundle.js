var config = require('../config')
var path = require("path");
var _ = require("underscore");
var fs = require("fs-extra");
var exec = require('../functions/exec');
var archiver = require('archiver');

module.exports = function (parameters, done) {

    if (parameters.skipBundle) {
        console.log("Skipping building bundle...");
        if (typeof done === "function")
            done();
        return;
    }

    if (config.isProjectEnvironment()) {

        fs.removeSync(path.join(config.builtDirectory, "meteor.tar.gz"));

        console.log("Creating bundle in directory : ", config.builtDirectory);

        exec("meteor build " + path.relative(config.meteorDirectory, config.builtDirectory) + " --architecture os.linux.x86_64 --server-only", {
            cwd: config.meteorDirectory,
            finished: function () {
                if (typeof done === "function")
                    done();
            }
        });
    } else if (config.isSmallstackEnvironment()) {

        fs.emptyDirSync(path.resolve(config.rootDirectory, "dist"));

        exec("npm run bundle", {
            cwd: path.resolve(config.rootDirectory, "modules", "core")
        });
        exec("npm run bundle", {
            cwd: path.resolve(config.rootDirectory, "modules", "meteor")
        });
        exec("npm run bundle", {
            cwd: path.resolve(config.rootDirectory, "modules", "nativescript")
        });

        modifyProductionPackageJson(path.resolve(config.rootDirectory, "dist", "modules", "core", "client", "package.json"));
        modifyProductionPackageJson(path.resolve(config.rootDirectory, "dist", "modules", "core", "server", "package.json"));
        modifyProductionPackageJson(path.resolve(config.rootDirectory, "dist", "modules", "core", "common", "package.json"));

        modifyProductionPackageJson(path.resolve(config.rootDirectory, "dist", "modules", "meteor", "client", "package.json"));
        modifyProductionPackageJson(path.resolve(config.rootDirectory, "dist", "modules", "meteor", "server", "package.json"));
        modifyProductionPackageJson(path.resolve(config.rootDirectory, "dist", "modules", "meteor", "common", "package.json"));

        modifyProductionPackageJson(path.resolve(config.rootDirectory, "dist", "modules", "nativescript", "package.json"));

        var version = require(path.resolve(config.rootDirectory, "dist", "modules", "core", "common", "package.json")).version;
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
            throw err;
        });

        output.on('close', function () {
            console.log(archive.pointer() + ' total bytes');
            console.log('archiver has been finalized and the output file descriptor has closed.');
            done();
        });

        archive.directory("dist/modules", "modules");
        archive.directory("resources", "resources");
        archive.finalize();

        createSymlink(destinationFile, path.resolve(config.rootDirectory, "dist", "smallstack.zip"));

    } else throw new Error("Bundling only works for smallstack projects and for smallstack modules!");

}


function modifyProductionPackageJson(file) {
    var content = require(file);
    delete content.devDependencies;
    delete content.dependencies;
    delete content.scripts;
    content.main = content.main.replace("./dist/bundle/", "./")
    content.types = content.types.replace("./dist/bundle/", "./")
    fs.writeJSONSync(file, content);
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