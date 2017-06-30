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
var sortPackageJson = require("sort-package-json");
var syncProjectFiles = require("./syncproject");

module.exports = function (params, done) {

    if (config.isSmallstackEnvironment()) {
        linkModules();
        if (!params || params.linkOnly !== true)
            npmInstallModules(config.rootDirectory, true);
        done();
    }
    else if (config.isComponentEnvironment() || config.isNativescriptEnvironment()) {
        setupNPMProject(params, done);
    }
    else if (config.isProjectEnvironment()) {
        setupSmallstackProject(params, done);
    }
    else throw new Error("Unknown Environment for 'smallstack setup', sorry!");
}



function setupNPMProject(params, done) {
    askPackageModeQuestions(params, function (smallstackMode, smallstackUrl, smallstackPath) {
        switch (smallstackMode) {
            case "local":
                persistNPMConfiguration(smallstackPath, true);
                done();
                break;
            case "projectVersion":
                downloadAndExtractVersion(params, config.smallstack.version, config.smallstackDirectory, function () {
                    persistNPMConfiguration(config.smallstackDirectory);
                    done();
                });
                break;
            case "file":
                fs.emptyDirSync(config.smallstackDirectory);
                unzipSmallstackFile(path.join(config.rootDirectory, answers.smallstack.filepath), config.smallstackDirectory, function () {
                    persistNPMConfiguration(config.smallstackDirectory);
                });
                break;
            case "url":
                fs.emptyDirSync(config.smallstackDirectory);
                downloadAndExtract(smallstackUrl, config.smallstackDirectory, function () {
                    persistNPMConfiguration(config.smallstackDirectory);
                    done();
                });
                break;
            default:
                throw new Error(smallstackMode + " is an unknown way of getting smallstack packages!");
        }
    });
}

function persistNPMConfiguration(smallstackPath, addDistBundlePath) {
    if (smallstackPath === undefined)
        throw Error("No smallstack.path is given!");
    var additionalPath = "";
    if (addDistBundlePath === true)
        additionalPath = "dist/bundle";

    // search for smallstack dependencies in package.json
    var packagePath = path.join(config.rootDirectory, "package.json");
    var packageContent = require(packagePath);
    var requiredModules = [];
    _.each(packageContent.dependencies, function (value, key) {
        if (key.indexOf("@smallstack/") === 0)
            requiredModules.push(key.replace("@smallstack/", ""));
    });

    if (requiredModules.length === 0)
        throw new Error("No smallstack dependencies defined in package.json file. This might be intended?");

    _.each(requiredModules, function (value) {
        createSymlink(path.resolve(config.rootDirectory, smallstackPath, "modules", value, additionalPath), path.resolve(config.rootDirectory, "node_modules", "@smallstack", value));
    });
}


function askPackageModeQuestions(params, callbackFn) {
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
    }];

    inquirer.prompt(questions).then(function (answers) {
        if (!answers.smallstack)
            answers.smallstack = {};
        smallstackMode = answers.smallstack.mode || smallstackMode;
        smallstackUrl = answers.smallstack.url || smallstackUrl;
        smallstackPath = answers.smallstack.path || smallstackPath;
        callbackFn(smallstackMode, smallstackUrl, smallstackPath);
    });
}


