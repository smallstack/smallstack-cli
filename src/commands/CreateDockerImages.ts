// tslint:disable:no-var-requires
import { copySync } from "fs-extra";
import * as path from "path";
import { Config } from "../Config";
const exec = require("../functions/exec");
import { CLICommand, CLICommandOption } from "./CLICommand";

export class CreateDockerImages implements CLICommand {

    public getHelpSummary(): string {
        return "Creates docker images for frontend and meteor apps (if available).";
    }

    public getParameters(): { [parameterKey: string]: string } {
        return {};
    }

    public execute(current: CLICommandOption, allCommands: CLICommandOption[]): Promise<any> {
        console.log("current", current);
        console.log("allCommands", allCommands);
        if (current.parameters.dockerRegistry === undefined)
            current.parameters.dockerRegistry = "registry.gitlab.com";

        if (Config.isProjectEnvironment()) {
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

    private createMeteorImage(parameters): Promise<any> {
        return new Promise<boolean>((resolve, reject) => {

            if (parameters.meteorImageName === undefined)
                parameters.meteorImageName = "meteor-" + Config.name;

            console.log("Creating docker image: " + parameters.meteorImageName);

            copySync(path.join(Config.meteorDirectory, "Dockerfile"), path.join(Config.builtDirectory, "Dockerfile.meteor"));
            exec("docker info", { cwd: Config.builtDirectory });
            exec(`docker login -u ${parameters.dockerUsername} -p ${parameters.dockerPassword} ${parameters.dockerRegistry}`, {
                cwd: Config.builtDirectory,
                commandString: `docker login -u ${parameters.dockerUsername} -p XXXXXXX  ${parameters.dockerRegistry}`
            });

            exec(`docker build -t ${parameters.meteorImageName} -f Dockerfile.meteor .`, { cwd: Config.builtDirectory });
            exec(`docker push ${parameters.meteorImageName}`, { cwd: Config.builtDirectory });
            resolve();
        });
    }

    private createFrontendImage(parameters): Promise<any> {
        if (Config.frontendDirectory === undefined) {
            // tslint:disable-next-line:no-console
            console.log("No frontend directory found, skipping frontend docker image creation!");
            return Promise.resolve();
        }
        return new Promise<boolean>((resolve, reject) => {

            if (parameters.frontendImageName === undefined)
                parameters.frontendImageName = "frontend-" + Config.name;

            console.log("Creating docker image: " + parameters.frontendImageName);

            copySync(path.join(Config.frontendDirectory, "Dockerfile.archive"), path.join(Config.builtDirectory, "Dockerfile.frontend"));
            exec("docker info", { cwd: Config.builtDirectory });
            exec(`docker login -u ${parameters.dockerUsername} -p ${parameters.dockerPassword} ${parameters.dockerRegistry}`, {
                cwd: Config.builtDirectory,
                commandString: `docker login -u ${parameters.dockerUsername} -p XXXXXXX  ${parameters.dockerRegistry}`
            });

            exec(`docker build -t ${parameters.frontendImageName} -f Dockerfile.frontend .`, { cwd: Config.builtDirectory });
            exec(`docker push ${parameters.frontendImageName}`, { cwd: Config.builtDirectory });
            resolve();
        });
    }
}
