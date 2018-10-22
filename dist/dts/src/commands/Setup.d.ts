import { CLICommandOption } from "./CLICommand";
export declare class Setup {
    static getHelpSummary(): string;
    static getParameters(): {
        [parameterKey: string]: string;
    };
    static execute(current: CLICommandOption, allCommands: CLICommandOption[]): Promise<any>;
    private static setupSmallstackProject;
    private static handleProjectVersion;
    private static handleRemoteFile;
    private static handleLocalFile;
    private static handleDistFolder;
    private static createSmallstackLinkableDistFolder;
    private static askPackageModeQuestions;
    private static linkStuffWhenNPMVersionsAreBeingUsed;
    private static createSymlink;
    private static npmInstallModules;
    private static linkDistFolderToProject;
    private static downloadVersion;
    private static downloadFile;
    private static unzipSmallstackFile;
}
