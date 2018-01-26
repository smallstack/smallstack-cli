import { CLICommandOption } from "./CLICommand";
import * as request from "request-promise";
import * as _ from "underscore";

export class ChangelogCommand {

    public static getHelpSummary(): string {
        return "Creates a changelog based on gitlab issues and tags!";
    }

    public static getParameters(): { [parameterKey: string]: string } {
        return {};
    }

    public static execute(current: CLICommandOption, allCommands: CLICommandOption[]): Promise<any> {
        return new Promise<void>(async (resolve) => {

            const gitlabToken: string = "";

            // get project 
            let project: any[] = await request.get("https://gitlab.com/api/v4/projects/smallstack%2Fproject-sata-loyalty", {
                headers: {
                    "PRIVATE-TOKEN": gitlabToken
                },
                json: true
            });
            console.log(project);

            // get all tags with dates


            // get all issues with closing dates

            // write changelog.md


            resolve();
        });

    }
}