function setupSmallstackProject(params, done) {
    askPackageModeQuestions(params, function (smallstackMode, smallstackUrl, smallstackPath) {
        console.log("cleaning local smallstack path : " + config.smallstackDirectory);
        fs.emptyDirSync(config.smallstackDirectory);
        switch (smallstackMode) {
            case "local":
                persistLocalConfiguration(smallstackPath, true, true);
                done();
                break;
            case "projectVersion":
                downloadAndExtractVersion(params, config.smallstack.version, config.smallstackDirectory, function () {
                    persistLocalConfiguration(config.smallstackDirectory);
                    // npmInstallModules(config.smallstackDirectory);
                    copyMeteorDependencies(params, path.join(config.smallstackDirectory, "modules"));
                    done();
                });
                break;
            case "file":
                fs.emptyDirSync(config.smallstackDirectory);
                unzipSmallstackFile(path.join(config.rootDirectory, answers.smallstack.filepath), config.smallstackDirectory, function () {
                    persistLocalConfiguration(config.smallstackDirectory);
                    // npmInstallModules(config.smallstackDirectory);
                    copyMeteorDependencies(params, path.join(config.smallstackDirectory, "modules"));
                    done();
                });
                break;
            case "url":
                fs.emptyDirSync(config.smallstackDirectory);
                downloadAndExtract(smallstackUrl, config.smallstackDirectory, function () {
                    persistLocalConfiguration(config.smallstackDirectory);
                    // npmInstallModules(config.smallstackDirectory);
                    copyMeteorDependencies(params, path.join(config.smallstackDirectory, "modules"));
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
    else if (!fs.existsSync(from)) {
        throw new Error("'from' does not exist, can't create symlink. from is set to " + from);
    }

    try {
        fs.removeSync(to);
        console.log("creating symlink: " + from + " -> " + to);
        fs.ensureSymlinkSync(from, to);
    } catch (e) {
        throw new Error(e.message + ", src:" + to + ", dst:" + from);
    }
}

function npmInstallModules(rootPath, alsoDevPackages) {
    var npmCommand = "npm install";
    if (alsoDevPackages !== true)
        npmCommand += " --production";

    exec(npmCommand, {
        cwd: path.resolve(rootPath, "modules", "core-common")
    });
    exec(npmCommand, {
        cwd: path.resolve(rootPath, "modules", "core-client")
    });
    exec(npmCommand, {
        cwd: path.resolve(rootPath, "modules", "core-server")
    });
    exec(npmCommand, {
        cwd: path.resolve(rootPath, "modules", "meteor-common")
    });
    exec(npmCommand, {
        cwd: path.resolve(rootPath, "modules", "meteor-client")
    });
    exec(npmCommand, {
        cwd: path.resolve(rootPath, "modules", "meteor-server")
    });
    exec(npmCommand, {
        cwd: path.resolve(rootPath, "modules", "nativescript")
    });
}

function copyMeteorDependencies(params, modulesPath) {
    var dependencies = {};
    dependencies.coreCommonDependencies = require(path.join(modulesPath, "core-common", "package.json"));
    dependencies.coreClientDependencies = require(path.join(modulesPath, "core-client", "package.json"));
    dependencies.coreServerDependencies = require(path.join(modulesPath, "core-server", "package.json"));
    dependencies.meteorCommonDependencies = require(path.join(modulesPath, "meteor-common", "package.json"));
    dependencies.meteorClientDependencies = require(path.join(modulesPath, "meteor-client", "package.json"));
    dependencies.meteorServerDependencies = require(path.join(modulesPath, "meteor-server", "package.json"));
    var nativescriptDependencies = require(path.join(modulesPath, "nativescript", "package.json"));

    var common = {};
    var commonDev = {};
    _.each(dependencies, function (subDependencies) {
        _.each(subDependencies.dependencies, function (version, name) {
            common[name] = version;
        });
        _.each(subDependencies.devDependencies, function (version, name) {
            commonDev[name] = version;
        });
    });

    var meteorPackageJsonPath = path.join(config.meteorDirectory, "package.json");
    var content = require(meteorPackageJsonPath);
    if (!content.dependencies)
        content.dependencies = {};
    if (!content.devDependencies)
        content.devDependencies = {};

    // automatic smallstack module dependencies
    _.each(common, function (version, name) {
        content.dependencies[name] = version;
    });

    _.each(commonDev, function (version, name) {
        content.devDependencies[name] = version;
    });


    // smallstack dependencies
    content.dependencies["@smallstack/core-common"] = "*";
    content.dependencies["@smallstack/core-client"] = "*";
    content.dependencies["@smallstack/core-server"] = "*";
    content.dependencies["@smallstack/meteor-common"] = "*";
    content.dependencies["@smallstack/meteor-client"] = "*";
    content.dependencies["@smallstack/meteor-server"] = "*";

    // hard requirements for meteor
    content.dependencies["babel-runtime"] = "6.23.0";
    content.dependencies["bcrypt"] = "1.0.2";

    content = sortPackageJson(content);

    fs.writeJSONSync(meteorPackageJsonPath, content);

    if (!params || params.offline !== true) {
        exec("meteor npm install", {
            cwd: config.meteorDirectory
        });
    }

    // write module root package.json
    var modulesDependencies = {
        "name": "smallstack-modules-dev",
        "version": "1.0.0",
        "dependencies": common,
        "devDependencies": commonDev
    };
    modulesDependencies.dependencies["@smallstack/core-common"] = "file:./core-common";
    modulesDependencies.dependencies["@smallstack/core-client"] = "file:./core-client";
    modulesDependencies.dependencies["@smallstack/core-server"] = "file:./core-server";
    modulesDependencies.dependencies["@smallstack/meteor-common"] = "file:./meteor-common";
    modulesDependencies.dependencies["@smallstack/meteor-client"] = "file:./meteor-client";
    modulesDependencies.dependencies["@smallstack/meteor-server"] = "file:./meteor-server";
    _.each(nativescriptDependencies.dependencies, function (version, name) {
        modulesDependencies.dependencies[name] = version;
    });
    fs.writeJSONSync(path.join(modulesPath, "package.json"), modulesDependencies);

    if (!params || params.offline !== true) {
        exec("npm install", {
            cwd: modulesPath
        });
    }

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
    createSymlink(path.resolve(config.rootDirectory, "modules", "core-client"), path.resolve(config.rootDirectory, "modules", "nativescript", "node_modules", "@smallstack", "core-client"));
}

function persistLocalConfiguration(smallstackPath, addDistBundlePath, linkResources) {
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
    var absoluteResourcesPath = path.resolve(config.rootDirectory, smallstackPath, "resources");
    var absoluteSmallstackDistPath = path.resolve(config.rootDirectory, smallstackPath, "dist");

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

    // resources
    if (linkResources) {
        createSymlink(absoluteResourcesPath, config.cliResourcesPath);
        // createSymlink(absoluteSmallstackDistPath, config.smallstackDistDirectory);
    }

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

    syncProjectFiles();
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
