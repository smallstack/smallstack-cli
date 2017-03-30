var glob = require('glob');
var _ = require("underscore");
var inquirer = require("inquirer");
var fs = require("fs-extra");
var config = require("../config");
var colors = require("colors");
var exec = require("../functions/exec");
var path = require("path");
var request = require("request");
var DecompressZip = require("decompress-zip");
var SmallstackApi = require("../functions/smallstackApi");

module.exports = function (params, done) {

    if (config.isSmallstackEnvironment()) {
        if (!params || params.linkOnly !== true)
            npmInstallModules();
        linkModules();
        done();
        return;
    }

    // properties
    var smallstackMode = params.mode;
    var smallstackPath = params.path;
    var smallstackUrl = params.url;

    var packageModes = [{
        name: "local checkout",
        value: "local"
    }, {
        name: "local file",
        value: "file"
    }, {
        name: "remote file (URL)",
        value: "url"
    }];
    if (!config.smallstack || !config.smallstack.version)
        console.error(colors.red("No smallstack.version defined in project's package.json!\n"));
    else
        packageModes.unshift({
            name: "use project version (" + config.smallstack.version + ")",
            value: "projectVersion"
        });

    var questions = [{
            name: "smallstack.mode",
            type: 'list',
            message: 'Which version shall be used? ',
            choices: packageModes,
            when: function () {
                return !smallstackMode;
            }
        },
        {
            name: "smallstack.path",
            type: 'input',
            message: 'relative path from project root to local smallstack directory :',
            default: "../smallstack",
            when: function (answers) {
                return answers.smallstack.mode === "local" && smallstackPath === undefined;
            }
        },
        {
            name: "smallstack.filepath",
            type: 'input',
            message: 'relative path from project root to local file location :',
            default: "../smallstack/dist/smallstack.zip",
            when: function (answers) {
                return answers.smallstack.mode === "file";
            }
        },
        {
            name: "smallstack.url",
            type: 'input',
            message: 'please enter the url where to download smallstack from :',
            when: function (answers) {
                return answers.smallstack.mode === "url" && smallstackUrl === undefined;
            }
        }
    ];

    inquirer.prompt(questions).then(function (answers) {
        smallstackMode = answers.smallstack.mode || smallstackMode;
        smallstackUrl = answers.smallstack.url || smallstackUrl;
        smallstackPath = answers.smallstack.path || smallstackPath;
        switch (smallstackMode) {
            case "local":
                console.log("using local path : ", smallstackPath);
                persistLocalConfiguration(smallstackPath, true);
                done();
                break;
            case "projectVersion":
                downloadAndExtractVersion(params, config.smallstack.version, config.smallstackDirectory, function () {
                    persistLocalConfiguration(config.smallstackDirectory);
                    done();
                });
                break;
            case "file":
                fs.emptyDirSync(config.smallstackDirectory);
                unzipSmallstackFile(path.join(config.rootDirectory, answers.smallstack.filepath), config.smallstackDirectory, function () {
                    persistLocalConfiguration(config.smallstackDirectory);
                    done();
                });
                break;
            case "url":
                fs.emptyDirSync(config.smallstackDirectory);
                downloadAndExtract(smallstackUrl, config.smallstackDirectory, function () {
                    persistLocalConfiguration(config.smallstackDirectory);
                    done();
                });
                break;
            default:
                throw new Error(smallstackMode + " is an unknown way of getting smallstack packages!");
        }
    });
}

function createSymlink(from, to, createMissingDirectories) {
    if (createMissingDirectories === undefined)
        createMissingDirectories = true;

    if (createMissingDirectories)
        fs.ensureDirSync(from);

    try {
        fs.removeSync(to);
        console.log("creating symlink: " + from + " -> " + to);
        fs.ensureSymlinkSync(from, to);
    } catch (e) {
        console.error(e);
    }
}

function npmInstallModules() {
    exec("npm install", {
        cwd: path.resolve(config.rootDirectory, "modules", "core")
    });
    exec("npm install", {
        cwd: path.resolve(config.rootDirectory, "modules", "meteor")
    });
    exec("npm install", {
        cwd: path.resolve(config.rootDirectory, "modules", "nativescript")
    });
}

function linkModules() {

    // core-client
    createSymlink(path.resolve(config.rootDirectory, "modules", "core", "common"), path.resolve(config.rootDirectory, "modules", "core", "client", "node_modules", "@smallstack", "core-common"));

    // core-server
    createSymlink(path.resolve(config.rootDirectory, "modules", "core", "common"), path.resolve(config.rootDirectory, "modules", "core", "server", "node_modules", "@smallstack", "core-common"));

    // meteor-common
    createSymlink(path.resolve(config.rootDirectory, "modules", "core", "common"), path.resolve(config.rootDirectory, "modules", "meteor", "common", "node_modules", "@smallstack", "core-common"));

    // meteor-client
    createSymlink(path.resolve(config.rootDirectory, "modules", "core", "common"), path.resolve(config.rootDirectory, "modules", "meteor", "client", "node_modules", "@smallstack", "core-common"));
    createSymlink(path.resolve(config.rootDirectory, "modules", "core", "client"), path.resolve(config.rootDirectory, "modules", "meteor", "client", "node_modules", "@smallstack", "core-client"));

    // meteor-server
    createSymlink(path.resolve(config.rootDirectory, "modules", "core", "common"), path.resolve(config.rootDirectory, "modules", "meteor", "server", "node_modules", "@smallstack", "core-common"));
    createSymlink(path.resolve(config.rootDirectory, "modules", "core", "server"), path.resolve(config.rootDirectory, "modules", "meteor", "server", "node_modules", "@smallstack", "core-server"));

    // nativescript
    createSymlink(path.resolve(config.rootDirectory, "modules", "core", "common"), path.resolve(config.rootDirectory, "modules", "nativescript", "node_modules", "@smallstack", "core-common"));
}

