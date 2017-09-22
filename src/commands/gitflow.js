var fs = require("fs-extra");
var path = require("path");
var _ = require("underscore");
var exec = require("../functions/exec");
var config = require("../config");
var glob = require("glob");
var gitState = require("git-state");
var colors = require("colors");
var plist = require("plist");
var semver = require("semver");
var SimpleGit = require('simple-git');
var async = require('asyncawait/async');
var await = require('asyncawait/await');
var Promise = require('bluebird');
var templating = require("../functions/templating");
var createMeteorVersionFile = require("../functions/createMeteorVersionFile").createMeteorVersionFile;

module.exports = async(function (parameters) {
    var forceMode = parameters && parameters.force === true;
    var doneSomething = false;
    var releaseIsFirst = parameters && _.keys(parameters).indexOf("release") === 0;
    var currentVersion = config.version;
    var tagName = currentVersion;

    console.log("starting gitflow operations...");

    if (gitState.isGitSync(config.rootDirectory)) {
        var state = gitState.checkSync(config.rootDirectory);
        if (state.dirty !== 0 || state.untracked !== 0) {
            if (!forceMode)
                throw new Error("Uncommitted changes detected! Please commit your code before doing gitflow operations!");
            else
                console.error(colors.red("Warning: Uncommitted changes detected! Please commit your code before doing gitflow operations!"));
        }
    } else console.error("Warning: Your project is not under (git) version control!");

    if (parameters.release && releaseIsFirst) {
        doneSomething = true;
        await(doRelease(tagName));
    }

    if (!parameters.toVersion && parameters.patch) {
        var newVersion = semver.inc(currentVersion, "patch");
        console.log("Setting patch version " + newVersion);
        parameters.toVersion = newVersion;
    }

    if (!parameters.toVersion && parameters.minor) {
        var newVersion = semver.inc(currentVersion, "minor");
        console.log("Setting minor version " + newVersion);
        parameters.toVersion = newVersion;
    }

    if (!parameters.toVersion && parameters.major) {
        var newVersion = semver.inc(currentVersion, "major");
        console.log("Setting major version " + newVersion);
        parameters.toVersion = newVersion;
    }

    if (parameters.toVersion) {
        doneSomething = true;
        await(toVersion(parameters.toVersion));
        tagName = parameters.toVersion;
    }

    if (parameters.release && !releaseIsFirst) {
        doneSomething = true;
        await(doRelease(tagName));
    }

    if (!doneSomething) {
        throw new Error("No Operations were executed!");
    }
});

var doRelease = async(function doRelease(tagName) {
    return new Promise(function (resolve, reject) {
        if (gitState.isGitSync(config.rootDirectory)) {
            var state = gitState.checkSync(config.rootDirectory);
            if (state.dirty !== 0 || state.untracked !== 0)
                throw new Error("Uncommitted changes are not allowed when doing a release!");
            var currentUserBranch = state.branch;
            var git = SimpleGit(config.rootDirectory);
            git.branchLocal(function (error, summary) {
                if (summary.branches.master === undefined)
                    reject("No local master branch found!");
                else if (summary.branches.develop === undefined)
                    reject("No local develop branch found!");
            })
                .tags(function (error, tags) {
                    if (tags.all.indexOf(tagName) !== -1)
                        throw new Error("Tag '" + tagName + "' already exists!")
                })
                .checkout("master", function () { console.log("checked out master..."); })
                .mergeFromTo("develop", "master", ["-m Merge branch 'develop' into 'master'", "--log"], function () { console.log("merged develop into master..."); })
                .addTag(tagName, function () { console.log("created tag " + tagName); })
                .checkout(currentUserBranch, function () {
                    console.log("checked out user branch " + currentUserBranch);
                    resolve();
                });
        } else throw new Error("Your project must be under (git) version control for doing a release!");
    });
});

