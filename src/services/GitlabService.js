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
const GIT = require("simple-git");
const _ = require("underscore");
class GitlabService {
    constructor(options) {
        this.options = options;
        this.cachedProjects = [];
        this.git = GIT();
        if (options.gitlabUrl === undefined)
            options.gitlabUrl = "https://gitlab.com";
    }
    getProjectByPath(projectPath) {
        return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            resolve((yield this.getAll(`${this.options.gitlabUrl}/api/v4/projects/${this.encodeProjectPath(projectPath)}`))[0]);
        }));
    }
    encodeProjectPath(projectPath) {
        if (projectPath === undefined)
            throw new Error("projectPath cannot be undefined!");
        if (typeof projectPath === "string")
            return projectPath.replace(/\//g, "%2F");
        else
            return projectPath;
    }
    getAllProjectsForGroup(groupName) {
        return new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            let groups = yield this.getAll(`${this.options.gitlabUrl}/api/v4/groups?search=${groupName}`);
            if (!groups || groups.length === 0)
                throw new Error("Group not found!");
            if (groups.length > 1)
                throw new Error("More than one group found!");
            const subGroups = yield this.getAll(`${this.options.gitlabUrl}/api/v4/groups/${groups[0].id}/subgroups`);
            if (subGroups && subGroups.length > 0)
                groups = groups.concat(subGroups);
            let projects = [];
            for (const group of groups) {
                const groupId = group.id;
                projects = projects.concat(yield this.getAll(`${this.options.gitlabUrl}/api/v4/groups/${groupId}/projects?simple=true`));
            }
            this.cachedProjects = this.cachedProjects.concat(projects);
            resolve(projects);
        }));
    }
    getAllTags(projectId) {
        projectId = this.encodeProjectPath(projectId);
        return this.getAll(`${this.options.gitlabUrl}/api/v4/projects/${projectId}/repository/tags?sort=asc`);
    }
    getAllMilestones(projectId) {
        projectId = this.encodeProjectPath(projectId);
        return this.getAll(`${this.options.gitlabUrl}/api/v4/projects/${projectId}/milestones`);
    }
    getAllMilestoneIssues(projectId, milestoneId) {
        projectId = this.encodeProjectPath(projectId);
        return this.getAll(`${this.options.gitlabUrl}/api/v4/projects/${projectId}/milestones/${milestoneId}/issue`);
    }
    getAllIssues(projectId) {
        projectId = this.encodeProjectPath(projectId);
        return this.getAll(`${this.options.gitlabUrl}/api/v4/issues`);
    }
    getAllProjectIssues(projectId, filters) {
        let additional = "?";
        if (filters) {
            const params = this.filtersToParameters(filters);
            if (params !== undefined)
                additional += params;
        }
        projectId = this.encodeProjectPath(projectId);
        return this.getAll(`${this.options.gitlabUrl}/api/v4/projects/${projectId}/issues${additional}`);
    }
    getAllGroupIssues(groupId, filters) {
        let additional = "?";
        if (filters) {
            const params = this.filtersToParameters(filters);
            if (params !== undefined)
                additional += params;
        }
        return this.getAll(`${this.options.gitlabUrl}/api/v4/groups/${groupId}/issues${additional}`);
    }
    getMergeRequests(projectId, state) {
        projectId = this.encodeProjectPath(projectId);
        let additional = "";
        if (state)
            additional = "?state=" + state;
        return this.getAll(`${this.options.gitlabUrl}/api/v4/projects/${projectId}/merge_requests${additional}`);
    }
    getProjectPathFromLocalGitRepo() {
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
    getAll(url) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            try {
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
            }
            catch (e) {
                reject(e);
            }
        }));
    }
    filtersToParameters(filters) {
        let params;
        for (const filter in filters) {
            if (filters[filter]) {
                if (params !== undefined)
                    params += "&";
                else
                    params = "";
                params += filter + "=" + filters[filter];
            }
        }
        return params;
    }
    getResultFromUrl(url) {
        return request.get(url, {
            headers: {
                "PRIVATE-TOKEN": this.options.gitlabToken
            },
            json: true,
            resolveWithFullResponse: true
        });
    }
}
exports.GitlabService = GitlabService;
