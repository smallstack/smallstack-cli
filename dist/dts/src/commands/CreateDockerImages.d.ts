import { CLICommandOption } from "./CLICommand";
export declare class CreateDockerImages {
    static getHelpSummary(): string;
    static getParameters(): {
        [parameterKey: string]: string;
    };
    static execute(current: CLICommandOption, allCommands: CLICommandOption[]): Promise<any>;
    private static createMeteorImage(parameters);
    private static createFrontendImage(parameters);
}
