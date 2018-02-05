import { CLICommandOption } from "./CLICommand";
export declare class ChangelogCommand {
    private static git;
    private static gitlabToken;
    static getHelpSummary(): string;
    static getParameters(): {
        [parameterKey: string]: string;
    };
    static execute(current: CLICommandOption, allCommands: CLICommandOption[]): Promise<any>;
    private static getAll(url);
    static getProjectPath(): Promise<string>;
    private static getResultFromUrl(url);
}
