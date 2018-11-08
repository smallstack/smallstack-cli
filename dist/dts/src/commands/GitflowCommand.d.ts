import { CLICommandOption } from "./CLICommand";
export declare class GitflowCommand {
    static getHelpSummary(): string;
    static getParameters(): {
        [parameterKey: string]: string;
    };
    static execute(current: CLICommandOption, allCommands: CLICommandOption[]): Promise<any>;
    private static commandOption;
    private static doRelease;
    private static getCurrentVersion;
    private static getDirectories;
    private static getFlutterVersion;
    private static toVersion;
    private static replaceString;
    private static getRegex;
    private static replaceVersionInPackageJsonPath;
    private static getFlutterAppDirectory;
    private static showVersionBanner;
}
