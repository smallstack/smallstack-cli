import * as fs from "fs-extra";
import * as inquirer from "inquirer";
import * as moment from "moment";
import * as request from "request-promise";
import * as GIT from "simple-git";
import * as _ from "underscore";
import { CLICommandOption } from "./CLICommand";

export class ChangelogCommand {

    public static git = GIT();

    public static getHelpSummary(): string {
        return "Creates a changelog based on gitlab issues and tags!";
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

            const projectPath: string = await this.getProjectPath();

            // const mergeRequestBaseUrl: string = `https://gitlab.com/${projectPath}/merge_requests/`;

            // get project
            console.log("Getting project " + projectPath);
            const project: any = await request.get(`https://gitlab.com/api/v4/projects/${projectPath.replace(/\//g, "%2F")}`, {
                headers: {
                    "PRIVATE-TOKEN": gitlabToken
                },
                json: true
            });
            if (!project)
                throw new Error("Could not find project!");
            const projectId: string = project.id;

            // get all tags with dates
            console.log("Getting repository & all tags...");
            // TODO: add proper paging
            const tags: any[] = await request.get(`https://gitlab.com/api/v4/projects/${projectId}/repository/tags?sort=asc&per_page=100`, {
                headers: {
                    "PRIVATE-TOKEN": gitlabToken
                },
                json: true
            });

            // get all milestones
            console.log("Getting & checking milestones...");
            // TODO: add proper paging
            const milestones: any[] = await request.get(`https://gitlab.com/api/v4/projects/${projectId}/milestones?per_page=100`, {
                headers: {
                    "PRIVATE-TOKEN": gitlabToken
                },
                json: true
            });

            // check milestones against tags
            for (const tag of tags) {
                let tagFoundAsMilestone: boolean = false;
                for (const milestone of milestones) {
                    if (milestone.title === tag.name) {
                        tagFoundAsMilestone = true;
                        break;
                    }
                }
                if (!tagFoundAsMilestone) {
                    if (current.parameters["auto-create-milestones"]) {
                        console.log("Creating milestone: " + tag.name);
                        const response: any = await request.post(`https://gitlab.com/api/v4/projects/${projectId}/milestones?title=${tag.name}&due_date=${tag.commit.created_at}`, {
                            headers: {
                                "PRIVATE-TOKEN": gitlabToken
                            },
                            json: true
                        });
                        await request.put(`https://gitlab.com/api/v4/projects/${projectId}/milestones/${response.id}?state_event=close`, {
                            headers: {
                                "PRIVATE-TOKEN": gitlabToken
                            },
                            json: true
                        });
                    } else {
                        reject("Tag not found as milestone : " + tag.name + ", pass --auto-create-milestones to automatically created missing milestones!");
                        return;
                    }
                }
            }


            // get all merge requests with closing dates
            console.log("Getting Merge Requests...");
            // TODO: add proper paging
            const mergeRequests: any[] = await request.get(`https://gitlab.com/api/v4/projects/${projectId}/merge_requests?state=merged&sort=asc&per_page=100`, {
                headers: {
                    "PRIVATE-TOKEN": gitlabToken
                },
                json: true
            });

            // write changelog.md
            let out: string = "";
            let lastTagsDate: number = 0;
            for (const tag of tags) {
                const currentTagDate: number = new Date(tag.commit.created_at).getTime();
                const dateString: string = moment(currentTagDate).format("YYYY-MM-DD");
                out += "# " + tag.name;
                out += "\n";

                out += "Release Date: " + dateString;
                out += "\n";
                out += "### Issues\n";

                for (const mergeRequest of mergeRequests) {
                    if (!mergeRequest.merge_commit_sha) {
                        // console.log("No merge commit found, skipping MR...");
                    } else {
                        // TODO: Use the commit date of the merge_commit_sha, not the
                        const mergeRequestDate: number = new Date(mergeRequest.updated_at).getTime();
                        if (mergeRequestDate >= lastTagsDate && mergeRequestDate <= currentTagDate) {
                            // const closingDateString: string = moment(mergeRequest.updated_at).format("YYYY-MM-DD");
                            out += "* " + mergeRequest.iid + " - " + mergeRequest.title + " (" + moment(mergeRequest.updated_at).format("YYYY-MM-DD") + ")";
                            out += "\n";
                        }
                    }
                }

                out += "\n\n";

                lastTagsDate = currentTagDate;
            }
            fs.writeFileSync("./CHANGELOG.md", out, { encoding: "UTF-8" });
            resolve();
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
}
