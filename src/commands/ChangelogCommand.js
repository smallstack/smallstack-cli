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
class ChangelogCommand {
    static getHelpSummary() {
        return "Creates a changelog based on gitlab issues and tags!";
    }
    static getParameters() {
        return {};
    }
    static execute(current, allCommands) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            // TODO: use env variables for this
            const gitlabToken = "";
            const projectPath = "smallstack/project-sata-loyalty";
            // variables
            const mergeRequestBaseUrl = "https://gitlab.com/smallstack/project-sata-loyalty/merge_requests/";
            // get project
            console.log("Getting project " + projectPath);
            const project = yield request.get(`https://gitlab.com/api/v4/projects/${projectPath.replace(/\//g, "%2F")}`, {
                headers: {
                    "PRIVATE-TOKEN": gitlabToken
                },
                json: true
            });
            if (!project)
                throw new Error("Could not find project!");
            const projectId = project.id;
            // get all tags with dates
            console.log("Getting repository & all tags...");
            // TODO: add proper paging
            const tags = yield request.get(`https://gitlab.com/api/v4/projects/${projectId}/repository/tags?sort=asc&per_page=100`, {
                headers: {
                    "PRIVATE-TOKEN": gitlabToken
                },
                json: true
            });
            // get all milestones
            console.log("Getting & checking milestones...");
            // TODO: add proper paging
            const milestones = yield request.get(`https://gitlab.com/api/v4/projects/${projectId}/milestones?per_page=100`, {
                headers: {
                    "PRIVATE-TOKEN": gitlabToken
                },
                json: true
            });
            // check milestones against tags
            for (const tag of tags) {
                let tagFoundAsMilestone = false;
                for (const milestone of milestones) {
                    if (milestone.title === tag.name) {
                        tagFoundAsMilestone = true;
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
                    }
                    else {
                        reject("Tag not found as milestone : " + tag.name + ", pass --auto-create-milestones to automatically created missing milestones!");
                        return;
                    }
                }
            }
            // get all merge requests with closing dates
            console.log("Getting Merge Requests...");
            // TODO: add proper paging
            const mergeRequests = yield request.get(`https://gitlab.com/api/v4/projects/${projectId}/merge_requests?state=merged&sort=asc&per_page=100`, {
                headers: {
                    "PRIVATE-TOKEN": gitlabToken
                },
                json: true
            });
            // write changelog.md
            let out = "";
            let lastTagsDate = 0;
            for (const tag of tags) {
                const currentTagDate = new Date(tag.commit.created_at).getTime();
                const dateString = moment(currentTagDate).format("YYYY-MM-DD");
                out += "#" + tag.name;
                out += "\n";
                out += "Release Date: " + dateString;
                out += "\n";
                out += "Merge Requests";
                for (const mergeRequest of mergeRequests) {
                    if (!mergeRequest.merge_commit_sha) {
                        // console.log("No merge commit found, skipping MR...");
                    }
                    else {
                        // TODO: Use the commit date of the merge_commit_sha, not the
                        const mergeRequestDate = new Date(mergeRequest.updated_at).getTime();
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
        }));
    }
}
exports.ChangelogCommand = ChangelogCommand;
