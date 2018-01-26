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
const moment = require("moment");
const request = require("request-promise");
const _ = require("underscore");
class ChangelogCommand {
    static getHelpSummary() {
        return "Creates a changelog based on gitlab issues and tags!";
    }
    static getParameters() {
        return {
            "--auto-create-milestones": "Automatically creates Gitlab Milestones for all Git Tags",
            "--fix-missing-milestones": "Adds missing milestones to issues based on when their MR was merged"
        };
    }
    static execute(current, allCommands) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            this.gitlabToken = process.env.GITLAB_TOKEN;
            // TODO: use env variables for this
            const projectPath = "smallstack/project-sata-loyalty";
            // variables
            // const mergeRequestBaseUrl: string = "https://gitlab.com/smallstack/project-sata-loyalty/merge_requests/";
            // get project
            console.log("Getting project " + projectPath);
            const project = yield request.get(`https://gitlab.com/api/v4/projects/${projectPath.replace(/\//g, "%2F")}`, {
                headers: {
                    "PRIVATE-TOKEN": this.gitlabToken
                },
                json: true
            });
            if (!project)
                throw new Error("Could not find project!");
            const projectId = project.id;
            // get all tags
            console.log("Getting repository & all tags...");
            const tags = yield this.getAll(`https://gitlab.com/api/v4/projects/${projectId}/repository/tags?sort=asc`);
            // get all milestones
            console.log("Checking milestones...");
            let milestoneUpdateNeeded = false;
            let milestones = yield this.getAll(`https://gitlab.com/api/v4/projects/${projectId}/milestones`);
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
                        const response = yield request.post(`https://gitlab.com/api/v4/projects/${projectId}/milestones?title=${tag.name}&due_date=${tag.commit.created_at}`, {
                            headers: {
                                "PRIVATE-TOKEN": this.gitlabToken
                            },
                            json: true
                        });
                        yield request.put(`https://gitlab.com/api/v4/projects/${projectId}/milestones/${response.id}?state_event=close`, {
                            headers: {
                                "PRIVATE-TOKEN": this.gitlabToken
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
                milestones = yield this.getAll(`https://gitlab.com/api/v4/projects/${projectId}/milestones`);
            // check closed issues without milestone
            console.log("Checking closed issues without milestone...");
            const issues = yield this.getAll(`https://gitlab.com/api/v4/projects/${projectId}/issues?state=closed`);
            let foundIssuesWithoutMilestones = false;
            for (const issue of issues) {
                // if closed and no milestone
                if (issue.milestone === undefined || issue.milestone === null) {
                    if (current.parameters["fix-missing-milestones"]) {
                        const mergeRequests = yield this.getAll(`https://gitlab.com/api/v4/projects/${projectId}/issues/${issue.iid}/closed_by`);
                        for (const mergeRequest of mergeRequests) {
                            if (mergeRequest.state === "opened") {
                                reject(`The issue #${issue.iid} is closed but the MR is still open, see ${issue.web_url}`);
                                return;
                            }
                            if (mergeRequest.merge_commit_sha) {
                                // TODO: make this more efficient, see https://gitlab.com/gitlab-org/gitlab-ce/issues/27214
                                const mergeCommits = yield this.getAll(`https://gitlab.com/api/v4/projects/${projectId}/repository/commits/${mergeRequest.merge_commit_sha}`);
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
                                    if (!milestone)
                                        throw new Error("Could not find milestone for tag name: " + mergeMilestone);
                                    // update milestone
                                    yield request.put(`https://gitlab.com/api/v4/projects/${projectId}/merge_requests/${mergeRequest.iid}?milestone_id=${milestone.id}`, {
                                        headers: {
                                            "PRIVATE-TOKEN": this.gitlabToken
                                        },
                                        json: true
                                    });
                                    // update issue
                                    yield request.put(`https://gitlab.com/api/v4/projects/${projectId}/issues/${issue.iid}?milestone_id=${milestone.id}`, {
                                        headers: {
                                            "PRIVATE-TOKEN": this.gitlabToken
                                        },
                                        json: true
                                    });
                                }
                                else
                                    console.log("  --> Error: Could not find a milestone for issue #" + issue.iid);
                            }
                            else
                                console.log("  --> Error: MergeRequest.merge_commit_sha is not set!");
                        }
                    }
                    else {
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
                const mergeRequests = yield this.getAll(`https://gitlab.com/api/v4/projects/${projectId}/issues/${issue.iid}/closed_by`);
                for (const mergeRequest of mergeRequests) {
                    if (mergeRequest.state === "opened") {
                        reject(`The issue #${issue.iid} is closed but the MR is still open, see ${issue.web_url}`);
                        return;
                    }
                }
            }
            // get all milestones again
            milestones = yield this.getAll(`https://gitlab.com/api/v4/projects/${projectId}/milestones`);
            // write changelog.md
            let out = "";
            for (const milestone of milestones) {
                const dateString = moment(milestone.due_date).format("YYYY-MM-DD");
                out += "\n";
                out += "#" + milestone.name;
                out += "\n";
                out += "Release Date: " + dateString;
                out += "\n";
                out += "Merge Requests";
                out += "\n";
                const milestoneIssues = yield this.getAll(`https://gitlab.com/api/v4/projects/${projectId}/milestones/${milestone.id}/issue`);
                for (let issue of milestoneIssues) {
                    out += "* " + issue.iid + " - " + issue.title + " (" + moment(issue.updated_at).format("YYYY-MM-DD") + ")";
                    out += "\n";
                }
                out += "\n";
            }
            console.log(out);
            resolve();
        }));
    }
    static getAll(url) {
        return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            let resultObjects = [];
            if (url.indexOf("?") === -1)
                url += "?";
            else
                url += "&";
            url += "per_page=100&";
            let currentPage = 1;
            let response;
            do {
                const urlWithPage = url + "page=" + currentPage;
                console.log("  -> querying " + urlWithPage);
                response = yield this.getResultFromUrl(urlWithPage);
                resultObjects = resultObjects.concat(response.body);
                currentPage++;
            } while (response.headers["x-next-page"] !== undefined && response.headers["x-next-page"] !== "");
            resolve(resultObjects);
        }));
    }
    static getResultFromUrl(url) {
        return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            request.get(url, {
                headers: {
                    "PRIVATE-TOKEN": this.gitlabToken
                },
                json: true,
                resolveWithFullResponse: true
            }).then((response) => {
                resolve(response);
            });
        }));
    }
}
exports.ChangelogCommand = ChangelogCommand;
