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
            init: "Creates folders and clones all repositories",
            update: "Checkout develops"
        };
    }
    static execute(current, allCommands) {
        if (current.parameters.init)
            return this.initWorkspace();
        return this.updateWorkspace();
    }
    static initWorkspace() {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            for (const packageName of Config_1.packageNames) {
                const packagePath = path.join(Config_1.Config.rootDirectory, packageName);
                console.log("Cloning " + packageName + " to " + packagePath);
                if (fs.pathExistsSync(packagePath))
                    return reject("Directory already exists, cannot do the init dance: " + packageName);
                const git = SimpleGit(Config_1.Config.rootDirectory);
                yield git.clone(baseGitPath + packageName + ".git", packagePath);
            }
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
                const git = SimpleGit(packagePath);
                const status = yield git.status();
                console.log("Pulling " + packagePath + ", branch: " + status.current);
                if (status.current !== "develop")
                    console.warn("   ---> NOT on develop branch!");
                yield git.pull();
            }
        }));
    }
}
exports.Workspace = Workspace;
