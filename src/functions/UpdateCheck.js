"use strict";
// tslint:disable:member-ordering
Object.defineProperty(exports, "__esModule", { value: true });
const cliSpinner = require("cli-spinner");
const colors = require("colors");
const request = require("request");
const semver = require("semver");
const Config_1 = require("../Config");
class UpdateCheck {
    static check() {
        if (this.currentPromise)
            return this.currentPromise;
        this.currentPromise = new Promise((resolve, reject) => {
            const spinner = new cliSpinner.Spinner("checking for updates...");
            spinner.start();
            try {
                request(this.url, (error, response, body) => {
                    spinner.stop(true);
                    if (error)
                        reject("Error while checking for updates: " + error.message);
                    else {
                        try {
                            const packageJSON = JSON.parse(body);
                            if (semver.lt(Config_1.Config.cli.version, packageJSON.version)) {
                                this.newVersion = packageJSON.version;
                                console.log(" ");
                                console.log(colors.green("***********************************************************************"));
                                console.log(colors.green("*                   New Version available :"), colors.green.bold(this.newVersion), colors.green("                    *"));
                                console.log(colors.green("* Call 'npm install -g @smallstack/cli' to install the latest version! *"));
                                console.log(colors.green("***********************************************************************"));
                                if (!Config_1.Config.isCIMode())
                                    throw new Error("Aborting execution...");
                                resolve(true);
                            }
                            else
                                resolve(false);
                        }
                        catch (e) {
                            reject(e);
                        }
                    }
                });
            }
            catch (e) {
                reject("Error while checking for updates :" + e.message);
            }
        });
        return this.currentPromise;
    }
}
UpdateCheck.url = "https://gitlab.com/smallstack/smallstack-cli/raw/master/package.json";
exports.UpdateCheck = UpdateCheck;
