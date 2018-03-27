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
            init: "Creates folders and clones all repositories",
            update: "Checkout develops"
        };
    }

    public static execute(current: CLICommandOption, allCommands: CLICommandOption[]): Promise<any> {
        if (current.parameters.init)
            return this.initWorkspace();
        return this.updateWorkspace();
    }

    private static initWorkspace() {
        return new Promise<any>(async (resolve, reject) => {
            for (const packageName of packageNames) {
                const packagePath = path.join(Config.rootDirectory, packageName);
                console.log("Cloning " + packageName + " to " + packagePath);
                if (fs.pathExistsSync(packagePath))
                    return reject("Directory already exists, cannot do the init dance: " + packageName);
                const git = SimpleGit(Config.rootDirectory);
                await git.clone(baseGitPath + packageName + ".git", packagePath);
            }
        });
    }

    private static updateWorkspace() {
        return new Promise<any>(async (resolve, reject) => {
            for (const packageName of packageNames) {
                const packagePath = path.join(Config.rootDirectory, packageName);
                if (!fs.pathExistsSync(packagePath)) {
                    console.log("Package not found, doing a fresh clone: " + packageName);
                    await SimpleGit(Config.rootDirectory).clone(baseGitPath + packageName + ".git", packagePath);
                }
                const git = SimpleGit(packagePath);
                const status = await git.status();
                console.log("Pulling " + packagePath + ", branch: " + status.current);
                if (status.current !== "develop")
                    console.warn("   ---> NOT on develop branch!");
                await git.pull();
            }
        });
    }
}
