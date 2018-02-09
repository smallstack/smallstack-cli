// tslint:disable:member-ordering
import * as inquirer from "inquirer";
import * as moment from "moment";
import * as request from "request-promise";
import * as _ from "underscore";
import { GitlabService } from "../../index";
import { CLICommandOption } from "./CLICommand";

export class GitlabBoardFixCommand {

    public static getHelpSummary(): string {
        return "Creates a changelog based on gitlab issues and tags!";
    }

    public static getParameters(): { [parameterKey: string]: string } {
        return {
            "auto-create-milestones": "Automatically creates Gitlab Milestones for all Git Tags",
            "fix-missing-milestones": "Adds missing milestones to issues based on when their MR was merged"
        };
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
            if (!gitlabToken) {
                reject("No gitlab token defined!");
                return;
            }

            const gitlabService: GitlabService = new GitlabService({ gitlabToken, gitlabUrl: "https://gitlab.com" });

            const projectPath: string = await gitlabService.getProjectPathFromLocalGitRepo();

            // variables
            // const mergeRequestBaseUrl: string = "https://gitlab.com/smallstack/project-sata-loyalty/merge_requests/";

            // get project
            console.log("Getting project " + projectPath);
            const project: any = await gitlabService.getProjectByPath(projectPath);
            if (!project) {
                reject("Could not find project!");
                return;
            }
            const projectId: string = project.id;

            // get all tags
            console.log("Getting repository & all tags...");
            const tags: any[] = await gitlabService.getAllTags(projectId);

            // get all milestones
            console.log("Checking milestones...");
            let milestoneUpdateNeeded: boolean = false;
            let milestones: any[] = await gitlabService.getAllMilestones(projectId);

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
                            milestoneUpdateNeeded = true;
                            let options: string = "";
                            // only set startDate if different to dueDate, since "Due date must be greater than start date"
                            if (startDate && startDate !== dueDate)
                                options += `start_date=${startDate}&`;
                            options += `due_date=${dueDate}&state_event=close`;
                            console.log("  --> correcting start/end date of milestone " + milestone.title + ", " + options);
                            await request.put(`https://gitlab.com/api/v4/projects/${projectId}/milestones/${milestone.id}?${options}`, {
                                headers: {
                                    "PRIVATE-TOKEN": gitlabToken
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
                        milestoneUpdateNeeded = true;
                    } else {
                        reject("Tag not found as milestone : " + tag.name + ", pass --auto-create-milestones to automatically created missing milestones!");
                        return;
                    }
                }
                lastTag = tag;
            }

            if (milestoneUpdateNeeded)
                milestones = await gitlabService.getAll(`https://gitlab.com/api/v4/projects/${projectId}/milestones`);

            // check closed issues without milestone
            console.log("Checking closed issues without milestone...");
            const issues: any[] = await gitlabService.getAll(`https://gitlab.com/api/v4/projects/${projectId}/issues?state=closed`);
            let foundIssuesWithoutMilestones: boolean = false;
            for (const issue of issues) {
                // if closed and no milestone
                if (issue.milestone === undefined || issue.milestone === null) {
                    if (current.parameters["fix-missing-milestones"]) {
                        console.log("  -> Issue #" + issue.iid);
                        console.log("  -> checking closed_by merge requests...");
                        let fixedByMR: boolean = false;
                        const mergeRequests: any[] = await gitlabService.getAll(`https://gitlab.com/api/v4/projects/${projectId}/issues/${issue.iid}/closed_by`);
                        for (const mergeRequest of mergeRequests) {
                            if (mergeRequest.state === "opened") {
                                reject(`The issue #${issue.iid} is closed but the MR is still open, see ${issue.web_url}`);
                                return;
                            }
                            if (mergeRequest.merge_commit_sha) {
                                // TODO: make this more efficient, see https://gitlab.com/gitlab-org/gitlab-ce/issues/27214
                                const mergeCommits: any[] = await gitlabService.getAll(`https://gitlab.com/api/v4/projects/${projectId}/repository/commits/${mergeRequest.merge_commit_sha}`);
                                const mergeDate: Date = new Date(mergeCommits[0].committed_date);
                                const mergeDateTime: number = mergeDate.getTime();
                                let mergeMilestone: string;
                                for (const tag of tags) {
                                    const tagTime: number = new Date(tag.commit.created_at).getTime();
                                    if (mergeDateTime <= tagTime) {
                                        mergeMilestone = tag.name;
                                        break;
                                    }
                                }
                                if (mergeMilestone) {
                                    const milestone: any = _.find(milestones, (ms: any) => ms.title === mergeMilestone);
                                    if (!milestone) {
                                        reject("Could not find milestone for tag name: " + mergeMilestone);
                                        return;
                                    }

                                    // update milestone
                                    await request.put(`https://gitlab.com/api/v4/projects/${projectId}/merge_requests/${mergeRequest.iid}?milestone_id=${milestone.id}`, {
                                        headers: {
                                            "PRIVATE-TOKEN": gitlabToken
                                        },
                                        json: true
                                    });

                                    // update issue
                                    await request.put(`https://gitlab.com/api/v4/projects/${projectId}/issues/${issue.iid}?milestone_id=${milestone.id}`, {
                                        headers: {
                                            "PRIVATE-TOKEN": gitlabToken
                                        },
                                        json: true
                                    });
                                    fixedByMR = true;

                                } else
                                    console.log("  -> Error: Could not find a milestone for issue #" + issue.iid);
                            }
                            else
                                console.log("  -> Error: !" + mergeRequest.iid + " MergeRequest.merge_commit_sha is not set!");
                        }

                        if (!fixedByMR) {
                            console.log("  -> Could not find MergeRequest for issue #" + issue.iid + ", setting via closed_at date!");
                            const tag: any = this.getTagForDate(tags, issue.closed_at);
                            if (!tag) {
                                console.log("  -> Could not find a tag by date for issue.closed_at " + issue.closed_at + ", it might not be released yet!");
                            } else {
                                console.log("  -> Tag " + tag.name + " seems to be the next created tag after issue got closed!");
                                const milestone: any = _.find(milestones, (m: any) => m.title === tag.name);
                                if (!milestone) {
                                    reject("Could not find milestone for tag: " + tag.name);
                                    return;
                                }
                                // update issue
                                await request.put(`https://gitlab.com/api/v4/projects/${projectId}/issues/${issue.iid}?milestone_id=${milestone.id}`, {
                                    headers: {
                                        "PRIVATE-TOKEN": gitlabToken
                                    },
                                    json: true
                                });
                            }
                        }
                    } else {
                        foundIssuesWithoutMilestones = true;
                        console.error(`  -> #${issue.iid} is closed but no milestone set, see ${issue.web_url}`);
                    }
                }
            }
            if (foundIssuesWithoutMilestones) {
                reject(`Found closed issues without milestones, aborting! Automatically fix these issues with --fix-missing-milestones`);
                return;
            }

            console.log("Checking for related MRs still being open... ");
            for (const issue of issues) {
                // check related MRs still being open
                const mergeRequests: any[] = await gitlabService.getAll(`https://gitlab.com/api/v4/projects/${projectId}/issues/${issue.iid}/closed_by`);
                for (const mergeRequest of mergeRequests) {
                    if (mergeRequest.state === "opened") {
                        reject(`The issue #${issue.iid} is closed but the MR is still open, see ${issue.web_url}`);
                        return;
                    }
                }
            }
            resolve();
        });

    }

    private static getTagForDate(tags: any[], date: any) {
        const sortedTags = tags.sort((tagA, tagB) => {
            if (tagA.commit.createdAt < tagB.commit.createdAt)
                return 1;
            else
                return -1;
        });
        for (const tag of sortedTags) {
            if (date < tag.commit.created_at)
                return tag;
        }
    }
}
