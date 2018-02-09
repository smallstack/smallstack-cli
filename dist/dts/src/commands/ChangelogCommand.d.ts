import { CLICommandOption } from "./CLICommand";
export declare class ChangelogCommand {
    static getHelpSummary(): string;
    static getParameters(): {
        [parameterKey: string]: string;
    };
    static execute(current: CLICommandOption, allCommands: CLICommandOption[]): Promise<any>;
}
