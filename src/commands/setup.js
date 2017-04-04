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
var semver = require("semver");

module.exports = function (params, done) {

    if (config.isSmallstackEnvironment()) {
        linkModules();
        if (!params || params.linkOnly !== true)
            npmInstallModules(config.rootDirectory);
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
                return !smallstackMode && answers.smallstack.mode === "local" && smallstackPath === undefined;
            }
        },
        {
            name: "smallstack.filepath",
            type: 'input',
            message: 'relative path from project root to local file location :',
            default: "../smallstack/dist/smallstack.zip",
            when: function (answers) {
                return !smallstackMode && answers.smallstack.mode === "file";
            }
        },
        {
            name: "smallstack.url",
            type: 'input',
            message: 'please enter the url where to download smallstack from :',
            when: function (answers) {
                return !smallstackMode && answers.smallstack.mode === "url" && smallstackUrl === undefined;
            }
        }
    ];

    inquirer.prompt(questions).then(function (answers) {
        if (!answers.smallstack)
            answers.smallstack = {};
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
                    npmInstallModules(config.smallstackDirectory);
                    copyMeteorDependencies(path.join(config.smallstackDirectory, "modules"));
                    done();
                });
                break;
            case "file":
                fs.emptyDirSync(config.smallstackDirectory);
                unzipSmallstackFile(path.join(config.rootDirectory, answers.smallstack.filepath), config.smallstackDirectory, function () {
                    persistLocalConfiguration(config.smallstackDirectory);
                    npmInstallModules(config.smallstackDirectory);
                    copyMeteorDependencies(path.join(config.smallstackDirectory, "modules"));
                    done();
                });
                break;
            case "url":
                fs.emptyDirSync(config.smallstackDirectory);
                downloadAndExtract(smallstackUrl, config.smallstackDirectory, function () {
                    persistLocalConfiguration(config.smallstackDirectory);
                    npmInstallModules(config.smallstackDirectory);
                    copyMeteorDependencies(path.join(config.smallstackDirectory, "modules"));
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

function npmInstallModules(rootPath) {
    exec("npm install", {
        cwd: path.resolve(rootPath, "modules", "core-common")
    });
    exec("npm install", {
        cwd: path.resolve(rootPath, "modules", "core-client")
    });
    exec("npm install", {
        cwd: path.resolve(rootPath, "modules", "core-server")
    });
    exec("npm install", {
        cwd: path.resolve(rootPath, "modules", "meteor-common")
    });
    exec("npm install", {
        cwd: path.resolve(rootPath, "modules", "meteor-client")
    });
    exec("npm install", {
        cwd: path.resolve(rootPath, "modules", "meteor-server")
    });
    exec("npm install", {
        cwd: path.resolve(rootPath, "modules", "nativescript")
    });
}

function copyMeteorDependencies(modulesPath) {
    var dependencies = {};
    dependencies.coreCommonDependencies = require(path.join(modulesPath, "core-common", "package.json"));
    dependencies.coreClientDependencies = require(path.join(modulesPath, "core-client", "package.json"));
    dependencies.coreServerDependencies = require(path.join(modulesPath, "core-server", "package.json"));
    dependencies.meteorCommonDependencies = require(path.join(modulesPath, "meteor-common", "package.json"));
    dependencies.meteorClientDependencies = require(path.join(modulesPath, "meteor-client", "package.json"));
    dependencies.meteorServerDependencies = require(path.join(modulesPath, "meteor-server", "package.json"));

    var common = {};
    _.each(dependencies, function (subDependencies) {
        _.each(subDependencies.dependencies, function (version, name) {
            common[name] = version;
        });
    });

    var meteorPackageJsonPath = path.join(config.meteorDirectory, "package.json");
    var content = require(meteorPackageJsonPath);
    if (!content.dependencies)
        content.dependencies = {};
    if (!content.devDependencies)
        content.devDependencies = {};

    // smallstack dependencies
    content.dependencies["@smallstack/core-common"] = "*";
    content.dependencies["@smallstack/core-client"] = "*";
    content.dependencies["@smallstack/core-server"] = "*";
    content.dependencies["@smallstack/meteor-common"] = "*";
    content.dependencies["@smallstack/meteor-client"] = "*";
    content.dependencies["@smallstack/meteor-server"] = "*";
    content.dependencies["babel-runtime"] = "6.23.0";

    content.dependencies["zone.js"] = "0.8.5";
    content.dependencies["rxjs"] = "5.2.0";
    content.dependencies["bcrypt"] = "1.0.2";
    content.dependencies["reflect-metadata"] = "0.1.10";
    content.dependencies["angular2-meteor-polyfills"] = "0.2.0";
    content.dependencies["@angular/core"] = "4.0.1";
    content.dependencies["@angular/common"] = "4.0.1";
    content.dependencies["@angular/compiler"] = "4.0.1";
    content.dependencies["@angular/forms"] = "4.0.1";
    content.dependencies["@angular/http"] = "4.0.1";
    content.dependencies["@angular/platform-browser"] = "4.0.1";
    content.dependencies["@angular/platform-browser-dynamic"] = "4.0.1";
    content.dependencies["@angular/router"] = "4.0.1";


    // meteor app dependencies
    var meteorDependencies = [
        "jquery",
        "underscore",
        "toastr",
        "zone.js",
        "rxjs",
        "bcrypt",
        "reflect-metadata",
        "angular2-meteor-polyfills",
        "@angular/core",
        "@angular/common",
        "@angular/compiler",
        "@angular/forms",
        "@angular/http",
        "@angular/platform-browser",
        "@angular/platform-browser-dynamic",
        "@angular/router",
        "angular2-markdown",
        "ng2-bootstrap",
        "bootstrap"
    ];

    var meteorDevDependencies = ["@types/meteor", "meteor-node-stubs"];

    _.each(meteorDependencies, function (name) {
        content.dependencies[name] = common[name];
    });
    _.each(meteorDevDependencies, function (name) {
        content.devDependencies[name] = common[name];
    });

    fs.writeJSONSync(meteorPackageJsonPath, content);

    exec("meteor npm install", {
        cwd: config.meteorDirectory
    });

}

function linkModules() {

    // core-client
    createSymlink(path.resolve(config.rootDirectory, "modules", "core-common"), path.resolve(config.rootDirectory, "modules", "core-client", "node_modules", "@smallstack", "core-common"));

    // core-server
    createSymlink(path.resolve(config.rootDirectory, "modules", "core-common"), path.resolve(config.rootDirectory, "modules", "core-server", "node_modules", "@smallstack", "core-common"));

    // meteor-common
    createSymlink(path.resolve(config.rootDirectory, "modules", "core-common"), path.resolve(config.rootDirectory, "modules", "meteor-common", "node_modules", "@smallstack", "core-common"));

    // meteor-client
    createSymlink(path.resolve(config.rootDirectory, "modules", "core-common"), path.resolve(config.rootDirectory, "modules", "meteor-client", "node_modules", "@smallstack", "core-common"));
    createSymlink(path.resolve(config.rootDirectory, "modules", "core-client"), path.resolve(config.rootDirectory, "modules", "meteor-client", "node_modules", "@smallstack", "core-client"));

    // meteor-server
    createSymlink(path.resolve(config.rootDirectory, "modules", "core-common"), path.resolve(config.rootDirectory, "modules", "meteor-server", "node_modules", "@smallstack", "core-common"));
    createSymlink(path.resolve(config.rootDirectory, "modules", "core-server"), path.resolve(config.rootDirectory, "modules", "meteor-server", "node_modules", "@smallstack", "core-server"));

    // nativescript
    createSymlink(path.resolve(config.rootDirectory, "modules", "core-common"), path.resolve(config.rootDirectory, "modules", "nativescript", "node_modules", "@smallstack", "core-common"));
}

function persistLocalConfiguration(smallstackPath, addDistBundlePath) {
    if (smallstackPath === undefined)
        throw Error("No smallstack.path is given!");
    var additionalPath = "";
    if (addDistBundlePath === true)
        additionalPath = "dist/bundle";

    var absoluteModuleCoreClientPath = path.resolve(config.rootDirectory, smallstackPath, "modules", "core-client", additionalPath);
    var absoluteModuleCoreServerPath = path.resolve(config.rootDirectory, smallstackPath, "modules", "core-server", additionalPath);
    var absoluteModuleCoreCommonPath = path.resolve(config.rootDirectory, smallstackPath, "modules", "core-common", additionalPath);
    var absoluteModuleMeteorClientPath = path.resolve(config.rootDirectory, smallstackPath, "modules", "meteor-client", additionalPath);
    var absoluteModuleMeteorServerPath = path.resolve(config.rootDirectory, smallstackPath, "modules", "meteor-server", additionalPath);
    var absoluteModuleMeteorCommonPath = path.resolve(config.rootDirectory, smallstackPath, "modules", "meteor-common", additionalPath);
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
    // createSymlink(absoluteSmallstackCorePath, path.resolve(config.rootDirectory, smallstackPath, "modules", "meteor-node_modules", "@smallstack", "core"));

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
