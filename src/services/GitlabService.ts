import * as request from "request-promise";
import * as GIT from "simple-git";
import * as _ from "underscore";

export interface GitlabServiceOptions {
    gitlabToken: string;
    gitlabUrl?: string;
}

export interface GitlabFilters {
    [key: string]: string;
}

export class GitlabService {

    protected cachedProjects: any[] = [];

    protected git = GIT();

    constructor(protected options: GitlabServiceOptions) {
        if (options.gitlabUrl === undefined)
            options.gitlabUrl = "https://gitlab.com";
    }

    public getProjectByPath(projectPath: string): Promise<any> {
        return new Promise<any>(async (resolve) => {
            resolve((await this.getAll(`${this.options.gitlabUrl}/api/v4/projects/${this.encodeProjectPath(projectPath)}`))[0]);
        });
    }

    public encodeProjectPath(projectPath: string): string {
        if (projectPath === undefined)
            throw new Error("projectPath cannot be undefined!");
        if (typeof projectPath === "string")
            return projectPath.replace(/\//g, "%2F");
        else
            return projectPath;
    }

    public getAllProjectsForGroup(groupName: string): Promise<any[]> {
        return new Promise<any[]>(async (resolve) => {
            let groups: any[] = await this.getAll(`${this.options.gitlabUrl}/api/v4/groups?search=${groupName}`);
            if (!groups || groups.length === 0)
                throw new Error("Group not found!");
            if (groups.length > 1)
                throw new Error("More than one group found!");
            const subGroups = await this.getAll(`${this.options.gitlabUrl}/api/v4/groups/${groups[0].id}/subgroups`);
            if (subGroups && subGroups.length > 0)
                groups = groups.concat(subGroups);

            let projects: any[] = [];
            for (const group of groups) {
                const groupId: number = group.id;
                projects = projects.concat(await this.getAll(`${this.options.gitlabUrl}/api/v4/groups/${groupId}/projects?simple=true`));
            }
            this.cachedProjects = this.cachedProjects.concat(projects);
            resolve(projects);
        });
    }

    public getAllTags(projectId: string): Promise<any[]> {
        projectId = this.encodeProjectPath(projectId);
        return this.getAll(`${this.options.gitlabUrl}/api/v4/projects/${projectId}/repository/tags?sort=asc`);
    }

    public getAllMilestones(projectId: string): Promise<any[]> {
        projectId = this.encodeProjectPath(projectId);
        return this.getAll(`${this.options.gitlabUrl}/api/v4/projects/${projectId}/milestones`);

    }

    public getAllMilestoneIssues(projectId: string, milestoneId: string): Promise<any[]> {
        projectId = this.encodeProjectPath(projectId);
        return this.getAll(`${this.options.gitlabUrl}/api/v4/projects/${projectId}/milestones/${milestoneId}/issue`);
    }

    public getAllIssues(projectId: string): Promise<any[]> {
        projectId = this.encodeProjectPath(projectId);
        return this.getAll(`${this.options.gitlabUrl}/api/v4/issues`);
    }

    public getAllProjectIssues(projectId: string, filters?: GitlabFilters): Promise<any[]> {
        let additional: string = "?";
        if (filters) {
            const params = this.filtersToParameters(filters);
            if (params !== undefined)
                additional += params;
        }
        projectId = this.encodeProjectPath(projectId);
        return this.getAll(`${this.options.gitlabUrl}/api/v4/projects/${projectId}/issues${additional}`);
    }

    public getAllGroupIssues(groupId: string, filters?: GitlabFilters): Promise<any[]> {
        let additional: string = "?";
        if (filters) {
            const params = this.filtersToParameters(filters);
            if (params !== undefined)
                additional += params;
        }
        return this.getAll(`${this.options.gitlabUrl}/api/v4/groups/${groupId}/issues${additional}`);
    }

    public getMergeRequests(projectId: string, state?: string): Promise<any[]> {
        projectId = this.encodeProjectPath(projectId);
        let additional: string = "";
        if (state)
            additional = "?state=" + state;
        return this.getAll(`${this.options.gitlabUrl}/api/v4/projects/${projectId}/merge_requests${additional}`);
    }

    public getProjectPathFromLocalGitRepo(): Promise<string> {
        return new Promise<string>(async (resolve, reject) => {
            this.git.getRemotes(true, (error: Error, result: any) => {
                const origin = _.find(result, (remote: any) => remote.name === "origin");
                if (origin) {
                    const url: string = origin.refs.fetch.replace(".git", "").replace("git@gitlab.com:", "");
                    resolve(url);
                }
                else
                    reject("Could not find remote 'origin'!");
            });
        });
    }

    public getAll(url: string): Promise<any[]> {
        return new Promise<any[]>(async (resolve, reject) => {
            try {
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
            } catch (e) {
                reject(e);
            }
        });
    }

    private filtersToParameters(filters: GitlabFilters): string {
        let params: string;
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

    private getResultFromUrl(url: string): Promise<any[]> {
        return request.get(url, {
            headers: {
                "PRIVATE-TOKEN": this.options.gitlabToken
            },
            json: true,
            resolveWithFullResponse: true
        });
    }
}
