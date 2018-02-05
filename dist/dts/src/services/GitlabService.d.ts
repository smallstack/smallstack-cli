export declare class GitlabService {
    private gitlabToken;
    constructor(gitlabToken: string);
    getProjectByPath(projectPath: string): Promise<any>;
    getAllProjectsForGroup(groupName: string): Promise<any[]>;
    getAllTags(projectId: string): Promise<any[]>;
    getAllMilestones(projectId: string): Promise<any[]>;
    getAllMilestoneIssues(projectId: string, milestoneId: string): Promise<any[]>;
    private getAll(url);
    private getResultFromUrl(url);
}
