import { CLICommandOption } from "./CLICommand";
export declare class GitflowCommand {
    static getHelpSummary(): string;
    static getParameters(): {
        [parameterKey: string]: string;
    };
    static execute(current: CLICommandOption, allCommands: CLICommandOption[]): Promise<any>;
    private static doRelease(tagName);
    private static getCurrentVersion();
    private static getDirectories(root);
    private static toVersion(toVersion);
    private static replaceString(file, regex, replacement);
    private static getRegex(file, regex);
    private static replaceVersionInPackageJson(file, newVersion);
}
