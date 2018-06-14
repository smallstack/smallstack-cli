export interface GitlabServiceOptions {
    gitlabToken: string;
    gitlabUrl?: string;
}
export interface GitlabFilters {
    [key: string]: string;
}
export declare class GitlabService {
    protected options: GitlabServiceOptions;
    protected cachedProjects: any[];
    protected git: any;
    constructor(options: GitlabServiceOptions);
    getProjectByPath(projectPath: string): Promise<any>;
    encodeProjectPath(projectPath: string): string;
    getAllProjectsForGroup(groupName: string): Promise<any[]>;
    getAllTags(projectId: string): Promise<any[]>;
    getAllMilestones(projectId: string): Promise<any[]>;
    getAllMilestoneIssues(projectId: string, milestoneId: string): Promise<any[]>;
    getAllIssues(projectId: string): Promise<any[]>;
    getAllProjectIssues(projectId: string, filters?: GitlabFilters): Promise<any[]>;
    getAllGroupIssues(groupId: string, filters?: GitlabFilters): Promise<any[]>;
    getMergeRequests(projectId: string, state?: string): Promise<any[]>;
    getProjectPathFromLocalGitRepo(): Promise<string>;
    getAll(url: string): Promise<any[]>;
    private filtersToParameters(filters);
    private getResultFromUrl(url);
}
