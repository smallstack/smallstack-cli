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
const fs = require("fs-extra");
const inquirer = require("inquirer");
const moment = require("moment");
const request = require("request-promise");
const semver = require("semver");
const GIT = require("simple-git");
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
            if (!this.gitlabToken) {
                const answers = yield inquirer.prompt([{
                        name: "gitlabToken",
                        type: "password",
                        message: "Gitlab Token"
                    }]);
                this.gitlabToken = answers.gitlabToken;
            }
            if (!this.gitlabToken)
                throw new Error("No gitlab token defined!");
            const projectPath = yield this.getProjectPath();
            const issueBaseUrl = `https://gitlab.com/${projectPath}/issues/`;
            // get project
            console.log("Getting Project " + projectPath);
            const project = yield request.get(`https://gitlab.com/api/v4/projects/${projectPath.replace(/\//g, "%2F")}`, {
                headers: {
                    "PRIVATE-TOKEN": this.gitlabToken
                },
                json: true
            });
            if (!project)
                throw new Error("Could not find project!");
            const projectId = project.id;
            console.log("  -> Project ID " + projectId);
            // get all milestones
            console.log("Getting Milestones...");
            const milestones = yield this.getAll(`https://gitlab.com/api/v4/projects/${projectId}/milestones`);
            console.log("  -> " + milestones.length + " Milestones found!");
            milestones.sort((milestoneA, milestoneB) => {
                if (semver.gt(milestoneA.title, milestoneB.title))
                    return -1;
                else
                    return 1;
            });
            // write changelog.md
            console.log("Computing Changelog...");
            let out = "";
            for (const milestone of milestones) {
                const dateString = moment(milestone.due_date).format("YYYY-MM-DD");
                out += "\n";
                out += "# " + milestone.title;
                out += "\n";
                out += "Release Date: " + dateString;
                out += "\n";
                out += "\n";
                const milestoneIssues = yield this.getAll(`https://gitlab.com/api/v4/projects/${projectId}/milestones/${milestone.id}/issues`);
                const bugs = [];
                const issues = [];
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
    static getProjectPath() {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            this.git.getRemotes(true, (error, result) => {
                const origin = _.find(result, (remote) => remote.name === "origin");
                if (origin) {
                    const url = origin.refs.fetch.replace(".git", "").replace("git@gitlab.com:", "");
                    resolve(url);
                }
                else
                    reject("Could not find remote 'origin'!");
            });
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
ChangelogCommand.git = GIT();
exports.ChangelogCommand = ChangelogCommand;
