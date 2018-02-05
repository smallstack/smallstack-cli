import { CLICommandStatic } from "./CLICommand";
export declare class HelpCommand {
    private commandRowWidth;
    private descriptionRowWidth;
    showHelp(registeredCommands: {
        [name: string]: CLICommandStatic;
    }): Promise<boolean>;
    padStringRight(str: string, width: number): string;
    helpEntry(commandName: any, options: any, description: any): void;
}
