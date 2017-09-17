// tslint:disable:no-var-requires
import { copySync } from "fs-extra";
import * as path from "path";
const config = require("../config");
const exec = require("../functions/exec");

export function createDockerImages(parameters: any): Promise<any> {

    if (parameters.dockerRegistry === undefined)
        parameters.dockerRegistry = "registry.gitlab.com";

    if (config.isProjectEnvironment()) {
        if (parameters.frontendOnly)
            return createFrontendImage(parameters);
        if (parameters.meteorOnly)
            return createMeteorImage(parameters);
        return Promise.all([createMeteorImage(parameters), createFrontendImage(parameters)]);
    }
    else {
        throw new Error("Creating docker images only works in smallstack project directories!");
    }
}

function createMeteorImage(parameters): Promise<void> {
    return new Promise<void>((resolve, reject) => {

        if (parameters.meteorImageName === undefined)
            parameters.meteorImageName = "meteor-" + config.name;

        console.log("Creating docker image: " + parameters.meteorImageName);

        copySync(path.join(config.meteorDirectory, "Dockerfile"), path.join(config.builtDirectory, "Dockerfile.meteor"));
        exec("docker info", { cwd: config.builtDirectory });
        exec(`docker login -u ${parameters.dockerUsername} -p ${parameters.dockerPassword} ${parameters.dockerRegistry}`, {
            cwd: config.builtDirectory,
            commandString: `docker login -u ${parameters.dockerUsername} -p XXXXXXX  ${parameters.dockerRegistry}`
        });

        exec(`docker build -t ${parameters.meteorImageName} -f Dockerfile.meteor .`, { cwd: config.builtDirectory });
        exec(`docker push ${parameters.meteorImageName}`, { cwd: config.builtDirectory });
    });
}

function createFrontendImage(parameters): Promise<void> {
    if (config.frontendDirectory === undefined) {
        // tslint:disable-next-line:no-console
        console.log("No frontend directory found, skipping frontend docker image creation!");
        return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {

        if (parameters.frontendImageName === undefined)
            parameters.frontendImageName = "frontend-" + config.name;

        console.log("Creating docker image: " + parameters.frontendImageName);

        copySync(path.join(config.frontendDirectory, "Dockerfile.archive"), path.join(config.builtDirectory, "Dockerfile.frontend"));
        exec("docker info", { cwd: config.builtDirectory });
        exec(`docker login -u ${parameters.dockerUsername} -p ${parameters.dockerPassword} ${parameters.dockerRegistry}`, {
            cwd: config.builtDirectory,
            commandString: `docker login -u ${parameters.dockerUsername} -p XXXXXXX  ${parameters.dockerRegistry}`
        });

        exec(`docker build -t ${parameters.frontendImageName} -f Dockerfile.frontend .`, { cwd: config.builtDirectory });
        exec(`docker push ${parameters.frontendImageName}`, { cwd: config.builtDirectory });
    });
}
