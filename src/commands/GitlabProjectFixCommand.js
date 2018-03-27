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
const request = require("request");
const index_1 = require("../../index");
class GitlabProjectFixCommand {
    static getHelpSummary() {
        return "Adds protected branches and other configured stuff to all projects of a gitlab group!";
    }
    static getParameters() {
        return {};
    }
    static execute(current, allCommands) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let gitlabToken = process.env.GITLAB_TOKEN;
            let gitlabGroup = process.env.GITLAB_GROUP;
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
            if (!gitlabGroup) {
                const answers = yield inquirer.prompt([{
                        name: "gitlabGroup",
                        type: "text",
                        message: "Gitlab Group"
                    }]);
                gitlabGroup = answers.gitlabGroup;
            }
            if (!gitlabGroup) {
                reject("No gitlab group defined!");
                return;
            }
            const gitlabService = new index_1.GitlabService({ gitlabToken, gitlabUrl: "https://gitlab.com" });
            const allProjects = yield gitlabService.getAllProjectsForGroup(gitlabGroup);
            // update protected branches
            const protectedBranches = ["develop", "master"];
            for (const project of allProjects) {
                for (const protectedBranch of protectedBranches) {
                    console.log(`  --> protecting branch ${protectedBranch} for project ${project.name} (${project.id})`);
                    yield request.put(`https://gitlab.com/api/v4/projects/${project.id}/repository/branches/${protectedBranch}/protect?developers_can_merge=true&developers_can_push=false`, {
                        headers: {
                            "PRIVATE-TOKEN": gitlabToken
                        },
                        json: true,
                        body: {}
                    });
                }
                console.log(`  --> setting default branch in project ${project.name} to develop`);
                try {
                    yield request.put(`https://gitlab.com/api/v4/projects/${project.id}?default_branch=develop&shared_runners_enabled=false&only_allow_merge_if_pipeline_succeeds=true&only_allow_merge_if_all_discussions_are_resolved=true`, {
                        headers: {
                            "PRIVATE-TOKEN": gitlabToken
                        },
                        json: true
                    });
                }
                catch (error) {
                    console.error("  --> Error: " + error);
                }
            }
        }));
    }
}
exports.GitlabProjectFixCommand = GitlabProjectFixCommand;
