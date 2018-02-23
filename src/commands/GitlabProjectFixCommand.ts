// tslint:disable:member-ordering
import * as inquirer from "inquirer";
import { GitlabService } from "../../index";
import { CLICommandOption } from "./CLICommand";
import * as request from "request";

export class GitlabProjectFixCommand {

    public static getHelpSummary(): string {
        return "Adds protected branches and other configured stuff to all projects of a gitlab group!";
    }

    public static getParameters(): { [parameterKey: string]: string } {
        return {};
    }

    public static execute(current: CLICommandOption, allCommands: CLICommandOption[]): Promise<any> {
        return new Promise<void>(async (resolve, reject) => {

            let gitlabToken: string = process.env.GITLAB_TOKEN;
            let gitlabGroup: string = process.env.GITLAB_GROUP;
            if (!gitlabToken) {
                const answers = await inquirer.prompt([{
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
                const answers = await inquirer.prompt([{
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

            const gitlabService: GitlabService = new GitlabService({ gitlabToken, gitlabUrl: "https://gitlab.com" });

            const allProjects: any[] = await gitlabService.getAllProjectsForGroup(gitlabGroup);

            // update protected branches
            const protectedBranches: string[] = ["develop", "master"];
            for (const project of allProjects) {
                for (const protectedBranch of protectedBranches) {
                    console.log(`  --> protecting branch ${protectedBranch} for project ${project.name} (${project.id})`)
                    await request.put(`https://gitlab.com/api/v4/projects/${project.id}/repository/branches/${protectedBranch}/protect?developers_can_merge=true&developers_can_push=false`, {
                        headers: {
                            "PRIVATE-TOKEN": gitlabToken
                        },
                        json: true,
                        body: {

                        }
                    });
                }

                console.log(`  --> setting default branch in project ${project.name} to develop`);
                try {
                    await request.put(`https://gitlab.com/api/v4/projects/${project.id}?default_branch=develop&shared_runners_enabled=false&only_allow_merge_if_pipeline_succeeds=true&only_allow_merge_if_all_discussions_are_resolved=true`, {
                        headers: {
                            "PRIVATE-TOKEN": gitlabToken
                        },
                        json: true
                    });
                } catch (error) {
                    console.error("  --> Error: " + error);
                }
            }
        });

    }
}
