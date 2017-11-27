// tslint:disable:no-var-requires

import * as AWS from "aws-sdk";
import * as colors from "colors";
import * as DecompressZip from "decompress-zip";


import * as decompress from "decompress";
import * as  decompressTargz from "decompress-targz";
import * as fs from "fs-extra";
import * as glob from "glob";
import * as inquirer from "inquirer";
import * as path from "path";
import * as request from "request";
import * as semver from "semver";
import * as sortPackageJson from "sort-package-json";
import * as _ from "underscore";
import { Config } from "../Config";
import { CLICommandOption } from "./CLICommand";

const SmallstackApi = require("../functions/smallstackApi");
const execNPM = require("../functions/execNPM");

interface PackageModeAnswers {
    smallstackMode?: string;
    smallstackUrl?: string;
    smallstackPath?: string;
    smallstackFilePath?: string;
}


export class Setup {

    public static getHelpSummary(): string {
        return "Does all kind of linking between modules or project dependencies.";
    }

    public static getParameters(): { [parameterKey: string]: string } {
        return {
            npm5: "if set, 'smallstack setup' will use different linking of packages based on NPM 5 standard",
            mode: "setup mode which can be one of local, file, url, projectVersion",
            path: "smallstack modules path",
            url: "smallstack file url",
            filePath: "smallstack file path",
            offline: "ignore 'npm install' calls"
        };
    }

    public static async execute(current: CLICommandOption, allCommands: CLICommandOption[]): Promise<any> {
        if (Config.isSmallstackEnvironment()) {
            await this.linkSmallstackModules();
            if (current.parameters.linkOnly !== true)
                await this.npmInstallModules(Config.rootDirectory, true);
        } else if (Config.isComponentEnvironment() || Config.isNativescriptEnvironment()) {
            this.setupNPMProject(current);
        } else if (Config.isProjectEnvironment()) {
            await this.setupSmallstackProject(current);
        } else throw new Error("Unknown Environment for 'smallstack setup', sorry!");
        return Promise.resolve();
    }


    private static setupSmallstackProject(current: CLICommandOption): Promise<void> {
        return new Promise<void>(async (resolve) => {
            const answers: PackageModeAnswers = await this.askPackageModeQuestions(current);
            console.log("cleaning local smallstack path : " + Config.smallstackDirectory);
            fs.emptyDirSync(Config.smallstackDirectory);
            switch (answers.smallstackMode) {
                case "local":
                    this.persistLocalConfiguration(answers.smallstackPath, true);
                    resolve();
                    break;
                case "projectVersion":
                    this.downloadAndExtractVersion(current, Config.project.smallstack.version, Config.smallstackDirectory, () => {
                        this.persistLocalConfiguration(Config.smallstackDirectory);
                        resolve();
                    });
                    break;
                case "file":
                    fs.emptyDirSync(Config.smallstackDirectory);
                    this.unzipSmallstackFile(path.join(Config.rootDirectory, answers.smallstackFilePath), Config.smallstackDirectory, () => {
                        this.persistTGZConfiguration(Config.smallstackDirectory);
                        resolve();
                    });
                    break;
                case "url":
                    fs.emptyDirSync(Config.smallstackDirectory);
                    this.downloadAndExtract(answers.smallstackUrl, Config.smallstackDirectory, () => {
                        this.persistLocalConfiguration(Config.smallstackDirectory);
                        resolve();
                    });
                    break;
                default:
                    throw new Error(answers.smallstackMode + " is an unknown way of getting smallstack packages!");
            }
        });
    }



