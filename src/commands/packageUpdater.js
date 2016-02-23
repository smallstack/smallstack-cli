var glob = require('glob');
var _ = require("underscore");
var inquirer = require("inquirer");
var fs = require("fs-extra");
var config = require("../config");
var exec = require("../functions/exec");
var path = require("path");
var DecompressZip = require("decompress-zip");

module.exports = function (commander) {

    
    // properties
    var smallstackZipFilePath = "smallstack";
    var smallstackMode = commander.mode;
    var smallstackPath = commander.path;

    var questions = [
        {
            name: "smallstack.mode",
            type: 'list',
            message: 'smallstack location :',
            choices: [
                { name: "locally checked out version (e.g. develop, master or a feature branch)", value: "local" },
                { name: "downloaded zip file (placed in " + smallstackZipFilePath + ")", value: "downloadedZip" }
            ],
            when: function () {
                return !smallstackMode;
            }
        },
        {
            name: "smallstack.path",
            type: 'input',
            message: 'relative path from project root to local smallstack directory :',
            default: "../../smallstack",
            when: function (answers) {
                return answers["smallstack.mode"] === "local" && smallstackPath === undefined;
            }
        },
        {
            name: "smallstack.path",
            type: 'list',
            message: 'Select the downloaded file : ',
            choices: function () {
                return glob.sync(smallstackZipFilePath + "/smallstack-*.zip");
            },
            when: function (answers) {
                return answers["smallstack.mode"] === "downloadedZip";
            }
        }
    ]

    inquirer.prompt(questions, function (answers) {
        smallstackMode = answers["smallstack.mode"] || smallstackMode;
        smallstackPath = answers["smallstack.path"] || smallstackPath;
        persistPackageConfiguration(smallstackMode, smallstackPath);
    });

}

function readPackages(smallstackPath) {
    return glob.sync(smallstackPath + "/smallstack-*");
}

function persistPackageConfiguration(smallstackMode, smallstackPath) {
    console.log("Mode     :", smallstackMode);
    if (smallstackMode === "local") {
        if (smallstackPath === undefined)
            throw Error("Smallstack Version is set to 'local' but no smallstack.path is given!");
        var localPackagesContent = {};
        _.each(readPackages(smallstackPath), function (availablePackage) {
            localPackagesContent[path.basename(availablePackage)] = {
                "path": path.relative(config.meteorDirectory, availablePackage).replace(/\\/g, "/")
            }
        });
        if (_.keys(localPackagesContent).length === 0)
            throw new Error("No smallstack packages found in destination : " + path.resolve(smallstackPath));
        else
            console.log("Found " + _.keys(localPackagesContent).length + " smallstack packages in " + path.resolve(smallstackPath));

        var localMGPFile = config.meteorDirectory + "/local-packages.json";
        fs.createFileSync(localMGPFile);
        fs.writeFileSync(localMGPFile, JSON.stringify(localPackagesContent, null, 2));
        exec("mgp link", {
            cwd: config.meteorDirectory
        });
    } else if (smallstackMode === "zip") {
        if (smallstackPath === undefined)
            throw Error("Smallstack Mode is set to 'zip' but no smallstack.path is given!");
        console.log("zip path :", path.resolve(smallstackPath));

        var destinationPath = path.join(config.meteorDirectory, "packages");
            
        // clean packages directory
        fs.emptyDirSync(destinationPath);
            
        // unzip file
        var unzipper = new DecompressZip(smallstackPath);
        unzipper.on('error', function (err) {
            console.log('Caught an error', err);
        });

        unzipper.on('extract', function (log) {
            console.log('Finished extracting');
        });

        unzipper.on('progress', function (fileIndex, fileCount) {
            console.log('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
        });

        unzipper.extract({
            path: destinationPath,
            filter: function (file) {
                return file.type !== "SymbolicLink";
            }
        });
    }
    else
        throw new Error("No valid smallstack version given (neither 'local' nor 'remote')!");
}