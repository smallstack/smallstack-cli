import { CLICommandOption } from "./CLICommand";
export declare class BundleCommand {
    static getParameters(): {
        [parameterKey: string]: string;
    };
    static getHelpSummary(): string;
    static execute(currentCLICommandOption: CLICommandOption, allCommands: CLICommandOption[]): Promise<any>;
}
