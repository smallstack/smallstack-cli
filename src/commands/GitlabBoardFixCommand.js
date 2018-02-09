"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:member-ordering
const inquirer = require("inquirer");
const moment = require("moment");
const request = require("request-promise");
const _ = require("underscore");
const index_1 = require("../../index");
class GitlabBoardFixCommand {
    static getHelpSummary() {
        return "Creates a changelog based on gitlab issues and tags!";
    }
    static getParameters() {
        return {
            "auto-create-milestones": "Automatically creates Gitlab Milestones for all Git Tags",
            "fix-missing-milestones": "Adds missing milestones to issues based on when their MR was merged"
        };
    }
    static execute(current, allCommands) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let gitlabToken = process.env.GITLAB_TOKEN;
            if (!gitlabToken) {
                const answers = yield inquirer.prompt([{
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
            const gitlabService = new index_1.GitlabService({ gitlabToken, gitlabUrl: "https://gitlab.com" });
            const projectPath = yield gitlabService.getProjectPathFromLocalGitRepo();
            // variables
            // const mergeRequestBaseUrl: string = "https://gitlab.com/smallstack/project-sata-loyalty/merge_requests/";
            // get project
            console.log("Getting project " + projectPath);
            const project = yield gitlabService.getProjectByPath(projectPath);
            if (!project) {
                reject("Could not find project!");
                return;
            }
            const projectId = project.id;
            // get all tags
            console.log("Getting repository & all tags...");
            const tags = yield gitlabService.getAllTags(projectId);
            // get all milestones
            console.log("Checking milestones...");
            let milestoneUpdateNeeded = false;
            let milestones = yield gitlabService.getAllMilestones(projectId);
            // check milestones against tags
            let lastTag;
            for (const tag of tags) {
                let tagFoundAsMilestone = false;
                for (const milestone of milestones) {
                    if (milestone.title === tag.name) {
                        tagFoundAsMilestone = true;
                        // correct start/end date
                        const dueDate = moment(tag.commit.created_at).format("YYYY-MM-DD");
                        let startDate;
                        if (lastTag)
                            startDate = moment(lastTag.commit.created_at).format("YYYY-MM-DD");
                        if (milestone.due_date !== dueDate || (startDate && startDate !== dueDate && milestone.start_date !== startDate)) {
                            milestoneUpdateNeeded = true;
                            let options = "";
                            // only set startDate if different to dueDate, since "Due date must be greater than start date"
                            if (startDate && startDate !== dueDate)
                                options += `start_date=${startDate}&`;
                            options += `due_date=${dueDate}&state_event=close`;
                            console.log("  --> correcting start/end date of milestone " + milestone.title + ", " + options);
                            yield request.put(`https://gitlab.com/api/v4/projects/${projectId}/milestones/${milestone.id}?${options}`, {
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
                        const response = yield request.post(`https://gitlab.com/api/v4/projects/${projectId}/milestones?title=${tag.name}&due_date=${tag.commit.created_at}`, {
                            headers: {
                                "PRIVATE-TOKEN": gitlabToken
                            },
                            json: true
                        });
                        yield request.put(`https://gitlab.com/api/v4/projects/${projectId}/milestones/${response.id}?state_event=close`, {
                            headers: {
                                "PRIVATE-TOKEN": gitlabToken
                            },
                            json: true
                        });
                        milestoneUpdateNeeded = true;
                    }
                    else {
                        reject("Tag not found as milestone : " + tag.name + ", pass --auto-create-milestones to automatically created missing milestones!");
                        return;
                    }
                }
                lastTag = tag;
            }
            if (milestoneUpdateNeeded)
                milestones = yield gitlabService.getAll(`https://gitlab.com/api/v4/projects/${projectId}/milestones`);
            // check closed issues without milestone
            console.log("Checking closed issues without milestone...");
            const issues = yield gitlabService.getAll(`https://gitlab.com/api/v4/projects/${projectId}/issues?state=closed`);
            let foundIssuesWithoutMilestones = false;
            for (const issue of issues) {
                // if closed and no milestone
                if (issue.milestone === undefined || issue.milestone === null) {
                    if (current.parameters["fix-missing-milestones"]) {
                        console.log("  -> Issue #" + issue.iid);
                        console.log("  -> checking closed_by merge requests...");
                        let fixedByMR = false;
                        const mergeRequests = yield gitlabService.getAll(`https://gitlab.com/api/v4/projects/${projectId}/issues/${issue.iid}/closed_by`);
                        for (const mergeRequest of mergeRequests) {
                            if (mergeRequest.state === "opened") {
                                reject(`The issue #${issue.iid} is closed but the MR is still open, see ${issue.web_url}`);
                                return;
                            }
                            if (mergeRequest.merge_commit_sha) {
                                // TODO: make this more efficient, see https://gitlab.com/gitlab-org/gitlab-ce/issues/27214
                                const mergeCommits = yield gitlabService.getAll(`https://gitlab.com/api/v4/projects/${projectId}/repository/commits/${mergeRequest.merge_commit_sha}`);
                                const mergeDate = new Date(mergeCommits[0].committed_date);
                                const mergeDateTime = mergeDate.getTime();
                                let mergeMilestone;
                                for (const tag of tags) {
                                    const tagTime = new Date(tag.commit.created_at).getTime();
                                    if (mergeDateTime <= tagTime) {
                                        mergeMilestone = tag.name;
                                        break;
                                    }
                                }
                                if (mergeMilestone) {
                                    const milestone = _.find(milestones, (ms) => ms.title === mergeMilestone);
                                    if (!milestone) {
                                        reject("Could not find milestone for tag name: " + mergeMilestone);
                                        return;
                                    }
                                    // update milestone
                                    yield request.put(`https://gitlab.com/api/v4/projects/${projectId}/merge_requests/${mergeRequest.iid}?milestone_id=${milestone.id}`, {
                                        headers: {
                                            "PRIVATE-TOKEN": gitlabToken
                                        },
                                        json: true
                                    });
                                    // update issue
                                    yield request.put(`https://gitlab.com/api/v4/projects/${projectId}/issues/${issue.iid}?milestone_id=${milestone.id}`, {
                                        headers: {
                                            "PRIVATE-TOKEN": gitlabToken
                                        },
                                        json: true
                                    });
                                    fixedByMR = true;
                                }
                                else
                                    console.log("  -> Error: Could not find a milestone for issue #" + issue.iid);
                            }
                            else
                                console.log("  -> Error: !" + mergeRequest.iid + " MergeRequest.merge_commit_sha is not set!");
                        }
                        if (!fixedByMR) {
                            console.log("  -> Could not find MergeRequest for issue #" + issue.iid + ", setting via closed_at date!");
                            const tag = this.getTagForDate(tags, issue.closed_at);
                            if (!tag) {
                                console.log("  -> Could not find a tag by date for issue.closed_at " + issue.closed_at + ", it might not be released yet!");
                            }
                            else {
                                console.log("  -> Tag " + tag.name + " seems to be the next created tag after issue got closed!");
                                const milestone = _.find(milestones, (m) => m.title === tag.name);
                                if (!milestone) {
                                    reject("Could not find milestone for tag: " + tag.name);
                                    return;
                                }
                                // update issue
                                yield request.put(`https://gitlab.com/api/v4/projects/${projectId}/issues/${issue.iid}?milestone_id=${milestone.id}`, {
                                    headers: {
                                        "PRIVATE-TOKEN": gitlabToken
                                    },
                                    json: true
                                });
                            }
                        }
                    }
                    else {
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
                const mergeRequests = yield gitlabService.getAll(`https://gitlab.com/api/v4/projects/${projectId}/issues/${issue.iid}/closed_by`);
                for (const mergeRequest of mergeRequests) {
                    if (mergeRequest.state === "opened") {
                        reject(`The issue #${issue.iid} is closed but the MR is still open, see ${issue.web_url}`);
                        return;
                    }
                }
            }
            resolve();
        }));
    }
    static getTagForDate(tags, date) {
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
exports.GitlabBoardFixCommand = GitlabBoardFixCommand;
