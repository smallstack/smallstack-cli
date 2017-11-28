
import * as _ from "underscore";
import { Config } from "../Config";
import { CLICommandOption } from "./CLICommand";
// tslint:disable-next-line:no-var-requires
const execNPM = require("../functions/execNPM");
import { existsSync } from "fs-extra";
import { join } from "path";

export class PublishCommand {

    public static getParameters(): { [parameterKey: string]: string } {
        return {};
    }

    public static getHelpSummary(): string {
        return "publishes modules to NPM";
    }

    public static execute(currentCLICommandOption: CLICommandOption, allCommands: CLICommandOption[]): Promise<any> {
        _.each(Config.getModuleNames(), (moduleName: string) => {
            if (!existsSync(join(Config.rootDirectory, "modules", moduleName, "dist")))
                throw new Error("Seems like the module is not built yet. This folder does not exist: " + join(Config.rootDirectory, "modules", moduleName, "dist"));
            execNPM("npm publish", { cwd: join(Config.rootDirectory, "modules", moduleName) });
        });
        return Promise.resolve();
    }

}