var toVersion = async(function toVersion(toVersion) {
    return new Promise(function (resolve, reject) {
        if (config.isProjectEnvironment()) {

            // root package.json
            var rootPackageJsonPath = path.resolve(config.rootDirectory, "package.json");
            if (!fs.existsSync(rootPackageJsonPath))
                throw new Error("No package.json found in project root!");
            replaceVersionInPackageJson(rootPackageJsonPath, toVersion);
            createMeteorVersionFile();

            // meteor app
            var meteorPJP = path.resolve(config.meteorDirectory, "package.json");
            if (!fs.existsSync(meteorPJP))
                throw new Error("No meteor package.json found!");
            replaceVersionInPackageJson(meteorPJP, toVersion);

            // frontend app
            if (config.projectHasFrontend()) {
                var frontendPJP = path.resolve(config.frontendDirectory, "package.json");
                if (!fs.existsSync(frontendPJP))
                    throw new Error("No frontend package.json found!");
                replaceVersionInPackageJson(frontendPJP, toVersion);
            }

            // datalayer
            var datalayerPJP = path.resolve(config.datalayerPath, "package.json");
            if (!fs.existsSync(datalayerPJP))
                throw new Error("No datalayer package.json found!");
            replaceVersionInPackageJson(datalayerPJP, toVersion);
            var datalayerBundlePJP = path.resolve(config.datalayerPath, "package_bundle.json");
            if (!fs.existsSync(datalayerBundlePJP))
                throw new Error("No datalayer package_bundle.json found!");
            replaceVersionInPackageJson(datalayerBundlePJP, toVersion);

            // nativescript app
            if (config.projectHasNativescriptApp()) {

                // root package.json
                var nativescriptRootPJP = path.resolve(config.nativescriptDirectory, "package.json");
                if (!fs.existsSync(nativescriptRootPJP))
                    throw new Error("No nativescript root package.json found!");
                replaceVersionInPackageJson(nativescriptRootPJP, toVersion);

                // iOS
                var nativescriptIOSPlistPath = path.resolve(config.nativescriptDirectory, "app", "App_Resources", "iOS", "Info.plist");
                console.log("changing version of " + nativescriptIOSPlistPath);
                if (!fs.existsSync(nativescriptIOSPlistPath))
                    throw new Error("No ios Info.plist file found!");
                var parsedPlist = plist.parse(fs.readFileSync(nativescriptIOSPlistPath, 'utf8'));
                parsedPlist.CFBundleShortVersionString = toVersion;
                parsedPlist.CFBundleVersion = toVersion;
                fs.writeFileSync(nativescriptIOSPlistPath, plist.build(parsedPlist), {
                    encoding: "utf8"
                });

                // Android Manifest
                var androidManifest = path.resolve(config.nativescriptDirectory, "app", "App_Resources", "Android", "AndroidManifest.xml");
                console.log("changing version of " + androidManifest);
                var versionCodeRegexMani = /android:versionCode=\"([0-9].*)\"/;
                var versionNameRegexMani = /android:versionName=\"([a-zA-Z\.0-9].*)\"/;
                var currentVersionCode = parseInt(getRegex(androidManifest, versionCodeRegexMani));
                var nextAndroidVersionCode = currentVersionCode + 1;
                console.log("Current Android Version Code : ", currentVersionCode);
                console.log("Next Android Version Code    : ", nextAndroidVersionCode);
                console.warn(colors.cyan("Hint: Please double-check the unique android version code, this tool just increments the current one!"));
                replaceString(androidManifest, versionCodeRegexMani, "android:versionCode=\"" + nextAndroidVersionCode + "\"");
                replaceString(androidManifest, versionNameRegexMani, "android:versionName=\"" + toVersion + "\"");

                // Android gradle
                var androidGradlig = path.resolve(config.nativescriptDirectory, "app", "App_Resources", "Android", "app.gradle");
                console.log("changing version of " + androidGradlig);
                var versionCodeRegexGradlig = /versionCode ([0-9].*)/;
                var versionNameRegexGradlig = /versionName \"([a-zA-Z\.0-9].*)\"/;
                replaceString(androidGradlig, versionCodeRegexGradlig, "versionCode " + nextAndroidVersionCode);
                replaceString(androidGradlig, versionNameRegexGradlig, "versionName \"" + toVersion + "\"");
            }

            // do the commit
            exec("git commit -a -m \"changing version to " + toVersion + "\"");
            resolve();
        } else if (config.isSmallstackEnvironment()) {
            glob("**/package.json", {
                ignore: ["**/node_modules/**", "**/dist/**", "resources/projectfiles/meteor/**"]
            }, function (err, files) {
                _.each(files, function (file) {
                    var absolutePath = path.resolve(config.rootDirectory, file);
                    replaceVersionInPackageJson(absolutePath, toVersion);
                });
                exec("git commit -a -m \"changing version to " + toVersion + "\"");
                resolve();
            });
        } else if (config.isNPMPackageEnvironment()) {
            exec("npm version -f --git-tag-version=false " + toVersion);
            exec("git commit -a -m \"changing version to " + toVersion + "\"");
            resolve();
        } else throw new Error("Unsupported Environment!");
    });
});

function replaceString(file, regex, replacement) {
    var fs = require('fs');
    var data = fs.readFileSync(file, 'utf8');
    var result = data.replace(regex, replacement);
    fs.writeFileSync(file, result, 'utf8');
}

function getRegex(file, regex) {
    var fs = require('fs');
    var data = fs.readFileSync(file, 'utf8');
    return regex.exec(data)[1];
}

function replaceVersionInPackageJson(file, newVersion) {
    var jsonContent = require(file);
    console.log("changing version of '" + jsonContent.name + "' from " + jsonContent.version + " to " + newVersion);
    jsonContent.version = newVersion;
    fs.writeJSONSync(file, jsonContent);
}
