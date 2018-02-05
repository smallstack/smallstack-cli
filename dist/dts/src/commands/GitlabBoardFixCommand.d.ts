import { CLICommandOption } from "./CLICommand";
export declare class GitlabBoardFixCommand {
    private static gitlabToken;
    static getHelpSummary(): string;
    static getParameters(): {
        [parameterKey: string]: string;
    };
    static execute(current: CLICommandOption, allCommands: CLICommandOption[]): Promise<any>;
    private static getAll(url);
    private static getResultFromUrl(url);
}
