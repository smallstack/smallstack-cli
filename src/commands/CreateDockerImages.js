"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:no-var-requires
const fs_extra_1 = require("fs-extra");
const path = require("path");
const Config_1 = require("../Config");
const exec = require("../functions/exec");
class CreateDockerImages {
    static getHelpSummary() {
        return "Creates docker images for frontend and meteor apps (if available).";
    }
    static getParameters() {
        return {
            frontendOnly: "set to true if you only want to create a docker image for the frontend",
            meteorOnly: "set to true if you only want to create a docker image for the meteor backend",
        };
    }
    static execute(current, allCommands) {
        if (Config_1.Config.isProjectEnvironment()) {
            if (current.parameters.frontendOnly)
                return this.createFrontendImage(current.parameters);
            if (current.parameters.meteorOnly)
                return this.createMeteorImage(current.parameters);
            return Promise.all([this.createMeteorImage(current.parameters), this.createFrontendImage(current.parameters)]);
        }
        else {
            throw new Error("Creating docker images only works in smallstack project directories!");
        }
    }
    static createMeteorImage(parameters) {
        return new Promise((resolve, reject) => {
            if (parameters.meteorImageName === undefined)
                parameters.meteorImageName = "meteor-" + Config_1.Config.project.name;
            console.log("Creating docker image: " + parameters.meteorImageName);
            fs_extra_1.copySync(path.join(Config_1.Config.meteorDirectory, "Dockerfile"), path.join(Config_1.Config.builtDirectory, "Dockerfile.meteor"));
            exec("docker info", { cwd: Config_1.Config.builtDirectory });
            exec(`docker login -u ${parameters.dockerUsername} -p ${parameters.dockerPassword} ${parameters.dockerRegistry}`, {
                cwd: Config_1.Config.builtDirectory,
                commandString: `docker login -u ${parameters.dockerUsername} -p XXXXXXX  ${parameters.dockerRegistry}`
            });
            exec(`docker build -t ${parameters.meteorImageName} -f Dockerfile.meteor .`, { cwd: Config_1.Config.builtDirectory });
            exec(`docker push ${parameters.meteorImageName}`, { cwd: Config_1.Config.builtDirectory });
            resolve();
        });
    }
    static createFrontendImage(parameters) {
        if (Config_1.Config.frontendDirectory === undefined) {
            // tslint:disable-next-line:no-console
            console.log("No frontend directory found, skipping frontend docker image creation!");
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            if (parameters.frontendImageName === undefined)
                parameters.frontendImageName = "frontend-" + Config_1.Config.name;
            console.log("Creating docker image: " + parameters.frontendImageName);
            fs_extra_1.copySync(path.join(Config_1.Config.frontendDirectory, "Dockerfile.archive"), path.join(Config_1.Config.builtDirectory, "Dockerfile.frontend"));
            exec("docker info", { cwd: Config_1.Config.builtDirectory });
            exec(`docker login -u ${parameters.dockerUsername} -p ${parameters.dockerPassword} ${parameters.dockerRegistry}`, {
                cwd: Config_1.Config.builtDirectory,
                commandString: `docker login -u ${parameters.dockerUsername} -p XXXXXXX  ${parameters.dockerRegistry}`
            });
            exec(`docker build -t ${parameters.frontendImageName} -f Dockerfile.frontend .`, { cwd: Config_1.Config.builtDirectory });
            exec(`docker push ${parameters.frontendImageName}`, { cwd: Config_1.Config.builtDirectory });
            resolve();
        });
    }
}
exports.CreateDockerImages = CreateDockerImages;
