// tslint:disable:member-ordering

import * as cliSpinner from "cli-spinner";
import * as colors from "colors";
import * as request from "request";
import * as semver from "semver";
import { Config } from "../Config";


export class UpdateCheck {

    private static newVersion: string;
    private static url: string = "https://gitlab.com/smallstack/smallstack-cli/raw/master/package.json";
    private static currentPromise: Promise<boolean>;

    public static check(): Promise<boolean> {
        if (this.currentPromise)
            return this.currentPromise;

        this.currentPromise = new Promise<boolean>((resolve, reject) => {
            const spinner = new cliSpinner.Spinner("checking for updates...");
            spinner.start();
            try {
                request(this.url, (error: Error, response, body) => {
                    spinner.stop(true);
                    if (error)
                        reject("Error while checking for updates: " + error.message);
                    else {
                        try {
                            const packageJSON: any = JSON.parse(body);
                            if (semver.lt(Config.cli.version, packageJSON.version)) {
                                this.newVersion = packageJSON.version;
                                console.log(" ");
                                console.log(colors.green("***********************************************************************"));
                                console.log(colors.green("*                   New Version available :"), colors.green.bold(this.newVersion), colors.green("                    *"));
                                console.log(colors.green("* Call 'npm install -g @smallstack/cli' to install the latest version! *"));
                                console.log(colors.green("***********************************************************************"));
                                if (!Config.isCIMode())
                                    throw new Error("Aborting execution...");
                                resolve(true);
                            }
                            else
                                resolve(false);
                        } catch (e) {
                            reject(e);
                        }
                    }
                });
            } catch (e) {
                reject("Error while checking for updates :" + e.message);
            }
        });
        return this.currentPromise;
    }
}
