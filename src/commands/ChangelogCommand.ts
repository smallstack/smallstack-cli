import * as moment from "moment";
import * as request from "request-promise";
import { CLICommandOption } from "./CLICommand";

export class ChangelogCommand {

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

            // TODO: use env variables for this
            const projectPath: string = "smallstack/project-sata-loyalty";

            // variables
            // const mergeRequestBaseUrl: string = "https://gitlab.com/smallstack/project-sata-loyalty/merge_requests/";

            // get project
            console.log("Getting project " + projectPath);
            const project: any = await request.get(`https://gitlab.com/api/v4/projects/${projectPath.replace(/\//g, "%2F")}`, {
                headers: {
                    "PRIVATE-TOKEN": this.gitlabToken
                },
                json: true
            });
            if (!project)
                throw new Error("Could not find project!");
            const projectId: string = project.id;

            // get all tags
            console.log("Getting repository & all tags...");
            const tags: any[] = await this.getAll(`https://gitlab.com/api/v4/projects/${projectId}/repository/tags?sort=asc`);

            // get all milestones
            console.log("Checking milestones...");
            const milestones: any[] = await this.getAll(`https://gitlab.com/api/v4/projects/${projectId}/milestones`);

            // check milestones against tags
            let lastTag: any;
            for (const tag of tags) {
                let tagFoundAsMilestone: boolean = false;
                for (const milestone of milestones) {
                    if (milestone.title === tag.name) {
                        tagFoundAsMilestone = true;

                        // correct start/end date
                        const dueDate: string = moment(tag.commit.created_at).format("YYYY-MM-DD");
                        let startDate: string;
                        if (lastTag)
                            startDate = moment(lastTag.commit.created_at).format("YYYY-MM-DD");

                        if (milestone.due_date !== dueDate || (startDate && startDate !== dueDate && milestone.start_date !== startDate)) {
                            let options: string = "";
                            // only set startDate if different to dueDate, since "Due date must be greater than start date"
                            if (startDate && startDate !== dueDate)
                                options += `start_date=${startDate}&`;
                            options += `due_date=${dueDate}&state_event=close`;
                            console.log("  --> correcting start/end date of milestone " + milestone.title + ", " + options);
                            await request.put(`https://gitlab.com/api/v4/projects/${projectId}/milestones/${milestone.id}?${options}`, {
                                headers: {
                                    "PRIVATE-TOKEN": this.gitlabToken
                                },
                                json: true
                            });
                        }
                        break;
                    }
                }
                if (!tagFoundAsMilestone) {
                    if (current.parameters["auto-create-milestones"]) {
                        console.log("Creating milestone: " + tag.name);
                        const response: any = await request.post(`https://gitlab.com/api/v4/projects/${projectId}/milestones?title=${tag.name}&due_date=${tag.commit.created_at}`, {
                            headers: {
                                "PRIVATE-TOKEN": this.gitlabToken
                            },
                            json: true
                        });
                        await request.put(`https://gitlab.com/api/v4/projects/${projectId}/milestones/${response.id}?state_event=close`, {
                            headers: {
                                "PRIVATE-TOKEN": this.gitlabToken
                            },
                            json: true
                        });
                    } else {
                        reject("Tag not found as milestone : " + tag.name + ", pass --auto-create-milestones to automatically created missing milestones!");
                        return;
                    }
                }
                lastTag = tag;
            }

            // check closed issues without milestone
            console.log("Checking closed issues without milestone...");
            const issues: any[] = await this.getAll(`https://gitlab.com/api/v4/projects/${projectId}/issues?state=closed`);
            let foundIssuesWithoutMilestones: boolean = false;
            for (const issue of issues) {
                // if closed and no milestone
                if (issue.milestone === undefined || issue.milestone === null) {
                    if (current.parameters["fix-missing-milestones"]) {
                        const mergeRequests: any[] = await this.getAll(`https://gitlab.com/api/v4/projects/${projectId}/issues/${issue.iid}/closed_by`)
                        for (const mergeRequest of mergeRequests) {
                            if (mergeRequest.state === "opened") {
                                reject(`The issue #${issue.iid} is closed but the MR is still open, see ${issue.web_url}`);
                                return;
                            }
                            // TODO: make this more efficient, see https://gitlab.com/gitlab-org/gitlab-ce/issues/27214
                            const mergeCommits: any[] = await this.getAll(`https://gitlab.com/api/v4/projects/${projectId}/repository/commits/${mergeRequest.merge_commit_sha}`);
                            const mergeDate: Date = new Date(mergeCommits[0].committed_date);

                            return;
                        }
                    } else {
                        foundIssuesWithoutMilestones = true;
                        console.error(` -> #${issue.iid} is closed but no milestone set, see ${issue.web_url}`);
                    }
                }
            }
            if (foundIssuesWithoutMilestones) {
                reject(`Found closed issues without milestones, aborting! Automatically fix these issues with --fix-missing-milestones`);
                return;
            }

            for (const issue of issues) {
                // check related MRs still being open
                const mergeRequests: any[] = await this.getAll(`https://gitlab.com/api/v4/projects/${projectId}/issues/${issue.iid}/closed_by`)
                for (const mergeRequest of mergeRequests) {
                    if (mergeRequest.state === "opened") {
                        reject(`The issue #${issue.iid} is closed but the MR is still open, see ${issue.web_url}`);
                        return;
                    }
                }
            }
            if (1 === 1)
                return;

            // get all merge requests with closing dates
            console.log("Getting Merge Requests...");
            const mergeRequests: any[] = await this.getAll(`https://gitlab.com/api/v4/projects/${projectId}/merge_requests?state=merged&sort=asc`);

            // write changelog.md
            let out: string = "";
            let lastTagsDate: number = 0;
            for (const tag of tags) {
                const currentTagDate: number = new Date(tag.commit.created_at).getTime();
                const dateString: string = moment(currentTagDate).format("YYYY-MM-DD");
                out += "\n";
                out += "#" + tag.name;
                out += "\n";

                out += "Release Date: " + dateString;
                out += "\n";
                out += "Merge Requests";
                out += "\n";

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

                out += "\n";

                lastTagsDate = currentTagDate;
            }
            console.log(out);





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
