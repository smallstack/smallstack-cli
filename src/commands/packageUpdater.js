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

    // properties
    var smallstackMode = params.mode;
    var smallstackPath = params.path;

    var packageModes = [{
        name: "local checkout",
        value: "local"
    }];
    if (!config.smallstack || !config.smallstack.version)
        console.error(colors.red("ERROR: No smallstack.version defined in project's package.json!\n"));
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
        }
    ]

    inquirer.prompt(questions).then(function (answers) {
        smallstackMode = answers.smallstack.mode || smallstackMode;
        // if (answers["smallstack.path"])
        //     smallstackPath = path.join(config.rootDirectory, answers["smallstack.path"]);
        // else
        //     smallstackPath = answers["smallstack.path"] || smallstackPath;
        switch (smallstackMode) {
            case "local":
                persistLocalConfiguration(answers.smallstack.path || smallstackPath);
                done();
                break;
            case "projectVersion":
                throw new Error("Currently not supported!");
                // downloadAndExtractVersion(params, config.smallstack.version, done);
                // break;
            default:
                throw new Error(smallstackMode + " is an unknown way of getting smallstack packages!");
        }
    });
}

function persistLocalConfiguration(smallstackPath) {
    if (smallstackPath === undefined)
        throw Error("No smallstack.path is given!");

    var absoluteSmallstackPath = path.resolve(config.rootDirectory, smallstackPath, "dist", "bundles");
    var absoluteDatalayerPath = path.resolve(config.datalayerPath, "dist", "bundles");

    fs.ensureDirSync(config.datalayerPath);

    fs.removeSync(config.meteorSmallstackDirectory);
    console.log("creating symlink: " + absoluteSmallstackPath + " -> " + config.meteorSmallstackDirectory);
    fs.ensureSymlinkSync(absoluteSmallstackPath, config.meteorSmallstackDirectory);

    fs.removeSync(config.datalayerSmallstackDirectory);
    console.log("creating symlink: " + absoluteSmallstackPath + " -> " + config.datalayerSmallstackDirectory);
    fs.ensureSymlinkSync(absoluteSmallstackPath, config.datalayerSmallstackDirectory);

    // fs.removeSync(config.meteorPackagesDirectory);
    // console.log("creating symlink: " + absoluteSmallstackPath + " -> " + config.meteorPackagesDirectory);
    // fs.ensureSymlinkSync(absoluteSmallstackPath, config.meteorPackagesDirectory);

    fs.removeSync(config.meteorDatalayerPath);
    console.log("creating symlink: " + absoluteDatalayerPath + " -> " + config.meteorDatalayerPath);
    fs.ensureSymlinkSync(absoluteDatalayerPath, config.meteorDatalayerPath);

    // fs.removeSync(config.smallstackMeteorPackageTargetDirectory);
    // console.log("creating symlink: " + config.smallstackMeteorPackageSourceDirectory + " -> " + config.smallstackMeteorPackageTargetDirectory);
    // fs.ensureSymlinkSync(config.smallstackMeteorPackageSourceDirectory, config.smallstackMeteorPackageTargetDirectory);
}

function downloadAndExtractVersion(parameters, version, doneCallback) {
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

        fs.ensureDirSync(config.tmpDirectory);
        var targetFileName = path.join(config.tmpDirectory, "smallstack-" + version + ".zip");

        request({
            method: "GET",
            url: body.url
        }, function (error, response, body) {
            fs.ensureDirSync(config.packagesDirectory);
            fs.emptyDirSync(config.packagesDirectory);

            // unzip file
            var unzipper = new DecompressZip(targetFileName);
            unzipper.on('error', function (err) {
                console.log('Caught an error', err);
            });

            unzipper.on('extract', function (log) {
                console.log('Finished extracting');
                doneCallback();
            });

            unzipper.on('progress', function (fileIndex, fileCount) {
                console.log('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
            });

            unzipper.extract({
                path: config.packagesDirectory,
                filter: function (file) {
                    return file.type !== "SymbolicLink";
                }
            });

        }).pipe(fs.createWriteStream(targetFileName));
    });
}
