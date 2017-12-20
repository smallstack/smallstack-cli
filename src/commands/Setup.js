"use strict";
// tslint:disable:no-var-requires
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const AWS = require("aws-sdk");
const colors = require("colors");
const decompress = require("decompress");
const decompressTargz = require("decompress-targz");
const DecompressZip = require("decompress-zip");
const fs = require("fs-extra");
const glob = require("glob");
const inquirer = require("inquirer");
const path = require("path");
const request = require("request");
const _ = require("underscore");
const Config_1 = require("../Config");
const execNPM = require("../functions/execNPM");
class Setup {
    static getHelpSummary() {
        return "Does all kind of linking between modules or project dependencies.";
    }
    static getParameters() {
        return {
            npm5: "if set, 'smallstack setup' will use different linking of packages based on NPM 5 standard",
            mode: "setup mode which can be one of local, file, url, projectVersion",
            path: "smallstack modules path",
            url: "smallstack file url",
            filePath: "smallstack file path",
            offline: "ignore 'npm install' calls"
        };
    }
    static execute(current, allCommands) {
        return __awaiter(this, void 0, void 0, function* () {
            if (Config_1.Config.isSmallstackEnvironment()) {
                yield this.createSmallstackLinkableDistFolder();
                yield this.npmInstallModules(Config_1.Config.rootDirectory, true);
                // } else if (Config.isComponentEnvironment() || Config.isNativescriptEnvironment()) {
                //     this.setupNPMProject(current);
            }
            else if (Config_1.Config.isProjectEnvironment()) {
                fs.emptyDirSync(Config_1.Config.smallstackDirectory);
                yield this.setupSmallstackProject(current);
            }
            else
                throw new Error("Unknown Environment for 'smallstack setup', sorry!");
            return Promise.resolve();
        });
    }
    static setupSmallstackProject(current) {
        return __awaiter(this, void 0, void 0, function* () {
            const answers = yield this.askPackageModeQuestions(current);
            console.log("cleaning local smallstack path : " + Config_1.Config.smallstackDirectory);
            fs.emptyDirSync(Config_1.Config.smallstackDirectory);
            switch (answers.smallstackMode) {
                case "projectVersion":
                    return this.handleProjectVersion();
                case "local":
                    return this.handleDistFolder(path.join(answers.smallstackPath, "dist"));
                case "file":
                    return this.handleLocalFile(answers.smallstackFilePath);
                case "url":
                    return this.handleRemoteFile(answers.smallstackUrl);
                case "npm":
                    return this.linkStuffWhenNPMVersionsAreBeingUsed();
                default:
                    throw new Error(answers.smallstackMode + " is an unknown way of getting smallstack packages!");
            }
        });
    }
    static handleProjectVersion() {
        return __awaiter(this, void 0, void 0, function* () {
            const localFilePath = yield this.downloadVersion(Config_1.Config.project.smallstack.version);
            return this.handleLocalFile(localFilePath);
        });
    }
    static handleRemoteFile(url) {
        return __awaiter(this, void 0, void 0, function* () {
            const localFilePath = yield this.downloadFile(url);
            return this.handleLocalFile(localFilePath);
        });
    }
    static handleLocalFile(localFilePath) {
        return __awaiter(this, void 0, void 0, function* () {
            fs.emptyDirSync(Config_1.Config.smallstackDirectory);
            yield this.unzipSmallstackFile(localFilePath, Config_1.Config.smallstackDirectory);
            return this.handleDistFolder(Config_1.Config.smallstackDirectory);
        });
    }
    static handleDistFolder(distFolder) {
        // check this folder
        if (!fs.existsSync(distFolder))
            throw new Error("Dist Folder does not exist : " + distFolder);
        if (!fs.existsSync(path.join(distFolder, "modules", "core-common")))
            throw new Error("Dist Folder exists, but core-common not : " + distFolder);
        return this.linkDistFolderToProject(distFolder);
    }
    static createSmallstackLinkableDistFolder() {
        const distPath = path.join(Config_1.Config.rootDirectory, "dist");
        fs.ensureDirSync(distPath);
        _.each(Config_1.Config.getModuleNames(), (moduleName) => {
            fs.ensureDirSync(path.join(distPath, "modules", moduleName));
            const from = path.join(Config_1.Config.rootDirectory, "modules", moduleName);
            const to = path.join(distPath, "modules", moduleName);
            console.log("Linking from " + from + " to " + to);
            console.log("Creating directory : " + path.join(from, "dist"));
            fs.ensureDirSync(path.join(from, "dist"));
            fs.ensureSymlinkSync(path.join(from, "dist"), path.join(to, "dist"), "dir");
            fs.ensureSymlinkSync(path.join(from, "package.json"), path.join(to, "package.json"));
        });
    }
    // private static setupNPMProject(commandOptions: CLICommandOption): Promise<void> {
    //     return new Promise(async (resolve, reject) => {
    //         const answers: PackageModeAnswers = await this.askPackageModeQuestions(commandOptions);
    //         switch (answers.smallstackMode) {
    //             case "local":
    //                 this.persistNPMConfiguration(answers.smallstackPath, true);
    //                 resolve();
    //                 break;
    //             case "projectVersion":
    //                 this.downloadAndExtractVersion(Config.project.smallstack.version, Config.smallstackDirectory, function () {
    //                     this.persistNPMConfiguration(Config.smallstackDirectory);
    //                     resolve();
    //                 });
    //                 break;
    //             case "file":
    //                 fs.emptyDirSync(Config.smallstackDirectory);
    //                 this.unzipSmallstackFile(path.join(Config.rootDirectory, answers.smallstackFilePath), Config.smallstackDirectory, function () {
    //                     this.persistNPMConfiguration(Config.smallstackDirectory);
    //                 });
    //                 break;
    //             case "url":
    //                 fs.emptyDirSync(Config.smallstackDirectory);
    //                 this.downloadAndExtract(answers.smallstackUrl, Config.smallstackDirectory, function () {
    //                     this.persistNPMConfiguration(Config.smallstackDirectory);
    //                     resolve();
    //                 });
    //                 break;
    //             default:
    //                 throw new Error(answers.smallstackMode + " is an unknown way of getting smallstack packages!");
    //         }
    //     });
    // }
    // private static persistNPMConfiguration(smallstackPath: string, addDistBundlePath: boolean) {
    //     if (smallstackPath === undefined)
    //         throw Error("No smallstack.path is given!");
    //     let additionalPath = "";
    //     if (addDistBundlePath === true)
    //         additionalPath = "dist/bundle";
    //     // search for smallstack dependencies in package.json
    //     const packagePath = path.join(Config.rootDirectory, "package.json");
    //     const packageContent = require(packagePath);
    //     const requiredModules = [];
    //     _.each(packageContent.dependencies, (value: string, key: string) => {
    //         if (key.indexOf("@smallstack/") === 0)
    //             requiredModules.push(key.replace("@smallstack/", ""));
    //     });
    //     if (requiredModules.length === 0)
    //         throw new Error("No smallstack dependencies defined in package.json file. This might be intended?");
    //     _.each(requiredModules, (value) => {
    //         this.createSymlink(path.resolve(Config.rootDirectory, smallstackPath, "modules", value, additionalPath), path.resolve(Config.rootDirectory, "node_modules", "@smallstack", value));
    //     });
    // }
    static askPackageModeQuestions(commandOption) {
        return new Promise((resolve) => {
            // properties
            let smallstackMode = commandOption.parameters.mode;
            let smallstackPath = commandOption.parameters.path;
            let smallstackUrl = commandOption.parameters.url;
            let smallstackFilePath = commandOption.parameters.filePath;
            const packageModes = [{
                    name: "use NPM versions declared in package.json files (just link datalayer etc.)",
                    value: "npm"
                }, {
                    name: "local checkout",
                    value: "local"
                }, {
                    name: "local file",
                    value: "file"
                }, {
                    name: "remote file (URL)",
                    value: "url"
                }];
            if (!Config_1.Config.project.smallstack || !Config_1.Config.project.smallstack.version)
                console.error(colors.red("No smallstack.version defined in project's package.json!\n"));
            else
                packageModes.unshift({
                    name: "use project version (" + Config_1.Config.project.smallstack.version + ")",
                    value: "projectVersion"
                });
            const questions = [{
                    name: "smallstack.mode",
                    type: "list",
                    message: "Which version shall be used? ",
                    choices: packageModes,
                    when: () => {
                        return !smallstackMode;
                    }
                },
                {
                    name: "smallstack.path",
                    type: "input",
                    message: "relative path from project root to local smallstack directory :",
                    default: "../smallstack",
                    when: (answers) => {
                        return !smallstackMode && answers.smallstack.mode === "local" && smallstackPath === undefined;
                    }
                },
                {
                    name: "smallstack.filepath",
                    type: "input",
                    message: "relative path from project root to local file location :",
                    default: "../smallstack/dist/smallstack.zip",
                    when: (answers) => {
                        return !smallstackMode && answers.smallstack.mode === "file";
                    }
                },
                {
                    name: "smallstack.url",
                    type: "input",
                    message: "please enter the url where to download smallstack from :",
                    when: (answers) => {
                        return !smallstackMode && answers.smallstack.mode === "url" && smallstackUrl === undefined;
                    }
                }];
            inquirer.prompt(questions).then((answers) => {
                if (!answers.smallstack)
                    answers.smallstack = {};
                smallstackMode = answers.smallstack.mode || smallstackMode;
                smallstackUrl = answers.smallstack.url || smallstackUrl;
                smallstackPath = answers.smallstack.path || smallstackPath;
                smallstackFilePath = answers.smallstack.filepath || smallstackFilePath;
                resolve({
                    smallstackMode,
                    smallstackUrl,
                    smallstackPath,
                    smallstackFilePath
                });
            }, (error) => {
                console.error(error);
                throw error;
            });
        });
    }
    static linkStuffWhenNPMVersionsAreBeingUsed() {
        console.log("Nothing to do so far...");
    }
    static createSymlink(from, to) {
        if (!fs.existsSync(from))
            throw new Error("'from' does not exist, can't create symlink. from is set to " + from);
        if (from.indexOf("node_modules") !== -1)
            throw new Error(from + " => You should not link into node_modules anymore, since the CLI now uses native npm5 link!");
        if (to.indexOf("node_modules") !== -1)
            throw new Error(to + " => You should not link into node_modules anymore, since the CLI now uses native npm5 link!");
        try {
            const relativePath = path.relative(to, from).replace(/\\/g, "/");
            console.log("=================== creating symlink: ");
            console.log("     from: " + from);
            console.log("       to: " + to);
            console.log(" relative: " + relativePath);
            execNPM("npm link " + relativePath, {
                cwd: to
            });
        }
        catch (e) {
            throw new Error(e.message + ", src:" + to + ", dst:" + from);
        }
    }
    static npmInstallModules(rootPath, alsoDevPackages = true) {
        let npmCommand = "npm install --unsafe-perm";
        if (alsoDevPackages !== true)
            npmCommand += " --production";
        _.each(Config_1.Config.getModuleNames(), (moduleName) => {
            execNPM(npmCommand, {
                cwd: path.resolve(rootPath, "modules", moduleName)
            });
        });
    }
    static linkDistFolderToProject(smallstackPath) {
        if (smallstackPath === undefined)
            throw Error("No smallstack.path is given!");
        const absoluteModuleCoreClientPath = path.resolve(Config_1.Config.rootDirectory, smallstackPath, "modules", "core-client");
        const absoluteModuleCoreServerPath = path.resolve(Config_1.Config.rootDirectory, smallstackPath, "modules", "core-server");
        const absoluteModuleCoreCommonPath = path.resolve(Config_1.Config.rootDirectory, smallstackPath, "modules", "core-common");
        const absoluteModuleMeteorClientPath = path.resolve(Config_1.Config.rootDirectory, smallstackPath, "modules", "meteor-client");
        const absoluteModuleMeteorServerPath = path.resolve(Config_1.Config.rootDirectory, smallstackPath, "modules", "meteor-server");
        const absoluteModuleMeteorCommonPath = path.resolve(Config_1.Config.rootDirectory, smallstackPath, "modules", "meteor-common");
        // const absoluteResourcesPath = path.resolve(Config.rootDirectory, smallstackPath, "resources");
        // const absoluteSmallstackDistPath = path.resolve(Config.rootDirectory, smallstackPath, "dist");
        // figure out if datalayer is a new type datalayer or not
        let absoluteDatalayerPath = path.resolve(Config_1.Config.datalayerPath, "dist", "bundles");
        if (Config_1.Config.projectHasDatalayerNG())
            absoluteDatalayerPath = path.resolve(Config_1.Config.datalayerPath);
        // meteor linking
        this.createSymlink(absoluteModuleCoreClientPath, Config_1.Config.meteorDirectory);
        this.createSymlink(absoluteModuleCoreServerPath, Config_1.Config.meteorDirectory);
        this.createSymlink(absoluteModuleCoreCommonPath, Config_1.Config.meteorDirectory);
        this.createSymlink(absoluteModuleMeteorClientPath, Config_1.Config.meteorDirectory);
        this.createSymlink(absoluteModuleMeteorServerPath, Config_1.Config.meteorDirectory);
        this.createSymlink(absoluteModuleMeteorCommonPath, Config_1.Config.meteorDirectory);
        this.createSymlink(absoluteDatalayerPath, Config_1.Config.meteorDirectory);
        // datalayer
        this.createSymlink(absoluteModuleCoreCommonPath, Config_1.Config.datalayerSmallstackCoreCommonDirectory);
        // resources
        // if (linkResources) {
        //     this.createSymlink(absoluteResourcesPath, Config.cliResourcesPath);
        //     // this.createSymlink(absoluteSmallstackDistPath, Config.smallstackDistDirectory);
        // }
        // nativescript module
        // this.createSymlink(absoluteSmallstackCoreClientPath, path.resolve(Config.rootDirectory, smallstackPath, "modules", "nativescript", "node_modules", "@smallstack", "core-client"));
        // this.createSymlink(absoluteModuleCoreCommonPath, path.resolve(Config.rootDirectory, smallstackPath, "modules", "nativescript", "node_modules", "@smallstack", "core-common"));
        // this.createSymlink(absoluteModuleNativescriptPath, path.resolve(Config.rootDirectory, smallstackPath, "modules", "nativescript", "node_modules", "@smallstack", "nativescript"));
        // // meteor module
        // this.createSymlink(absoluteSmallstackCorePath, path.resolve(Config.rootDirectory, smallstackPath, "modules", "meteor-node_modules", "@smallstack", "core"));
        if (Config_1.Config.nativescriptDirectory) {
            this.createSymlink(absoluteModuleCoreClientPath, Config_1.Config.nativescriptSmallstackCoreClientDirectory);
            this.createSymlink(absoluteModuleCoreCommonPath, Config_1.Config.nativescriptSmallstackCoreCommonDirectory);
            this.createSymlink(absoluteDatalayerPath, Config_1.Config.nativescriptDatalayerDirectory);
        }
        if (Config_1.Config.projectHasFrontend()) {
            this.createSymlink(absoluteDatalayerPath, Config_1.Config.frontendSmallstackDatalayerDirectory);
        }
        return Promise.resolve();
    }
    static downloadVersion(version) {
        return new Promise((resolve, reject) => {
            AWS.config.region = "eu-central-1";
            const targetFileName = path.join(Config_1.Config.tmpDirectory, "smallstack.zip");
            fs.ensureDirSync(Config_1.Config.tmpDirectory);
            if (fs.existsSync(targetFileName))
                fs.removeSync(targetFileName);
            const s3 = new AWS.S3();
            const params = { Bucket: "smallstack-releases", Key: "smallstack-" + version + ".zip" };
            const file = require("fs").createWriteStream(targetFileName);
            const stream = s3.getObject(params).createReadStream();
            stream.pipe(file);
            console.log("downloading S3 File from 'smallstack-releases/smallstack-" + version + ".zip' to '" + targetFileName + "'");
            let hadError = false;
            file.on("error", (err) => {
                hadError = true;
                console.error(err);
                reject(err);
                throw err;
            });
            file.on("finish", () => {
                console.log("Done!");
                if (!hadError) {
                    resolve(targetFileName);
                }
            });
        });
    }
    static downloadFile(url) {
        return new Promise((resolve) => {
            fs.ensureDirSync(Config_1.Config.tmpDirectory);
            const targetFileName = path.join(Config_1.Config.tmpDirectory, "smallstack.zip");
            if (fs.existsSync(targetFileName))
                fs.removeSync(targetFileName);
            console.log("downloading '" + url + "' to '" + targetFileName + "'");
            request({
                method: "GET",
                url
            }, (error, response, body) => {
                resolve(targetFileName);
            }).pipe(fs.createWriteStream(targetFileName));
        });
    }
    static unzipSmallstackFile(file, destination) {
        return new Promise((resolve) => {
            const unzipper = new DecompressZip(file);
            unzipper.on("error", (err) => {
                console.log("Caught an error", err);
                throw err;
            });
            unzipper.on("extract", (log) => __awaiter(this, void 0, void 0, function* () {
                console.log("Finished extracting");
                const archives = glob.sync(destination + "/*.tgz", { absolute: true });
                for (const archive of archives) {
                    const archiveName = path.basename(archive, ".tgz");
                    console.log("Extracting archive : " + archiveName);
                    yield decompress(archive, path.join(destination, "modules", archiveName), {
                        plugins: [
                            decompressTargz()
                        ],
                        strip: 1
                    });
                    console.log("    ... done!");
                }
                resolve();
            }));
            unzipper.on("progress", (fileIndex, fileCount) => {
                console.log("Extracted file " + (fileIndex + 1) + " of " + fileCount);
            });
            unzipper.extract({
                path: destination,
                filter(currentFile) {
                    return currentFile.type !== "SymbolicLink";
                }
            });
        });
    }
}
exports.Setup = Setup;
