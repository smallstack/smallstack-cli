export interface GitlabServiceOptions {
    gitlabToken: string;
    gitlabUrl?: string;
}
export declare class GitlabService {
    protected options: GitlabServiceOptions;
    protected cachedProjects: any[];
    constructor(options: GitlabServiceOptions);
    getProjectByPath(projectPath: string): Promise<any>;
    getAllProjectsForGroup(groupName: string): Promise<any[]>;
    getAllTags(projectId: string): Promise<any[]>;
    getAllMilestones(projectId: string): Promise<any[]>;
    getAllMilestoneIssues(projectId: string, milestoneId: string): Promise<any[]>;
    getMergeRequests(projectId: string, state?: string): Promise<any[]>;
    private getAll(url);
    private getResultFromUrl(url);
}
