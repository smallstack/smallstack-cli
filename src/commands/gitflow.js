var fs = require("fs-extra");
var path = require("path");
var _ = require("underscore");
var exec = require("../functions/exec");
var config = require("../config");
var glob = require("glob");
var gitState = require("git-state");
var colors = require("colors");
var plist = require("plist");


module.exports = function (parameters, done) {
    var forceMode = parameters && parameters.force === true;
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

    if (parameters.toVersion) {

        if (config.isProjectEnvironment()) {

            // root package.json
            var rootPackageJsonPath = path.resolve(config.rootDirectory, "package.json");
            if (!fs.existsSync(rootPackageJsonPath))
                throw new Error("No package.json found in project root!");
            replaceVersionInPackageJson(rootPackageJsonPath, parameters.toVersion);

            // meteor app
            var meteorPJP = path.resolve(config.meteorDirectory, "package.json");
            if (!fs.existsSync(meteorPJP))
                throw new Error("No meteor package.json found!");
            replaceVersionInPackageJson(meteorPJP, parameters.toVersion);

            // datalayer
            var datalayerPJP = path.resolve(config.datalayerPath, "package.json");
            if (!fs.existsSync(datalayerPJP))
                throw new Error("No datalayer package.json found!");
            replaceVersionInPackageJson(datalayerPJP, parameters.toVersion);
            var datalayerBundlePJP = path.resolve(config.datalayerPath, "package_bundle.json");
            if (!fs.existsSync(datalayerBundlePJP))
                throw new Error("No datalayer package_bundle.json found!");
            replaceVersionInPackageJson(datalayerBundlePJP, parameters.toVersion);

            // nativescript app
            if (config.projectHasNativescriptApp()) {

                // root package.json
                var nativescriptRootPJP = path.resolve(config.nativescriptDirectory, "package.json");
                if (!fs.existsSync(nativescriptRootPJP))
                    throw new Error("No nativescript root package.json found!");
                replaceVersionInPackageJson(nativescriptRootPJP, parameters.toVersion);

                // iOS
                var nativescriptIOSPlistPath = path.resolve(config.nativescriptDirectory, "app", "App_Resources", "iOS", "Info.plist");
                console.log("changing version of " + nativescriptIOSPlistPath);
                if (!fs.existsSync(nativescriptIOSPlistPath))
                    throw new Error("No ios Info.plist file found!");
                var parsedPlist = plist.parse(fs.readFileSync(nativescriptIOSPlistPath, 'utf8'));
                parsedPlist.CFBundleShortVersionString = parameters.toVersion;
                parsedPlist.CFBundleVersion = parameters.toVersion;
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
                replaceString(androidManifest, versionNameRegexMani, "android:versionCode=\"" + parameters.toVersion + "\"");

                // Android gradle
                var androidGradlig = path.resolve(config.nativescriptDirectory, "app", "App_Resources", "Android", "app.gradle");
                console.log("changing version of " + androidGradlig);
                var versionCodeRegexGradlig = /versionCode ([0-9].*)/;
                var versionNameRegexGradlig = /versionName \"([a-zA-Z\.0-9].*)\"/;
                replaceString(androidGradlig, versionCodeRegexGradlig, "versionCode " + nextAndroidVersionCode);
                replaceString(androidGradlig, versionNameRegexGradlig, "versionName \"" + parameters.toVersion + "\"");
            }


        } else if (config.isSmallstackEnvironment()) {
            glob("**/package.json", {
                ignore: ["**/node_modules/**", "**/dist/**", "resources/projectfiles/meteor/**"]
            }, function (err, files) {
                _.each(files, function (file) {
                    var absolutePath = path.resolve(config.rootDirectory, file);
                    replaceVersionInPackageJson(absolutePath, parameters.toVersion);
                });
                exec("git commit -a -m \"changing version to " + parameters.toVersion + "\"");
                done();
            });
        } else if (config.isNPMPackageEnvironment()) {
            exec("npm version -f --git-tag-version=false " + parameters.toVersion);
            exec("git commit -a -m \"changing version to " + parameters.toVersion + "\"");
            done();
        } else throw new Error("Unsupported Environment!");
    } else {
        throw new Error("--toVersion parameter not given!");
    }

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
}
