// tslint:disable:member-ordering
import * as fs from "fs-extra";
import * as inquirer from "inquirer";
import * as moment from "moment";
import * as request from "request-promise";
import * as semver from "semver";
import { GitlabService } from "../services/GitlabService";
import { CLICommandOption } from "./CLICommand";

export class ChangelogCommand {

    public static getHelpSummary(): string {
        return "Creates a changelog based on gitlab milestones!";
    }

    public static getParameters(): { [parameterKey: string]: string } {
        return {};
    }

    public static execute(current: CLICommandOption, allCommands: CLICommandOption[]): Promise<any> {
        return new Promise<void>(async (resolve, reject) => {

            let gitlabToken: string = process.env.GITLAB_TOKEN;
            if (!gitlabToken) {
                const answers = await inquirer.prompt([{
                    name: "gitlabToken",
                    type: "password",
                    message: "Gitlab Token"
                }]);
                gitlabToken = answers.gitlabToken;
            }
            if (!gitlabToken)
                throw new Error("No gitlab token defined!");

            const gitlabService: GitlabService = new GitlabService({ gitlabToken, gitlabUrl: "https://gitlab.com" });

            const projectPath: string = await gitlabService.getProjectPathFromLocalGitRepo();
            const issueBaseUrl: string = `https://gitlab.com/${projectPath}/issues/`;

            // get project
            console.log("Getting Project " + projectPath);
            const project: any = await request.get(`https://gitlab.com/api/v4/projects/${projectPath.replace(/\//g, "%2F")}`, {
                headers: {
                    "PRIVATE-TOKEN": gitlabToken
                },
                json: true
            });
            if (!project)
                throw new Error("Could not find project!");
            const projectId: string = project.id;
            console.log("  -> Project ID " + projectId);

            // get all milestones
            console.log("Getting Milestones...");
            let milestones: any[] = await gitlabService.getAll(`https://gitlab.com/api/v4/projects/${projectId}/milestones?state=closed`);
            console.log("  -> " + milestones.length + " Milestones found!");

            milestones = milestones.sort((milestoneA, milestoneB) => {
                if (semver.gt(milestoneA.title, milestoneB.title))
                    return -1;
                else
                    return 1;
            });

            // write changelog.md
            console.log("Computing Changelog...");
            let out: string = "";
            for (const milestone of milestones) {

                const milestoneIssues: any[] = await gitlabService.getAll(`https://gitlab.com/api/v4/projects/${projectId}/milestones/${milestone.id}/issues`);
                if (milestoneIssues.length > 0) {
                    const bugs: any[] = [];
                    const issues: any[] = [];
                    for (const issue of milestoneIssues) {
                        if (issue.labels instanceof Array && issue.labels.indexOf("Bug") !== -1)
                            bugs.push(issue);
                        else
                            issues.push(issue);
                    }

                    const dateString: string = moment(milestone.due_date).format("YYYY-MM-DD");
                    out += "\n";
                    out += "# " + milestone.title;
                    out += "\n";

                    out += "Release Date: " + dateString;
                    out += "\n";
                    out += "\n";

                    if (issues.length > 0) {
                        out += "## Issues";
                        out += "\n";
                        for (const issue of issues) {
                            out += `* [${issue.iid}](${issueBaseUrl}${issue.iid}) - ${issue.title} (${moment(issue.closed_at).format("YYYY-MM-DD")})`;
                            out += "\n";
                        }
                        out += "\n";
                    }

                    if (bugs.length > 0) {
                        out += "## Bugs";
                        out += "\n";
                        for (const bug of bugs) {
                            out += `* [${bug.iid}](${issueBaseUrl}${bug.iid}) - ${bug.title} (${moment(bug.closed_at).format("YYYY-MM-DD")})`;
                            out += "\n";
                        }
                        out += "\n";
                    }
                    out += "\n";
                }
            }
            console.log("Writing Changelog to ./CHANGELOG.md ...");
            fs.writeFileSync("./CHANGELOG.md", out, { encoding: "UTF-8" });
            resolve();
        });

    }

}
