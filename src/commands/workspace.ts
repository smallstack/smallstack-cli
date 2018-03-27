import { execSync } from "child_process";
import * as fs from "fs-extra";
import * as path from "path";
import * as SimpleGit from "simple-git/promise";
import { Config, packageNames } from "../Config";
import { CLICommandOption } from "./CLICommand";

const baseGitPath: string = "git@gitlab.com:smallstack/products/";

export class Workspace {

    public static getHelpSummary(): string {
        return "Updates a new stack workspace";
    }

    public static getParameters(): { [parameterKey: string]: string } {
        return {
            update: "git pull for all repositories",
            install: "npm install for all repositories",
            bundle: "npm run bundlefor all repositories",
            link: "npm link for all repositories"
        };
    }

    public static execute(current: CLICommandOption, allCommands: CLICommandOption[]): Promise<any> {
        if (!Config.isWorkspaceEnvironment())
            return Promise.reject("Not a workspace directory!");

        return new Promise<any>(async (resolve, reject) => {

            let explizitCommandFound: boolean = false;

            if (current.parameters.update) {
                explizitCommandFound = true;
                await this.updateWorkspace();
            }

            if (current.parameters.install) {
                explizitCommandFound = true;
                await this.npmWorkspace("install");
            }

            if (current.parameters.bundle) {
                explizitCommandFound = true;
                await this.npmWorkspace("run bundle");
            }

            if (current.parameters.link) {
                explizitCommandFound = true;
                await this.npmWorkspace("link");
            }

            if (!explizitCommandFound)
                await this.updateWorkspace();

            resolve();
        });
    }

    private static updateWorkspace() {
        return new Promise<any>(async (resolve, reject) => {
            for (const packageName of packageNames) {
                const packagePath = path.join(Config.rootDirectory, packageName);
                if (!fs.pathExistsSync(packagePath)) {
                    console.log("Package not found, doing a fresh clone: " + packageName);
                    await SimpleGit(Config.rootDirectory).clone(baseGitPath + packageName + ".git", packagePath);
                } else {
                    const git = SimpleGit(packagePath);
                    const status = await git.status();
                    console.log("Pulling " + packagePath + ", branch: " + status.current);
                    if (status.current !== "develop")
                        console.warn("   ---> NOT on develop branch!");
                    await git.pull();
                }
            }
            resolve();
        });
    }

    private static npmWorkspace(npmCommand: string) {
        return new Promise<any>(async (resolve, reject) => {
            for (const packageName of packageNames) {
                const packagePath = path.join(Config.rootDirectory, packageName);
                if (!fs.pathExistsSync(packagePath))
                    console.log("Package not found : " + packagePath);
                else {
                    console.log("Executing npm " + npmCommand + " in " + packagePath);
                    execSync("npm " + npmCommand, {
                        cwd: packagePath
                    });
                }
            }
            resolve();
        });
    }
}
