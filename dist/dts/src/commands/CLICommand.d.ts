export interface CLICommandOption {
    name: string;
    parameters: {
        [key: string]: any;
    };
}
export interface CLICommandStatic {
    /**
     * Prints the parameters
     */
    getParameters(): {
        [parameterKey: string]: string;
    };
    /**
     * Prints a summay next to the command when user hits `smallstack help`
     */
    getHelpSummary(): string;
    /**
     * returns a promised boolean which indicates if the command queue should be continued or not. Failing the promise also stops the command queue
     */
    execute(currentCLICommandOption: CLICommandOption, allCommands: CLICommandOption[]): Promise<boolean>;
}