    private static setupNPMProject(commandOptions: CLICommandOption): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const answers: PackageModeAnswers = await this.askPackageModeQuestions(commandOptions);
            switch (answers.smallstackMode) {
                case "local":
                    this.persistNPMConfiguration(answers.smallstackPath, true);
                    resolve();
                    break;
                case "projectVersion":
                    this.downloadAndExtractVersion(commandOptions, Config.project.smallstack.version, Config.smallstackDirectory, function () {
                        this.persistNPMConfiguration(Config.smallstackDirectory);
                        resolve();
                    });
                    break;
                case "file":
                    fs.emptyDirSync(Config.smallstackDirectory);
                    this.unzipSmallstackFile(path.join(Config.rootDirectory, answers.smallstackFilePath), Config.smallstackDirectory, function () {
                        this.persistNPMConfiguration(Config.smallstackDirectory);
                    });
                    break;
                case "url":
                    fs.emptyDirSync(Config.smallstackDirectory);
                    this.downloadAndExtract(answers.smallstackUrl, Config.smallstackDirectory, function () {
                        this.persistNPMConfiguration(Config.smallstackDirectory);
                        resolve();
                    });
                    break;
                default:
                    throw new Error(answers.smallstackMode + " is an unknown way of getting smallstack packages!");
            }
        });
    }

    private static persistNPMConfiguration(smallstackPath: string, addDistBundlePath: boolean) {
        if (smallstackPath === undefined)
            throw Error("No smallstack.path is given!");
        let additionalPath = "";
        if (addDistBundlePath === true)
            additionalPath = "dist/bundle";

        // search for smallstack dependencies in package.json
        const packagePath = path.join(Config.rootDirectory, "package.json");
        const packageContent = require(packagePath);
        const requiredModules = [];
        _.each(packageContent.dependencies, (value: string, key: string) => {
            if (key.indexOf("@smallstack/") === 0)
                requiredModules.push(key.replace("@smallstack/", ""));
        });

        if (requiredModules.length === 0)
            throw new Error("No smallstack dependencies defined in package.json file. This might be intended?");

        _.each(requiredModules, (value) => {
            this.createSymlink(path.resolve(Config.rootDirectory, smallstackPath, "modules", value, additionalPath), path.resolve(Config.rootDirectory, "node_modules", "@smallstack", value));
        });
    }


    private static askPackageModeQuestions(commandOption: CLICommandOption): Promise<PackageModeAnswers> {
        return new Promise<PackageModeAnswers>((resolve) => {
            // properties
            let smallstackMode = commandOption.parameters.mode;
            let smallstackPath = commandOption.parameters.path;
            let smallstackUrl = commandOption.parameters.url;
            let smallstackFilePath = commandOption.parameters.filePath;

            const packageModes = [{
                name: "local checkout",
                value: "local"
            }, {
                name: "local file",
                value: "file"
            }, {
                name: "remote file (URL)",
                value: "url"
            }];
            if (!Config.project.smallstack || !Config.project.smallstack.version)
                console.error(colors.red("No smallstack.version defined in project's package.json!\n"));
            else
                packageModes.unshift({
                    name: "use project version (" + Config.project.smallstack.version + ")",
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



    private static createSymlink(from: string, to: string) {

        if (!fs.existsSync(from))
            throw new Error("'from' does not exist, can't create symlink. from is set to " + from);

        try {
            const relativePath: string = path.relative(to, from).replace("\\", "/");
            console.log("creating symlink: ");
            console.log("     from: " + from);
            console.log("       to: " + to);
            console.log(" relative: " + relativePath);
            execNPM("npm link " + relativePath, {
                cwd: to
            });
        } catch (e) {
            throw new Error(e.message + ", src:" + to + ", dst:" + from);
        }
    }

    private static npmInstallModules(rootPath, alsoDevPackages) {
        let npmCommand = "npm install";
        if (alsoDevPackages !== true)
            npmCommand += " --production";

        execNPM(npmCommand, {
            cwd: path.resolve(rootPath, "modules", "core-common")
        });
        execNPM(npmCommand, {
            cwd: path.resolve(rootPath, "modules", "core-client")
        });
        execNPM(npmCommand, {
            cwd: path.resolve(rootPath, "modules", "core-server")
        });
        execNPM(npmCommand, {
            cwd: path.resolve(rootPath, "modules", "meteor-common")
        });
        execNPM(npmCommand, {
            cwd: path.resolve(rootPath, "modules", "meteor-client")
        });
        execNPM(npmCommand, {
            cwd: path.resolve(rootPath, "modules", "meteor-server")
        });
        execNPM(npmCommand, {
            cwd: path.resolve(rootPath, "modules", "nativescript")
        });
    }


    private static linkSmallstackModules() {

        // core-client
        this.createSymlink(path.resolve(Config.rootDirectory, "modules", "core-common"), path.resolve(Config.rootDirectory, "modules", "core-client"));

        // core-server
        this.createSymlink(path.resolve(Config.rootDirectory, "modules", "core-common"), path.resolve(Config.rootDirectory, "modules", "core-server"));

        // meteor-common
        this.createSymlink(path.resolve(Config.rootDirectory, "modules", "core-common"), path.resolve(Config.rootDirectory, "modules", "meteor-common"));

        // meteor-client
        this.createSymlink(path.resolve(Config.rootDirectory, "modules", "core-common"), path.resolve(Config.rootDirectory, "modules", "meteor-client"));
        this.createSymlink(path.resolve(Config.rootDirectory, "modules", "core-client"), path.resolve(Config.rootDirectory, "modules", "meteor-client"));

        // meteor-server
        this.createSymlink(path.resolve(Config.rootDirectory, "modules", "core-common"), path.resolve(Config.rootDirectory, "modules", "meteor-server"));
        this.createSymlink(path.resolve(Config.rootDirectory, "modules", "core-server"), path.resolve(Config.rootDirectory, "modules", "meteor-server"));

        // nativescript
        this.createSymlink(path.resolve(Config.rootDirectory, "modules", "core-common"), path.resolve(Config.rootDirectory, "modules", "nativescript"));
        this.createSymlink(path.resolve(Config.rootDirectory, "modules", "core-client"), path.resolve(Config.rootDirectory, "modules", "nativescript"));
    }

    private static persistTGZConfiguration(smallstackPath: string) {
        if (smallstackPath === undefined)
            throw Error("No smallstack.path is given!");

        // check if smallstack modules have a root package.json, otherwise, add dist/bundle
        const packageNames: string[] = ["core-common", "core-client", "core-server", "meteor-common", "meteor-client", "meteor-server"];

        const absoluteResourcesPath = path.resolve(Config.rootDirectory, smallstackPath, "resources");
        const absoluteSmallstackDistPath = path.resolve(Config.rootDirectory, smallstackPath, "dist");

        // figure out if datalayer is a new type datalayer or not
        let absoluteDatalayerPath = path.resolve(Config.datalayerPath, "dist", "bundles");
        if (Config.projectHasDatalayerNG())
            absoluteDatalayerPath = path.resolve(Config.datalayerPath);

        // _.each(packageNames, (packageName: string) => {
        //     execNPM("npm install ../smallstack/" + packageName + ".tgz", {
        //         cwd: Config.meteorDirectory
        //     });
        // });


        // meteor linking
        // this.createSymlink(absoluteModuleCoreClientPath, Config.meteorSmallstackCoreClientDirectory);
        // this.createSymlink(absoluteModuleCoreServerPath, Config.meteorSmallstackCoreServerDirectory);
        // this.createSymlink(absoluteModuleCoreCommonPath, Config.meteorSmallstackCoreCommonDirectory);
        // this.createSymlink(absoluteModuleMeteorClientPath, Config.meteorSmallstackMeteorClientDirectory);
        // this.createSymlink(absoluteModuleMeteorServerPath, Config.meteorSmallstackMeteorServerDirectory);
        // this.createSymlink(absoluteModuleMeteorCommonPath, Config.meteorSmallstackMeteorCommonDirectory);
        // this.createSymlink(absoluteDatalayerPath, Config.meteorDatalayerPath);

        // // datalayer
        // this.createSymlink(absoluteModuleCoreCommonPath, Config.datalayerSmallstackCoreCommonDirectory);

        // resources
        // this.createSymlink(absoluteResourcesPath, Config.cliResourcesPath);


        // nativescript module
        // this.createSymlink(absoluteSmallstackCoreClientPath, path.resolve(Config.rootDirectory, smallstackPath, "modules", "nativescript", "node_modules", "@smallstack", "core-client"));
        // this.createSymlink(absoluteModuleCoreCommonPath, path.resolve(Config.rootDirectory, smallstackPath, "modules", "nativescript", "node_modules", "@smallstack", "core-common"));
        // this.createSymlink(absoluteModuleNativescriptPath, path.resolve(Config.rootDirectory, smallstackPath, "modules", "nativescript", "node_modules", "@smallstack", "nativescript"));

        // // meteor module
        // this.createSymlink(absoluteSmallstackCorePath, path.resolve(Config.rootDirectory, smallstackPath, "modules", "meteor-node_modules", "@smallstack", "core"));

        // if (Config.nativescriptDirectory) {
        //     this.createSymlink(absoluteModuleCoreClientPath, Config.nativescriptSmallstackCoreClientDirectory);
        //     this.createSymlink(absoluteModuleCoreCommonPath, Config.nativescriptSmallstackCoreCommonDirectory);
        //     this.createSymlink(absoluteModuleNativescriptPath, Config.nativescriptSmallstackNativescriptDirectory);
        //     this.createSymlink(absoluteDatalayerPath, Config.nativescriptDatalayerDirectory);
        // }

        // if (Config.projectHasFrontend()) {
        //     this.createSymlink(absoluteDatalayerPath, Config.frontendSmallstackDatalayerDirectory);
        // }
    }

    private static persistLocalConfiguration(smallstackPath: string, linkResources: boolean = false) {
        if (smallstackPath === undefined)
            throw Error("No smallstack.path is given!");

        // check if smallstack modules have a root package.json, otherwise, add dist/bundle

        const absoluteModuleCoreClientPath = path.resolve(Config.rootDirectory, smallstackPath, "modules", "core-client");
        const absoluteModuleCoreServerPath = path.resolve(Config.rootDirectory, smallstackPath, "modules", "core-server");
        const absoluteModuleCoreCommonPath = path.resolve(Config.rootDirectory, smallstackPath, "modules", "core-common");
        const absoluteModuleMeteorClientPath = path.resolve(Config.rootDirectory, smallstackPath, "modules", "meteor-client");
        const absoluteModuleMeteorServerPath = path.resolve(Config.rootDirectory, smallstackPath, "modules", "meteor-server");
        const absoluteModuleMeteorCommonPath = path.resolve(Config.rootDirectory, smallstackPath, "modules", "meteor-common");
        const absoluteModuleNativescriptPath = path.resolve(Config.rootDirectory, smallstackPath, "modules", "nativescript");
        const absoluteResourcesPath = path.resolve(Config.rootDirectory, smallstackPath, "resources");
        const absoluteSmallstackDistPath = path.resolve(Config.rootDirectory, smallstackPath, "dist");

        // figure out if datalayer is a new type datalayer or not
        let absoluteDatalayerPath = path.resolve(Config.datalayerPath, "dist", "bundles");
        if (Config.projectHasDatalayerNG())
            absoluteDatalayerPath = path.resolve(Config.datalayerPath);


        // meteor linking
        this.createSymlink(absoluteModuleCoreClientPath, Config.meteorSmallstackCoreClientDirectory);
        this.createSymlink(absoluteModuleCoreServerPath, Config.meteorSmallstackCoreServerDirectory);
        this.createSymlink(absoluteModuleCoreCommonPath, Config.meteorSmallstackCoreCommonDirectory);
        this.createSymlink(absoluteModuleMeteorClientPath, Config.meteorSmallstackMeteorClientDirectory);
        this.createSymlink(absoluteModuleMeteorServerPath, Config.meteorSmallstackMeteorServerDirectory);
        this.createSymlink(absoluteModuleMeteorCommonPath, Config.meteorSmallstackMeteorCommonDirectory);
        this.createSymlink(absoluteDatalayerPath, Config.meteorDatalayerPath);

        // datalayer
        this.createSymlink(absoluteModuleCoreCommonPath, Config.datalayerSmallstackCoreCommonDirectory);

        // resources
        if (linkResources) {
            this.createSymlink(absoluteResourcesPath, Config.cliResourcesPath);
            // this.createSymlink(absoluteSmallstackDistPath, Config.smallstackDistDirectory);
        }

        // nativescript module
        // this.createSymlink(absoluteSmallstackCoreClientPath, path.resolve(Config.rootDirectory, smallstackPath, "modules", "nativescript", "node_modules", "@smallstack", "core-client"));
        // this.createSymlink(absoluteModuleCoreCommonPath, path.resolve(Config.rootDirectory, smallstackPath, "modules", "nativescript", "node_modules", "@smallstack", "core-common"));
        // this.createSymlink(absoluteModuleNativescriptPath, path.resolve(Config.rootDirectory, smallstackPath, "modules", "nativescript", "node_modules", "@smallstack", "nativescript"));

        // // meteor module
        // this.createSymlink(absoluteSmallstackCorePath, path.resolve(Config.rootDirectory, smallstackPath, "modules", "meteor-node_modules", "@smallstack", "core"));

        if (Config.nativescriptDirectory) {
            this.createSymlink(absoluteModuleCoreClientPath, Config.nativescriptSmallstackCoreClientDirectory);
            this.createSymlink(absoluteModuleCoreCommonPath, Config.nativescriptSmallstackCoreCommonDirectory);
            this.createSymlink(absoluteModuleNativescriptPath, Config.nativescriptSmallstackNativescriptDirectory);
            this.createSymlink(absoluteDatalayerPath, Config.nativescriptDatalayerDirectory);
        }

        if (Config.projectHasFrontend()) {
            this.createSymlink(absoluteDatalayerPath, Config.frontendSmallstackDatalayerDirectory);
        }
    }

    private static downloadAndExtractVersion(parameters, version, destination, doneCallback) {
        AWS.config.region = "eu-central-1";
        const targetFileName = path.join(Config.tmpDirectory, "smallstack.zip");
        fs.ensureDirSync(Config.tmpDirectory);
        if (fs.existsSync(targetFileName))
            fs.removeSync(targetFileName);
        const s3 = new AWS.S3();
        const params = { Bucket: "smallstack-releases", Key: "smallstack-" + version + ".zip" };
        const file = require("fs").createWriteStream(targetFileName);
        const stream = s3.getObject(params).createReadStream();
        stream.pipe(file);
        console.log("downloading S3 File from 'smallstack-releases/smallstack-" + version + ".zip' to '" + targetFileName + "' and extracting to " + destination);

        let hadError: boolean = false;
        file.on("error", (err) => {
            hadError = true;
            console.error(err);
            throw err;
        });
        file.on("finish", () => {
            console.log("Done!");
            if (!hadError) {
                fs.emptyDirSync(destination);

                // unzip file
                this.unzipSmallstackFile(targetFileName, destination, doneCallback);
            }
        });

        // var smallstackApi = new SmallstackApi(parameters);
        // request({
        //     method: "GET",
        //     url: smallstackApi.url + "/releases/" + version,
        //     headers: {
        //         "x-smallstack-apikey": smallstackApi.key
        //     }
        // }, function (error, response, body) {
        //     var body = JSON.parse(body);
        //     if (!body.url)
        //         throw new Error("Response didn't include url parameter!");
        //     downloadAndExtract(body.url, destination, doneCallback);
        // });
    }

    private static downloadAndExtract(url, destination, callback) {
        fs.ensureDirSync(Config.tmpDirectory);
        const targetFileName = path.join(Config.tmpDirectory, "smallstack.zip");
        if (fs.existsSync(targetFileName))
            fs.removeSync(targetFileName);
        console.log("downloading '" + url + "' to '" + targetFileName + "' and extracting to " + destination);
        request({
            method: "GET",
            url
        }, (error, response, body) => {
            fs.emptyDirSync(destination);

            // unzip file
            this.unzipSmallstackFile(targetFileName, destination, callback);

        }).pipe(fs.createWriteStream(targetFileName));
    }


    private static unzipSmallstackFile(file, destination, callback) {

        const unzipper = new DecompressZip(file);
        unzipper.on("error", (err) => {
            console.log("Caught an error", err);
            throw err;
        });

        unzipper.on("extract", (log) => {
            console.log("Finished extracting");

            // const archives: string[] = glob.sync(destination + "/*.tgz", { absolute: true });
            // _.each(archives, async (archive: string) => {
            //     const archiveName: string = path.basename(archive, ".tgz");
            //     console.log("Extracting archive : " + archiveName);
            //     await decompress(archive, path.join(destination, "modules", archiveName), {
            //         plugins: [
            //             decompressTargz()
            //         ],
            //         strip: 1
            //     });
            // });
            callback();
        });

        unzipper.on("progress", (fileIndex, fileCount) => {
            console.log("Extracted file " + (fileIndex + 1) + " of " + fileCount);
        });

        unzipper.extract({
            path: destination,
            filter(currentFile) {
                return currentFile.type !== "SymbolicLink";
            }
        });
    }


    private static removeDoubledDevDependencies(packageJsonContent) {
        _.each(packageJsonContent.dependencies, (depVal, depKey) => {
            if (packageJsonContent.devDependencies[depKey])
                delete packageJsonContent.devDependencies[depKey];
        });
    }

}
