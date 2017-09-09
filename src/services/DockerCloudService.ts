import * as requestPromise from "request-promise";
import * as request from "request";
import * as qs from "querystring";
import { stringifyParametersWithoutPasswords } from "../functions/stringifyParametersWithoutPasswords";

export interface DockerCloudExternalRepository {
    in_use: boolean;
    name: string;
    registry: string;
    resource_uri: string;
    build_source: any;
    last_build_date: any;
    public_url: string;
    state: string;
    tags: string[];
}

export interface DockerCloudStack {
}

export interface DockerCloudService extends DockerCloudContainer {
    autoredeploy: boolean;
    current_num_containers: number;
    deployment_strategy: string;
    nickname: string;
    running_num_containers: number;
    sequential_deployment: boolean;
    stack: any;
    stopped_num_containers: number;
    target_num_containers: number;
}

export interface DockerCloudContainer {
    autodestroy: string;
    autorestart: string;
    container_ports: any;
    cpu_shares: any;
    deployed_datetime: string;
    destroyed_datetime: string;
    docker_id: string;
    entrypoint: string;
    exit_code: any;
    exit_code_msg: any;
    graceful_stop_time: number;
    image_name: string;
    image_tag: string;
    memory: number;
    memory_swap: number;
    name: string;
    net: string;
    node: string;
    pid: string;
    private_ip: string;
    privileged: boolean;
    public_dns: string;
    resource_uri: string;
    run_command: string;
    service: string;
    started_datetime: string;
    state: string;
    stopped_datetime: any;
    synchronized: true;
    uuid: string;
    working_dir: string;
}

export interface DockerCloudPageable<T> {
    meta: {
        limit: number;
        next: string;
        offset: number;
        previous: string;
        total_count: number;
    },
    objects: T;
}


export class DockerCloudService {

    private dockerApiVersion: string = "v1";
    private dockerApiUrl: string = "https://cloud.docker.com/api";

    public getContainers(parameters?: any): Promise<DockerCloudPageable<DockerCloudContainer[]>> {
        return this.buildRequest("GET", "app", "container", parameters);
    }

    public getStacks(parameters?: any): Promise<DockerCloudPageable<DockerCloudStack[]>> {
        return this.buildRequest("GET", "app", "stack", parameters);
    }

    public getServices(parameters?: any): Promise<DockerCloudPageable<DockerCloudService[]>> {
        return this.buildRequest("GET", "app", "service", parameters);
    }

    public registerExternalRepository(parameters: any): Promise<DockerCloudExternalRepository[]> {

        // we have to register external repositories twice, see https://forums.docker.com/t/tags-from-external-registry-not-loading-net-err-content-decoding-failed/25831/4
        const namespacedUrl: string = this.getDockerCloudApiUrl("repo", "repository/");
        const personalUrl: string = this.getDockerCloudApiUrl("repo", "repository/", true);

        const personalRegistryCall: any = requestPromise.post(personalUrl, {
            headers: {
                "Authorization": this.getDockerCloudBasicAuth(),
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            json: true,
            body: {
                name: parameters.repository, username: parameters.username, password: parameters.password
            }
        });

        const namespacedRegistryCall: any = requestPromise.post(namespacedUrl, {
            headers: {
                "Authorization": this.getDockerCloudBasicAuth(),
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            json: true,
            body: {
                name: parameters.repository, username: parameters.username, password: parameters.password
            }
        });

        return Promise.all([personalRegistryCall, namespacedRegistryCall]) as any;
    }

    public createService(parameters: any): Promise<DockerCloudService> {
        if (parameters.name === undefined)
            throw new Error("name must be set");
        parameters.name = this.truncateServiceName(parameters.name);
        return this.buildRequest("POST", "app", "service/", parameters);
    }

    public sendServiceCommand(uuid: string, command: "start" | "stop" | "scale" | "terminate"): Promise<void> {
        if (uuid === undefined)
            throw new Error("Please provide a uuid!");
        if (command !== "terminate")
            return this.buildRequest("POST", "app", "service/" + uuid + "/" + command + "/");
        else
            return this.buildRequest("DELETE", "app", "service/" + uuid + "/");
    }

    public getDockerCloudBasicAuth() {
        var username: string = process.env.DOCKERCLOUD_USER;
        if (username === undefined)
            throw new Error("Please set 'DOCKERCLOUD_USER' as environment variable!");
        var apiKey: string = process.env.DOCKERCLOUD_APIKEY;
        if (apiKey === undefined)
            throw new Error("Please set 'DOCKERCLOUD_APIKEY' as environment variable!");
        return "Basic " + new Buffer(username + ":" + apiKey).toString("base64");
    }

    public getDockerCloudNamespace(): string {
        return process.env.DOCKERCLOUD_NAMESPACE;
    }


    /**
     * GET /api/app/v1/[optional_namespace/]service/
     * POST /api/repo/v1/[optional_namespace/]repository/
     */
    public getDockerCloudApiUrl(endpoint: "app" | "repo", additionalPath?: string, withoutNamespace: boolean = false): string {
        let namespace: string = this.getDockerCloudNamespace();
        if (namespace !== undefined && !withoutNamespace)
            namespace = "/" + namespace;
        else
            namespace = "";
        if (additionalPath) {
            if (additionalPath.charAt(0) !== "/")
                additionalPath = "/" + additionalPath;
        }
        else
            additionalPath = "";

        return this.dockerApiUrl + "/" + endpoint + "/" + this.dockerApiVersion + namespace + additionalPath;
    }

    private buildRequest(method: "GET" | "POST" | "DELETE", endpoint: "app" | "repo", path: string, urlParams?: any, body?: any): Promise<any> {
        let queryParams = "";
        if (urlParams)
            queryParams = qs.stringify(urlParams);

        const url: string = this.getDockerCloudApiUrl(endpoint, path) + "?" + queryParams;
        console.log("[" + method + "] " + url);
        return requestPromise({
            method,
            url,
            headers: {
                "Authorization": this.getDockerCloudBasicAuth()
            },
            json: true,
            body
        }) as any;
    }

    private truncateServiceName(serviceName: string, limit: number = 30) {
        return serviceName.substr(0, limit);
    }
}