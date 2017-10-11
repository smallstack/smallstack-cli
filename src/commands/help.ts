import * as _ from "underscore";
import { CLICommandOption, CLICommandStatic } from "./CLICommand";


export class HelpCommand {

    private commandRowWidth = 25;
    private descriptionRowWidth = 80 - this.commandRowWidth;

    public showHelp(registeredCommands: { [name: string]: CLICommandStatic }): Promise<boolean> {
        console.log("Usage : command [options] [command [options] ...]");
        console.log(" ");
        console.log("     Example: smallstack clean --all setup --offline generate bundle");
        console.log(" ");
        console.log("Available Commands : ");
        _.each(registeredCommands, (command: CLICommandStatic, name: string) => {
            if (typeof command.getParameters === "function")
                this.helpEntry(name, command.getParameters(), command.getHelpSummary());
        });
        return Promise.resolve(true);
    }

    public padStringRight(str: string, width: number) {
        const difference = width - str.length;
        if (difference > 0) {
            for (let i = 0; i < difference; i++) {
                str += " ";
            }
        }
        return str;
    }

    // public printOptions(options) {
    //     if (options instanceof Array)
    //         for (let i = 0; i < options.length; i++) {
    //             process.stdout.write(this.padStringRight(options));
    //         }
    // }

    public helpEntry(commandName, options, description) {
        console.log(" ");
        process.stdout.write(" " + this.padStringRight(commandName, this.commandRowWidth));
        process.stdout.write(this.padStringRight(description, this.descriptionRowWidth));
        if (options) {
            _.each(options, (desc, param) => {
                process.stdout.write("\n");
                process.stdout.write(this.padStringRight("   --" + param, this.commandRowWidth) + "  " + desc);
            });
        }
        process.stdout.write("\n");
    }

}