function persistLocalConfiguration(smallstackPath, addDistBundlePath) {
    if (smallstackPath === undefined)
        throw Error("No smallstack.path is given!");
    var additionalPath = "";
    if (addDistBundlePath === true)
        additionalPath = "dist/bundle";

    var absoluteModuleCoreClientPath = path.resolve(config.rootDirectory, smallstackPath, "modules", "core", "client", additionalPath);
    var absoluteModuleCoreServerPath = path.resolve(config.rootDirectory, smallstackPath, "modules", "core", "server", additionalPath);
    var absoluteModuleCoreCommonPath = path.resolve(config.rootDirectory, smallstackPath, "modules", "core", "common", additionalPath);
    var absoluteModuleMeteorClientPath = path.resolve(config.rootDirectory, smallstackPath, "modules", "meteor", "client", additionalPath);
    var absoluteModuleMeteorServerPath = path.resolve(config.rootDirectory, smallstackPath, "modules", "meteor", "server", additionalPath);
    var absoluteModuleMeteorCommonPath = path.resolve(config.rootDirectory, smallstackPath, "modules", "meteor", "common", additionalPath);
    var absoluteModuleNativescriptPath = path.resolve(config.rootDirectory, smallstackPath, "modules", "nativescript", additionalPath);
    var absoluteDatalayerPath = path.resolve(config.datalayerPath, "dist", "bundles");

    // meteor links
    createSymlink(absoluteModuleCoreClientPath, config.meteorSmallstackCoreClientDirectory);
    createSymlink(absoluteModuleCoreServerPath, config.meteorSmallstackCoreServerDirectory);
    createSymlink(absoluteModuleCoreCommonPath, config.meteorSmallstackCoreCommonDirectory);
    createSymlink(absoluteModuleMeteorClientPath, config.meteorSmallstackMeteorClientDirectory);
    createSymlink(absoluteModuleMeteorServerPath, config.meteorSmallstackMeteorServerDirectory);
    createSymlink(absoluteModuleMeteorCommonPath, config.meteorSmallstackMeteorCommonDirectory);
    createSymlink(absoluteDatalayerPath, config.meteorDatalayerPath);

    // datalayer
    createSymlink(absoluteModuleCoreCommonPath, config.datalayerSmallstackCoreCommonDirectory);

    // nativescript module
    // createSymlink(absoluteSmallstackCoreClientPath, path.resolve(config.rootDirectory, smallstackPath, "modules", "nativescript", "node_modules", "@smallstack", "core-client"));
    // createSymlink(absoluteModuleCoreCommonPath, path.resolve(config.rootDirectory, smallstackPath, "modules", "nativescript", "node_modules", "@smallstack", "core-common"));
    // createSymlink(absoluteModuleNativescriptPath, path.resolve(config.rootDirectory, smallstackPath, "modules", "nativescript", "node_modules", "@smallstack", "nativescript"));

    // // meteor module
    // createSymlink(absoluteSmallstackCorePath, path.resolve(config.rootDirectory, smallstackPath, "modules", "meteor", "node_modules", "@smallstack", "core"));

    if (config.nativescriptDirectory) {
        createSymlink(absoluteModuleCoreClientPath, config.nativescriptSmallstackCoreClientDirectory);
        createSymlink(absoluteModuleCoreCommonPath, config.nativescriptSmallstackCoreCommonDirectory);
        createSymlink(absoluteModuleNativescriptPath, config.nativescriptSmallstackNativescriptDirectory);
        createSymlink(absoluteDatalayerPath, config.nativescriptDatalayerDirectory);
    }

}

function downloadAndExtractVersion(parameters, version, destination, doneCallback) {
    var smallstackApi = new SmallstackApi(parameters);
    request({
        method: "GET",
        url: smallstackApi.url + "/releases/" + version,
        headers: {
            "x-smallstack-apikey": smallstackApi.key
        }
    }, function (error, response, body) {
        var body = JSON.parse(body);
        if (!body.url)
            throw new Error("Response didn't include url parameter!");
        downloadAndExtract(body.url, destination, doneCallback);
    });
}


function downloadAndExtract(url, destination, callback) {
    fs.ensureDirSync(config.tmpDirectory);
    var targetFileName = path.join(config.tmpDirectory, "smallstack.zip");
    if (fs.existsSync(targetFileName))
        fs.removeSync(targetFileName);
    console.log("downloading '" + url + "' to '" + targetFileName + "' and extracting to " + destination);
    request({
        method: "GET",
        url: url
    }, function (error, response, body) {
        fs.emptyDirSync(destination);

        // unzip file
        unzipSmallstackFile(targetFileName, destination, callback);

    }).pipe(fs.createWriteStream(targetFileName));
}


function unzipSmallstackFile(file, destination, callback) {

    var unzipper = new DecompressZip(file);
    unzipper.on('error', function (err) {
        console.log('Caught an error', err);
    });

    unzipper.on('extract', function (log) {
        console.log('Finished extracting');
        callback();
    });

    unzipper.on('progress', function (fileIndex, fileCount) {
        console.log('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
    });

    unzipper.extract({
        path: destination,
        filter: function (file) {
            return file.type !== "SymbolicLink";
        }
    });
}
