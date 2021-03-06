"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const colors = require("colors");
const fs = require("fs-extra");
const gitState = require("git-state");
const path = require("path");
const plist = require("plist");
const semver = require("semver");
const SimpleGit = require("simple-git/promise");
const _ = require("underscore");
const Config_1 = require("../Config");
// tslint:disable-next-line:no-var-requires
const exec = require("../functions/exec");
class GitflowCommand {
    static getHelpSummary() {
        return "gitflow operations for smallstack projects, packages and modules";
    }
    static getParameters() {
        return {
            patch: "increments to next patch version",
            minor: "increments to next minor version",
            major: "increments to next major version",
            toVersion: "specify the version directly",
            release: "merges develop into master, can be combined with others, e.g.: 'smallstack gitflow --release --patch'"
        };
    }
    static execute(current, allCommands) {
        this.commandOption = current;
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            const forceMode = current.parameters && current.parameters.force === true;
            let doneSomething = false;
            const releaseIsFirst = current.parameters && _.keys(current.parameters).indexOf("release") === 0;
            const currentVersion = this.getCurrentVersion();
            let tagName = currentVersion;
            console.log("starting gitflow operations...");
            if (gitState.isGitSync(Config_1.Config.rootDirectory)) {
                const state = gitState.checkSync(Config_1.Config.rootDirectory);
                if (state.dirty !== 0 || state.untracked !== 0) {
                    if (!forceMode)
                        throw new Error("Uncommitted changes detected! Please commit your code before doing gitflow operations!");
                    else
                        console.error(colors.red("Warning: Uncommitted changes detected! Please commit your code before doing gitflow operations!"));
                }
            }
            else
                console.error("Warning: Your project is not under (git) version control!");
            if (current.parameters.release && releaseIsFirst) {
                doneSomething = true;
                yield this.doRelease(tagName);
            }
            if (!current.parameters.toVersion && current.parameters.patch) {
                const newVersion = semver.inc(currentVersion, "patch");
                console.log("Setting patch version " + newVersion);
                current.parameters.toVersion = newVersion;
            }
            if (!current.parameters.toVersion && current.parameters.minor) {
                const newVersion = semver.inc(currentVersion, "minor");
                console.log("Setting minor version " + newVersion);
                current.parameters.toVersion = newVersion;
            }
            if (!current.parameters.toVersion && current.parameters.major) {
                const newVersion = semver.inc(currentVersion, "major");
                console.log("Setting major version " + newVersion);
                current.parameters.toVersion = newVersion;
            }
            if (current.parameters.toVersion) {
                doneSomething = true;
                yield this.toVersion(current.parameters.toVersion);
                tagName = current.parameters.toVersion;
            }
            if (current.parameters.release && !releaseIsFirst) {
                doneSomething = true;
                yield this.doRelease(tagName);
            }
            if (!doneSomething) {
                throw new Error("No Operations were executed!");
            }
        }));
    }
    static doRelease(tagName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (gitState.isGitSync(Config_1.Config.rootDirectory)) {
                const state = gitState.checkSync(Config_1.Config.rootDirectory);
                if (state.dirty !== 0 || state.untracked !== 0)
                    throw new Error("Uncommitted changes are not allowed when doing a release!");
                const currentUserBranch = state.branch;
                const git = SimpleGit(Config_1.Config.rootDirectory);
                const summary = yield git.branchLocal();
                if (summary.branches.master === undefined)
                    throw new Error("No local master branch found!");
                if (summary.branches.develop === undefined && this.commandOption.parameters["no-gitflow"] === undefined)
                    throw new Error("No local develop branch found! If you're not using the Gitflow Flow, please pass --no-gitflow");
                const tagsResult = yield git.tags();
                if (tagsResult.all.indexOf(tagName) !== -1)
                    throw new Error("Tag '" + tagName + "' already exists!");
                yield git.checkout("master");
                console.log("checked out master...");
                if (this.commandOption.parameters["no-gitflow"] === undefined) {
                    yield git.mergeFromTo("develop", "master", ["-m Merge branch 'develop' into 'master'", "--log"]);
                    console.log("merged develop into master...");
                }
                yield git.addTag(tagName);
                console.log("created tag " + tagName);
                yield git.checkout(currentUserBranch);
                console.log("checked out user branch " + currentUserBranch);
            }
            else
                throw new Error("Your project must be under (git) version control for doing a release!");
        });
    }
    static getCurrentVersion() {
        if (Config_1.Config.isNPMPackageEnvironment() || Config_1.Config.isSmallstackEnvironment())
            return Config_1.Config.project.version;
        if (Config_1.Config.isFlutterEnvironment())
            return this.getFlutterVersion();
        // check if its a multi npm repository
        const directories = this.getDirectories(Config_1.Config.rootDirectory);
        for (const directory of directories) {
            const filePath = path.join(directory, "package.json");
            if (fs.existsSync(filePath)) {
                const packageJSON = require(filePath);
                if (packageJSON.version)
                    return packageJSON.version;
            }
        }
        throw new Error("Could not find version via Config.project.version or in a direct subdirectory!");
    }
    static getDirectories(root) {
        return fs.readdirSync(root).map((name) => path.join(root, name)).filter((source) => fs.lstatSync(source).isDirectory());
    }
    static getFlutterVersion() {
        const gradlePath = path.resolve(this.getFlutterAppDirectory(), "android", "app", "build.gradle");
        const versionNameRegex = /versionName \"([a-zA-Z\.0-9].*)\"/;
        const data = fs.readFileSync(gradlePath, "utf8");
        const result = versionNameRegex.exec(data);
        return result[1];
    }
    static toVersion(toVersion) {
        return new Promise((resolve, reject) => {
            if (Config_1.Config.isProjectEnvironment()) {
                // root package.json
                const rootPackageJsonPath = path.resolve(Config_1.Config.rootDirectory, "package.json");
                if (!fs.existsSync(rootPackageJsonPath))
                    throw new Error("No package.json found in project root!");
                this.replaceVersionInPackageJsonPath(Config_1.Config.rootDirectory, toVersion);
                // meteor app
                GitflowCommand.showVersionBanner("Meteor");
                const meteorPJP = path.resolve(Config_1.Config.meteorDirectory, "package.json");
                if (!fs.existsSync(meteorPJP))
                    throw new Error("No meteor package.json found!");
                this.replaceVersionInPackageJsonPath(Config_1.Config.meteorDirectory, toVersion);
                // frontend app
                if (Config_1.Config.projectHasFrontend()) {
                    GitflowCommand.showVersionBanner("Frontend");
                    const frontendPJP = path.resolve(Config_1.Config.frontendDirectory, "package.json");
                    if (!fs.existsSync(frontendPJP))
                        throw new Error("No frontend package.json found!");
                    this.replaceVersionInPackageJsonPath(Config_1.Config.meteorDirectory, toVersion);
                }
                // nativescript app
                let currentAndroidVersionCode;
                let nextAndroidVersionCode;
                if (Config_1.Config.projectHasNativescriptApp()) {
                    GitflowCommand.showVersionBanner("Nativescript");
                    // root package.json
                    const nativescriptRootPJP = path.resolve(Config_1.Config.nativescriptDirectory, "package.json");
                    if (!fs.existsSync(nativescriptRootPJP))
                        throw new Error("No nativescript root package.json found!");
                    this.replaceVersionInPackageJsonPath(Config_1.Config.nativescriptDirectory, toVersion);
                    // iOS
                    const nativescriptIOSPlistPath = path.resolve(Config_1.Config.nativescriptDirectory, "app", "App_Resources", "iOS", "Info.plist");
                    console.log("Change version of " + nativescriptIOSPlistPath);
                    if (!fs.existsSync(nativescriptIOSPlistPath))
                        throw new Error("No ios Info.plist file found!");
                    const parsedPlist = plist.parse(fs.readFileSync(nativescriptIOSPlistPath, "utf8"));
                    parsedPlist.CFBundleShortVersionString = toVersion;
                    parsedPlist.CFBundleVersion = toVersion;
                    fs.writeFileSync(nativescriptIOSPlistPath, plist.build(parsedPlist), {
                        encoding: "utf8"
                    });
                    // Android Manifest
                    const androidManifest = path.resolve(Config_1.Config.nativescriptDirectory, "app", "App_Resources", "Android", "AndroidManifest.xml");
                    console.log("Change version of " + androidManifest);
                    const versionCodeRegexMani = /android:versionCode=\"([0-9].*)\"/;
                    const versionNameRegexMani = /android:versionName=\"([a-zA-Z\.0-9].*)\"/;
                    currentAndroidVersionCode = parseInt(this.getRegex(androidManifest, versionCodeRegexMani));
                    nextAndroidVersionCode = currentAndroidVersionCode + 1;
                    console.log("  |-- Current Android Version Code : ", currentAndroidVersionCode);
                    console.log("  |-- Next Android Version Code    : ", nextAndroidVersionCode);
                    console.warn(colors.cyan("Hint: Please double-check the unique android version code, this tool just increments the current one!"));
                    this.replaceString(androidManifest, versionCodeRegexMani, "android:versionCode=\"" + nextAndroidVersionCode + "\"");
                    this.replaceString(androidManifest, versionNameRegexMani, "android:versionName=\"" + toVersion + "\"");
                    // Android gradle
                    const androidGradlig = path.resolve(Config_1.Config.nativescriptDirectory, "app", "App_Resources", "Android", "app.gradle");
                    console.log("Change version of " + androidGradlig);
                    const versionCodeRegexGradlig = /versionCode ([0-9].*)/;
                    const versionNameRegexGradlig = /versionName \"([a-zA-Z\.0-9].*)\"/;
                    this.replaceString(androidGradlig, versionCodeRegexGradlig, "versionCode " + nextAndroidVersionCode);
                    this.replaceString(androidGradlig, versionNameRegexGradlig, "versionName \"" + toVersion + "\"");
                }
                if (Config_1.Config.isFlutterEnvironment()) {
                    GitflowCommand.showVersionBanner("Flutter");
                    const iosPath = path.join(this.getFlutterAppDirectory(), "ios", "Runner", "Info.plist");
                    const androidPath = path.join(this.getFlutterAppDirectory(), "android", "app", "build.gradle");
                    if (!fs.existsSync(iosPath))
                        throw new Error("IOS File " + iosPath + " doesn't exist!");
                    if (!fs.existsSync(androidPath))
                        throw new Error("Android File " + androidPath + " doesn't exist!");
                    // iOS
                    console.log("Change version of " + iosPath);
                    const parsedPlist = plist.parse(fs.readFileSync(iosPath, "utf8"));
                    parsedPlist.CFBundleShortVersionString = toVersion;
                    parsedPlist.CFBundleVersion = toVersion;
                    fs.writeFileSync(iosPath, plist.build(parsedPlist), {
                        encoding: "utf8"
                    });
                    // Android gradle
                    console.log("Change version of " + androidPath);
                    const versionCodeRegexGradlig = /versionCode ([0-9].*)/;
                    const versionNameRegexGradlig = /versionName \"([a-zA-Z\.0-9].*)\"/;
                    if (currentAndroidVersionCode === undefined)
                        currentAndroidVersionCode = parseInt(this.getRegex(androidPath, versionCodeRegexGradlig));
                    if (nextAndroidVersionCode === undefined)
                        nextAndroidVersionCode = currentAndroidVersionCode + 1;
                    console.log("  |-- Current Android Version Code : ", currentAndroidVersionCode);
                    console.log("  |-- Next Android Version Code    : ", nextAndroidVersionCode);
                    this.replaceString(androidPath, versionCodeRegexGradlig, "versionCode " + nextAndroidVersionCode);
                    this.replaceString(androidPath, versionNameRegexGradlig, "versionName \"" + toVersion + "\"");
                    // do the commit
                    exec("git commit -a -m \"Change version to " + toVersion + "\"");
                    resolve();
                }
                // do the commit
                exec("git commit -a -m \"Change version to " + toVersion + "\"");
                resolve();
            }
            else if (Config_1.Config.isNPMPackageEnvironment()) {
                exec("npm version " + toVersion + " --git-tag-version=false --allow-same-version");
                // check if its an angular workspace with libraries
                const libPackageJSONPath = path.join(Config_1.Config.rootDirectory, "projects", "library");
                if (fs.existsSync(path.join(libPackageJSONPath, "package.json"))) {
                    this.replaceVersionInPackageJsonPath(libPackageJSONPath, toVersion);
                }
                exec("git commit -a -m \"Change version to " + toVersion + "\"");
                resolve();
            }
            else if (Config_1.Config.isMultiNPMPackageEnvironment()) {
                const rootDirectories = this.getDirectories(Config_1.Config.rootDirectory);
                for (const directory of rootDirectories) {
                    const packageJSONFilePath = path.resolve(directory, "package.json");
                    if (fs.existsSync(packageJSONFilePath))
                        this.replaceVersionInPackageJsonPath(directory, toVersion);
                }
                exec("git commit -a -m \"Change version to " + toVersion + "\"");
                resolve();
            }
            else
                throw new Error("Unsupported Environment!");
        });
    }
    static replaceString(file, regex, replacement) {
        const data = fs.readFileSync(file, "utf8");
        const result = data.replace(regex, replacement);
        fs.writeFileSync(file, result, "utf8");
    }
    static getRegex(file, regex) {
        const data = fs.readFileSync(file, "utf8");
        return regex.exec(data)[1];
    }
    static replaceVersionInPackageJsonPath(packageJsonDirectory, newVersion) {
        console.log("Change version in " + packageJsonDirectory + "/package.json to " + newVersion);
        exec("npm version " + newVersion + " --git-tag-version=false --allow-same-version", {
            cwd: packageJsonDirectory
        });
    }
    static getFlutterAppDirectory() {
        let flutterPath = path.join(Config_1.Config.getRootDirectory(), "flutter_app");
        if (fs.existsSync(flutterPath))
            return flutterPath;
        flutterPath = path.join(Config_1.Config.getRootDirectory(), "app");
        if (fs.existsSync(flutterPath))
            return flutterPath;
        throw new Error("Neither /app nor /flutter_app directory was found!");
    }
    static showVersionBanner(title) {
        console.log("#### " + title);
    }
}
exports.GitflowCommand = GitflowCommand;
