import * as _ from "underscore";
import { CLICommandOption } from "../commands/CLICommand";

export function parseArguments(args: string[]): CLICommandOption[] {
    if (!(args instanceof Array))
        throw new Error("No Arguments given!");

    args.splice(0, 2);

    const commands: CLICommandOption[] = [];
    _.each(args, (arg) => {
        if (arg.indexOf("--") === 0) {
            if (commands.length === 0)
                throw new Error("parameter given before first command!");
            const parameterSplit = arg.substring(2).split("=");
            const key = parameterSplit[0];
            let value: any = parameterSplit[1];
            if (value === undefined)
                value = true;
            try {
                // if array or object is passed, parse it as json
                if (typeof value === "string") {
                    value = value.replace(/'/g, "\"");
                    value = JSON.parse(value);
                }
            } catch (e) {
                // shit happens
            }
            commands[(commands.length - 1)].parameters[key] = value;
        } else if (arg.indexOf("-") === 0) {
            throw new Error("please use -- as parameter indicator!");
        }
        else {
            const command = { name: arg, parameters: {} };
            commands.push(command);
        }
    });

    return commands;
}
