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
const request = require("request-promise");
class GitlabService {
    constructor(gitlabToken) {
        this.gitlabToken = gitlabToken;
    }
    getProjectByPath(projectPath) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            console.log("Getting project " + projectPath);
            const project = yield request.get(`https://gitlab.com/api/v4/projects/${projectPath.replace(/\//g, "%2F")}`, {
                headers: {
                    "PRIVATE-TOKEN": this.gitlabToken
                },
                json: true
            });
            if (!project)
                reject("Could not find project!");
            else
                reject(project);
        }));
    }
    getAllProjectsForGroup(groupName) {
        return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            let groups = yield this.getAll("https://gitlab.com/api/v4/groups?search=" + groupName);
            if (!groups || groups.length === 0)
                throw new Error("Group not found!");
            if (groups.length > 1)
                throw new Error("More than one group found!");
            const subGroups = yield this.getAll(`https://gitlab.com/api/v4/groups/${groups[0].id}/subgroups`);
            if (subGroups && subGroups.length > 0)
                groups = groups.concat(subGroups);
            let projects = [];
            for (let group of groups) {
                const groupId = group.id;
                projects = projects.concat(yield this.getAll("https://gitlab.com/api/v4/groups/" + groupId + "/projects?simple=true&per_page=100"));
            }
            resolve(projects);
        }));
    }
    getAllTags(projectId) {
        return this.getAll(`https://gitlab.com/api/v4/projects/${projectId}/repository/tags?sort=asc`);
    }
    getAllMilestones(projectId) {
        return this.getAll(`https://gitlab.com/api/v4/projects/${projectId}/milestones`);
    }
    getAllMilestoneIssues(projectId, milestoneId) {
        return this.getAll(`https://gitlab.com/api/v4/projects/${projectId}/milestones/${milestoneId}/issue`);
    }
    getAll(url) {
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
    getResultFromUrl(url) {
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
exports.GitlabService = GitlabService;
