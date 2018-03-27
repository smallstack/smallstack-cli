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
const child_process_1 = require("child_process");
const fs = require("fs-extra");
const path = require("path");
const SimpleGit = require("simple-git/promise");
const Config_1 = require("../Config");
const baseGitPath = "git@gitlab.com:smallstack/products/";
class Workspace {
    static getHelpSummary() {
        return "Updates a new stack workspace";
    }
    static getParameters() {
        return {
            update: "git pull for all repositories",
            install: "npm install for all repositories",
            bundle: "npm run bundlefor all repositories",
            link: "npm link for all repositories"
        };
    }
    static execute(current, allCommands) {
        if (!Config_1.Config.isWorkspaceEnvironment())
            return Promise.reject("Not a workspace directory!");
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let explizitCommandFound = false;
            if (current.parameters.update) {
                explizitCommandFound = true;
                yield this.updateWorkspace();
            }
            if (current.parameters.install) {
                explizitCommandFound = true;
                yield this.npmWorkspace("install");
            }
            if (current.parameters.bundle) {
                explizitCommandFound = true;
                yield this.npmWorkspace("run bundle");
            }
            if (current.parameters.link) {
                explizitCommandFound = true;
                yield this.npmWorkspace("link");
            }
            if (!explizitCommandFound)
                yield this.updateWorkspace();
            resolve();
        }));
    }
    static updateWorkspace() {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            for (const packageName of Config_1.packageNames) {
                const packagePath = path.join(Config_1.Config.rootDirectory, packageName);
                if (!fs.pathExistsSync(packagePath)) {
                    console.log("Package not found, doing a fresh clone: " + packageName);
                    yield SimpleGit(Config_1.Config.rootDirectory).clone(baseGitPath + packageName + ".git", packagePath);
                }
                else {
                    const git = SimpleGit(packagePath);
                    const status = yield git.status();
                    console.log("Pulling " + packagePath + ", branch: " + status.current);
                    if (status.current !== "develop")
                        console.warn("   ---> NOT on develop branch!");
                    yield git.pull();
                }
            }
            resolve();
        }));
    }
    static npmWorkspace(npmCommand) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            for (const packageName of Config_1.packageNames) {
                const packagePath = path.join(Config_1.Config.rootDirectory, packageName);
                if (!fs.pathExistsSync(packagePath))
                    console.log("Package not found : " + packagePath);
                else {
                    console.log("Executing npm " + npmCommand + " in " + packagePath);
                    child_process_1.execSync("npm " + npmCommand, {
                        cwd: packagePath
                    });
                }
            }
            resolve();
        }));
    }
}
exports.Workspace = Workspace;
