// tslint:disable:member-ordering
import * as fs from "fs-extra";
import * as inquirer from "inquirer";
import * as moment from "moment";
import * as request from "request-promise";
import * as semver from "semver";
import * as GIT from "simple-git";
import * as _ from "underscore";
import { CLICommandOption } from "./CLICommand";

export class ChangelogCommand {

    private static git = GIT();
    private static gitlabToken: string;

    public static getHelpSummary(): string {
        return "Creates a changelog based on gitlab issues and tags!";
    }

    public static getParameters(): { [parameterKey: string]: string } {
        return {
            "--auto-create-milestones": "Automatically creates Gitlab Milestones for all Git Tags",
            "--fix-missing-milestones": "Adds missing milestones to issues based on when their MR was merged"
        };
    }

    public static execute(current: CLICommandOption, allCommands: CLICommandOption[]): Promise<any> {
        return new Promise<void>(async (resolve, reject) => {

            this.gitlabToken = process.env.GITLAB_TOKEN;
            if (!this.gitlabToken) {
                const answers = await inquirer.prompt([{
                    name: "gitlabToken",
                    type: "password",
                    message: "Gitlab Token"
                }]);
                this.gitlabToken = answers.gitlabToken;
            }
            if (!this.gitlabToken)
                throw new Error("No gitlab token defined!");

            const projectPath: string = await this.getProjectPath();
            const issueBaseUrl: string = `https://gitlab.com/${projectPath}/issues/`;

            // get project
            console.log("Getting Project " + projectPath);
            const project: any = await request.get(`https://gitlab.com/api/v4/projects/${projectPath.replace(/\//g, "%2F")}`, {
                headers: {
                    "PRIVATE-TOKEN": this.gitlabToken
                },
                json: true
            });
            if (!project)
                throw new Error("Could not find project!");
            const projectId: string = project.id;
            console.log("  -> Project ID " + projectId);

            // get all milestones
            console.log("Getting Milestones...");
            const milestones: any[] = await this.getAll(`https://gitlab.com/api/v4/projects/${projectId}/milestones`);
            console.log("  -> " + milestones.length + " Milestones found!");

            milestones.sort((milestoneA, milestoneB) => {
                if (semver.gt(milestoneA.title, milestoneB.title))
                    return -1;
                else
                    return 1;
            });

            // write changelog.md
            console.log("Computing Changelog...");
            let out: string = "";
            for (const milestone of milestones) {
                const dateString: string = moment(milestone.due_date).format("YYYY-MM-DD");
                out += "\n";
                out += "# " + milestone.title;
                out += "\n";

                out += "Release Date: " + dateString;
                out += "\n";
                out += "\n";

                const milestoneIssues: any[] = await this.getAll(`https://gitlab.com/api/v4/projects/${projectId}/milestones/${milestone.id}/issues`);
                const bugs: any[] = [];
                const issues: any[] = [];
                for (const issue of milestoneIssues) {
                    if (issue.labels instanceof Array && issue.labels.indexOf("Bug") !== -1)
                        bugs.push(issue);
                    else
                        issues.push(issue);
                }

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
            console.log("Writing Changelog to ./CHANGELOG.md ...");
            fs.writeFileSync("./CHANGELOG.md", out, { encoding: "UTF-8" });
            resolve();
        });

    }

    private static getAll(url: string): Promise<any[]> {
        return new Promise<any[]>(async (resolve) => {
            let resultObjects: any[] = [];
            if (url.indexOf("?") === -1)
                url += "?";
            else
                url += "&";
            url += "per_page=100&";

            let currentPage: number = 1;
            let response: any;
            do {
                const urlWithPage: string = url + "page=" + currentPage;
                console.log("  -> querying " + urlWithPage);
                response = await this.getResultFromUrl(urlWithPage);
                resultObjects = resultObjects.concat(response.body);
                currentPage++;
            } while (response.headers["x-next-page"] !== undefined && response.headers["x-next-page"] !== "");
            resolve(resultObjects);
        });
    }



    public static getProjectPath(): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            this.git.getRemotes(true, (error: Error, result: any) => {
                const origin = _.find(result, (remote: any) => remote.name === "origin");
                if (origin) {
                    const url: string = origin.refs.fetch.replace(".git", "").replace("git@gitlab.com:", "");
                    resolve(url);
                }
                else
                    reject("Could not find remote 'origin'!");
            });
        });
    }

    private static getResultFromUrl(url: string): Promise<any[]> {
        return new Promise<any[]>(async (resolve) => {
            request.get(url, {
                headers: {
                    "PRIVATE-TOKEN": this.gitlabToken
                },
                json: true,
                resolveWithFullResponse: true
            }).then((response) => {
                resolve(response);
            });
        });
    }
}
