import { CLICommandOption } from "./CLICommand";
export declare class Setup {
    static getHelpSummary(): string;
    static getParameters(): {
        [parameterKey: string]: string;
    };
    static execute(current: CLICommandOption, allCommands: CLICommandOption[]): Promise<any>;
    private static setupSmallstackProject(current);
    private static handleProjectVersion();
    private static handleRemoteFile(url);
    private static handleLocalFile(localFilePath);
    private static handleDistFolder(distFolder);
    private static createSmallstackLinkableDistFolder();
    private static askPackageModeQuestions(commandOption);
    private static linkStuffWhenNPMVersionsAreBeingUsed();
    private static createSymlink(from, to);
    private static npmInstallModules(rootPath, alsoDevPackages?);
    private static linkDistFolderToProject(smallstackPath);
    private static downloadVersion(version);
    private static downloadFile(url);
    private static unzipSmallstackFile(file, destination);
}
