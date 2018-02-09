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
const GitlabService_1 = require("../services/GitlabService");
class ChangelogCommand {
    static getHelpSummary() {
        return "Creates a changelog based on gitlab milestones!";
    }
    static getParameters() {
        return {};
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
            if (!gitlabToken)
                throw new Error("No gitlab token defined!");
            const gitlabService = new GitlabService_1.GitlabService({ gitlabToken, gitlabUrl: "https://gitlab.com" });
            const projectPath = yield gitlabService.getProjectPathFromLocalGitRepo();
            const issueBaseUrl = `https://gitlab.com/${projectPath}/issues/`;
            // get project
            console.log("Getting Project " + projectPath);
            const project = yield request.get(`https://gitlab.com/api/v4/projects/${projectPath.replace(/\//g, "%2F")}`, {
                headers: {
                    "PRIVATE-TOKEN": gitlabToken
                },
                json: true
            });
            if (!project)
                throw new Error("Could not find project!");
            const projectId = project.id;
            console.log("  -> Project ID " + projectId);
            // get all milestones
            console.log("Getting Milestones...");
            let milestones = yield gitlabService.getAll(`https://gitlab.com/api/v4/projects/${projectId}/milestones?state=closed`);
            console.log("  -> " + milestones.length + " Milestones found!");
            milestones = milestones.sort((milestoneA, milestoneB) => {
                if (semver.gt(milestoneA.title, milestoneB.title))
                    return -1;
                else
                    return 1;
            });
            // write changelog.md
            console.log("Computing Changelog...");
            let out = "";
            for (const milestone of milestones) {
                const milestoneIssues = yield gitlabService.getAll(`https://gitlab.com/api/v4/projects/${projectId}/milestones/${milestone.id}/issues`);
                if (milestoneIssues.length > 0) {
                    const bugs = [];
                    const issues = [];
                    for (const issue of milestoneIssues) {
                        if (issue.labels instanceof Array && issue.labels.indexOf("Bug") !== -1)
                            bugs.push(issue);
                        else
                            issues.push(issue);
                    }
                    const dateString = moment(milestone.due_date).format("YYYY-MM-DD");
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
        }));
    }
}
exports.ChangelogCommand = ChangelogCommand;
