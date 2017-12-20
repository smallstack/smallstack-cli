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
const glob = require("glob");
const path = require("path");
const plist = require("plist");
const semver = require("semver");
const SimpleGit = require("simple-git");
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
            toVersion: "specify the version directly"
        };
    }
    static execute(current, allCommands) {
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
        return new Promise((resolve, reject) => {
            if (gitState.isGitSync(Config_1.Config.rootDirectory)) {
                const state = gitState.checkSync(Config_1.Config.rootDirectory);
                if (state.dirty !== 0 || state.untracked !== 0)
                    throw new Error("Uncommitted changes are not allowed when doing a release!");
                const currentUserBranch = state.branch;
                const git = SimpleGit(Config_1.Config.rootDirectory);
                git.branchLocal((error, summary) => {
                    if (summary.branches.master === undefined)
                        reject("No local master branch found!");
                    else if (summary.branches.develop === undefined)
                        reject("No local develop branch found!");
                })
                    .tags((error, tags) => {
                    if (tags.all.indexOf(tagName) !== -1)
                        throw new Error("Tag '" + tagName + "' already exists!");
                })
                    .checkout("master", () => { console.log("checked out master..."); })
                    .mergeFromTo("develop", "master", ["-m Merge branch 'develop' into 'master'", "--log"], () => { console.log("merged develop into master..."); })
                    .addTag(tagName, () => { console.log("created tag " + tagName); })
                    .checkout(currentUserBranch, () => {
                    console.log("checked out user branch " + currentUserBranch);
                    resolve();
                });
            }
            else
                throw new Error("Your project must be under (git) version control for doing a release!");
        });
    }
    static getCurrentVersion() {
        if (Config_1.Config.isNPMPackageEnvironment())
            return Config_1.Config.project.version;
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
    static toVersion(toVersion) {
        return new Promise((resolve, reject) => {
            if (Config_1.Config.isProjectEnvironment()) {
                // root package.json
                const rootPackageJsonPath = path.resolve(Config_1.Config.rootDirectory, "package.json");
                if (!fs.existsSync(rootPackageJsonPath))
                    throw new Error("No package.json found in project root!");
                this.replaceVersionInPackageJson(rootPackageJsonPath, toVersion);
                // meteor app
                const meteorPJP = path.resolve(Config_1.Config.meteorDirectory, "package.json");
                if (!fs.existsSync(meteorPJP))
                    throw new Error("No meteor package.json found!");
                this.replaceVersionInPackageJson(meteorPJP, toVersion);
                // frontend app
                if (Config_1.Config.projectHasFrontend()) {
                    const frontendPJP = path.resolve(Config_1.Config.frontendDirectory, "package.json");
                    if (!fs.existsSync(frontendPJP))
                        throw new Error("No frontend package.json found!");
                    this.replaceVersionInPackageJson(frontendPJP, toVersion);
                }
                // nativescript app
                if (Config_1.Config.projectHasNativescriptApp()) {
                    // root package.json
                    const nativescriptRootPJP = path.resolve(Config_1.Config.nativescriptDirectory, "package.json");
                    if (!fs.existsSync(nativescriptRootPJP))
                        throw new Error("No nativescript root package.json found!");
                    this.replaceVersionInPackageJson(nativescriptRootPJP, toVersion);
                    // iOS
                    const nativescriptIOSPlistPath = path.resolve(Config_1.Config.nativescriptDirectory, "app", "App_Resources", "iOS", "Info.plist");
                    console.log("changing version of " + nativescriptIOSPlistPath);
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
                    console.log("changing version of " + androidManifest);
                    const versionCodeRegexMani = /android:versionCode=\"([0-9].*)\"/;
                    const versionNameRegexMani = /android:versionName=\"([a-zA-Z\.0-9].*)\"/;
                    const currentVersionCode = parseInt(this.getRegex(androidManifest, versionCodeRegexMani));
                    const nextAndroidVersionCode = currentVersionCode + 1;
                    console.log("Current Android Version Code : ", currentVersionCode);
                    console.log("Next Android Version Code    : ", nextAndroidVersionCode);
                    console.warn(colors.cyan("Hint: Please double-check the unique android version code, this tool just increments the current one!"));
                    this.replaceString(androidManifest, versionCodeRegexMani, "android:versionCode=\"" + nextAndroidVersionCode + "\"");
                    this.replaceString(androidManifest, versionNameRegexMani, "android:versionName=\"" + toVersion + "\"");
                    // Android gradle
                    const androidGradlig = path.resolve(Config_1.Config.nativescriptDirectory, "app", "App_Resources", "Android", "app.gradle");
                    console.log("changing version of " + androidGradlig);
                    const versionCodeRegexGradlig = /versionCode ([0-9].*)/;
                    const versionNameRegexGradlig = /versionName \"([a-zA-Z\.0-9].*)\"/;
                    this.replaceString(androidGradlig, versionCodeRegexGradlig, "versionCode " + nextAndroidVersionCode);
                    this.replaceString(androidGradlig, versionNameRegexGradlig, "versionName \"" + toVersion + "\"");
                }
                // do the commit
                exec("git commit -a -m \"changing version to " + toVersion + "\"");
                resolve();
            }
            else if (Config_1.Config.isSmallstackEnvironment()) {
                glob("**/package.json", {
                    ignore: ["**/node_modules/**", "**/dist/**", "resources/projectfiles/meteor/**"]
                }, (err, files) => {
                    _.each(files, (file) => {
                        const absolutePath = path.resolve(Config_1.Config.rootDirectory, file);
                        this.replaceVersionInPackageJson(absolutePath, toVersion);
                    });
                    exec("git commit -a -m \"changing version to " + toVersion + "\"");
                    resolve();
                });
            }
            else if (Config_1.Config.isNPMPackageEnvironment()) {
                this.replaceVersionInPackageJson(path.resolve(Config_1.Config.rootDirectory, "package.json"), toVersion);
                const subPackageJson = path.resolve(Config_1.Config.rootDirectory, "src", "package.json");
                if (fs.existsSync(subPackageJson))
                    this.replaceVersionInPackageJson(subPackageJson, toVersion);
                exec("git commit -a -m \"changing version to " + toVersion + "\"");
                resolve();
            }
            else if (Config_1.Config.isMultiNPMPackageEnvironment()) {
                const rootDirectories = this.getDirectories(Config_1.Config.rootDirectory);
                for (const directory of rootDirectories) {
                    const packageJSONFilePath = path.resolve(directory, "package.json");
                    if (fs.existsSync(packageJSONFilePath))
                        this.replaceVersionInPackageJson(packageJSONFilePath, toVersion);
                }
                exec("git commit -a -m \"changing version to " + toVersion + "\"");
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
    static replaceVersionInPackageJson(file, newVersion) {
        const jsonContent = require(file);
        console.log("changing version of '" + jsonContent.name + "' from " + jsonContent.version + " to " + newVersion);
        jsonContent.version = newVersion;
        fs.writeJSONSync(file, jsonContent);
    }
}
exports.GitflowCommand = GitflowCommand;
