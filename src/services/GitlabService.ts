import * as request from "request-promise";

export interface GitlabServiceOptions {
    gitlabToken: string;
    gitlabUrl?: string;
}

export type GitlabFilters = { [key: string]: string };

export class GitlabService {

    protected cachedProjects: any[] = [];

    constructor(protected options: GitlabServiceOptions) {
        if (options.gitlabUrl === undefined)
            options.gitlabUrl = "https://gitlab.com";
    }


    public getProjectByPath(projectPath: string): Promise<any> {
        return new Promise<any>(async (resolve, reject) => {
            console.log("Getting project " + projectPath);
            const project: any = await request.get(`${this.options.gitlabUrl}/api/v4/projects/${this.encodeProjectPath(projectPath).replace(/\//g, "%2F")}`, {
                headers: {
                    "PRIVATE-TOKEN": this.options.gitlabToken
                },
                json: true
            });
            if (!project)
                reject("Could not find project!");
            else
                reject(project);
        })
    }

    public encodeProjectPath(projectPath: string): string {
        return projectPath.replace(/\//g, "%2F");
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
            for (let group of groups) {
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
        if (filters)
            additional += this.filtersToParameters(filters);
        projectId = this.encodeProjectPath(projectId);
        return this.getAll(`${this.options.gitlabUrl}/api/v4/projects/${projectId}/issues${additional}`);
    }

    public getAllGroupIssues(groupId: string): Promise<any[]> {
        return this.getAll(`${this.options.gitlabUrl}/api/v4/groups/${groupId}/issues`);
    }

    public getMergeRequests(projectId: string, state?: string): Promise<any[]> {
        projectId = this.encodeProjectPath(projectId);
        let additional: string = "";
        if (state)
            additional = "?state=" + state;
        return this.getAll(`${this.options.gitlabUrl}/api/v4/projects/${projectId}/merge_requests${additional}`);
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
            if (params !== undefined)
                params += "&";
            params += filter + "=" + filters[filter];
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
