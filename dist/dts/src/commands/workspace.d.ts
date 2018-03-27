import { CLICommandOption } from "./CLICommand";
export declare class Workspace {
    static getHelpSummary(): string;
    static getParameters(): {
        [parameterKey: string]: string;
    };
    static execute(current: CLICommandOption, allCommands: CLICommandOption[]): Promise<any>;
    private static updateWorkspace();
    private static npmWorkspace(npmCommand);
    private static updateWorkspaceFile();
}
