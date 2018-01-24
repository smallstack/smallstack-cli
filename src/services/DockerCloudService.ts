import * as qs from "querystring";
import * as requestPromise from "request-promise";
import { clearInterval, clearTimeout, setInterval, setTimeout } from "timers";

export interface IDockerCloudExternalRepository {
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

export interface IDockerCloudStack {
    deployed_datetime: string;
    destroyed_datetime: string;
    nickname: string;
    name: string;
    resource_uri: string;
    services: string[];
    state: string;
    synchronized: boolean;
    uuid: string;
}

export interface IDockerCloudLink {
    from_service: string;
    name?: string;
    to_service: string;
}

export interface IDockerCloudService extends IDockerCloudContainer {
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

export interface IDockerCloudContainerPorts {
    endpoint_uri: string;
    inner_port: number;
    outer_port: number;
    port_name: string;
    protocol: string;
    published: boolean;
    uri_protocol: string;
}

/**
 * If you get a service directly via UUID, you'll get an expand document back. this interface might not be complete yet!
 */
export interface IDockerCloudServiceDetail extends IDockerCloudService {

    bindings: any[];
    host_path: any[];
    container_envvars: Array<{ key: string, value: string }>;
    container_ports: IDockerCloudContainerPorts[];
    containers: string[];
    dns: any[];
    linked_from_service: IDockerCloudLink[];
    linked_to_service: IDockerCloudLink[];
}

export interface IDockerCloudContainer {
    autodestroy: string;
    autorestart: string;
    container_ports: IDockerCloudContainerPorts[];
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

export interface IDockerCloudPageable<T> {
    meta: {
        limit: number;
        next: string;
        offset: number;
        previous: string;
        total_count: number;
    };
    objects: T;
}


export class DockerCloudService {

    private dockerApiVersion: string = "v1";
    private dockerApiUrl: string = "https://cloud.docker.com/api";

    public getContainers(parameters?: any): Promise<IDockerCloudPageable<IDockerCloudContainer[]>> {
        return this.buildRequest("GET", "app", "container", parameters);
    }

    public getStacks(parameters?: any): Promise<IDockerCloudPageable<IDockerCloudStack[]>> {
        return this.buildRequest("GET", "app", "stack", parameters);
    }

    public async getServices(parameters?: any): Promise<IDockerCloudPageable<IDockerCloudService[]>> {
        // check if stack needs to be interpolated
        if (typeof parameters.name === "string" && parameters.name.indexOf(".") !== -1) {
            console.log("Found dot in service name, trying to find a stack...");
            const serviceNameSplit: string[] = parameters.name.split(".");
            if (serviceNameSplit.length !== 2)
                throw new Error("Too many dots in service name. If you want to get a service inside a stack, please use STACK_NAME.SERVICE_NAME!");
            const stacks: IDockerCloudPageable<IDockerCloudStack[]> = await this.getStacks({ name: serviceNameSplit[0] });
            if (stacks.meta.total_count === 0)
                throw new Error("Could not find stack with name " + serviceNameSplit[0]);
            parameters.stack = stacks.objects[0].resource_uri;
            parameters.name = serviceNameSplit[1];
        }
        if (parameters.name !== undefined)
            parameters.name = this.truncateServiceName(parameters.name);
        return this.buildRequest("GET", "app", "service/", parameters);
    }

    public async getService(parameters?: any): Promise<IDockerCloudService> {
        return new Promise<IDockerCloudService>((resolve, reject) => {
            this.getServices(parameters).then((services: IDockerCloudPageable<IDockerCloudService[]>) => {
                if (services.meta.total_count === 0)
                    reject(new Error("No matching services found!"));
                else if (services.meta.total_count > 1)
                    reject(new Error("Found " + services.meta.total_count + " matching services! Please "));
                else
                    resolve(services.objects[0]);
            });
        });
    }

    public async getServiceDetail(uuid: string): Promise<IDockerCloudServiceDetail> {
        return this.buildRequest("GET", "app", "service/" + uuid + "/");
    }

    public createService(parameters: any): Promise<IDockerCloudService> {
        if (parameters.name === undefined)
            throw new Error("name must be set");
        parameters.name = this.truncateServiceName(parameters.name);

        // changing ROOT_URL and VIRTUAL_HOST urls if they are too long
        if (parameters && parameters.container_envvars) {
            for (const envvar of parameters.container_envvars) {
                if (envvar.key === "VIRTUAL_HOST" && typeof envvar.value === "string" && envvar.value.length > 45) {
                    envvar.value = this.truncateDomainsSubdomain(envvar.value, 45);
                    console.warn("Warning: Found VIRTUAL_HOST environment variable with more than 45 characters, truncating to " + envvar.value);
                }
                if (envvar.key === "ROOT_URL" && typeof envvar.value === "string" && envvar.value.length > 45) {
                    envvar.value = this.truncateDomainsSubdomain(envvar.value, 45);
                    console.warn("Warning: Found ROOT_URL environment variable with more than 45 characters, truncating to " + envvar.value);
                }
            }
        }

        return this.buildRequest("POST", "app", "service/", undefined, parameters);
    }

    public sendServiceCommand(uuid: string, command: "start" | "stop" | "scale" | "terminate"): Promise<void> {
        if (uuid === undefined)
            throw new Error("Please provide a uuid!");
        if (command !== "terminate")
            return this.buildRequest("POST", "app", "service/" + uuid + "/" + command + "/");
        else
            return this.buildRequest("DELETE", "app", "service/" + uuid + "/");
    }

    public async linkServices(fromUUID: string, toUUID: string, linkName?: string): Promise<void> {

        // get original links for from.to
        const sourceService: IDockerCloudServiceDetail = await this.getServiceDetail(fromUUID);
        const linkedToServices: IDockerCloudLink[] = sourceService.linked_to_service;

        // new link
        const linkedService: any = { to_service: "/api/app/v1/service/" + toUUID + "/" };
        if (linkName !== undefined)
            linkedService.name = linkName;
        linkedToServices.push(linkedService);
        return this.buildRequest("PATCH", "app", "service/" + fromUUID + "/", undefined, { linked_to_service: linkedToServices });
    }

    public async unlinkServices(fromUUID: string, toUUID: string): Promise<void> {
        throw new Error("NOT YET IMPLEMENTED!");
        // get original links for from.to
        // const sourceService: IDockerCloudServiceDetail = await this.getService(fromUUID);
        // const linkedToServices: IDockerCloudLink[] = sourceService.linked_to_service;
        // const index: number = findIndex(linkedToServices, (ls: IDockerCloudLink) => ls.to_service)
        // linkedToServices.splice(index, 1);

        // // new link
        // let linkedService: any = { "to_service": "/api/app/v1/service/" + toUUID + "/" };
        // linkedToServices.push(linkedService);
        // return this.buildRequest("PATCH", "app", "service/" + fromUUID + "/", undefined, { linked_to_service: linkedToServices });
    }

    public async waitForState(parameters: any): Promise<any> {
        if (parameters.state === undefined)
            throw new Error("No state given to check against!");
        return new Promise<any>(async (resolve, reject) => {
            const timeout: number = 10 * 60 * 1000;
            const checkEvery: number = 5000;
            let timeoutHandler: NodeJS.Timer;
            let intervalHandler: NodeJS.Timer;

            let allServicesInCorrectState: boolean = await this.waitForStateInternal(parameters);
            if (allServicesInCorrectState)
                resolve();
            else {
                intervalHandler = setInterval(async () => {
                    allServicesInCorrectState = await this.waitForStateInternal(parameters, timeoutHandler, intervalHandler);
                    if (allServicesInCorrectState)
                        resolve();
                }, checkEvery);

                timeoutHandler = setTimeout(() => {
                    if (intervalHandler)
                        clearInterval(intervalHandler);
                    reject(new Error("ran into timeout of " + timeout + "ms!"));
                }, timeout);
            }
        });
    }

    public async waitForURL(url: string): Promise<any> {
        if (url === undefined)
            throw new Error("No url given to wait for!");
        return new Promise<any>(async (resolve, reject) => {
            const timeout: number = 5 * 60 * 1000;
            const checkEvery: number = 5000;
            let timeoutHandler: NodeJS.Timer;
            let intervalHandler: NodeJS.Timer;


            console.log(`Testing url ${url} to return "HTTP 200 OK"...`);
            let httpStatusCode: number = await this.getHTTPStatusCode(url);
            console.log(`   --> got ${httpStatusCode}`);
            if (httpStatusCode === 200)
                resolve();
            else {
                intervalHandler = setInterval(async () => {
                    httpStatusCode = await this.getHTTPStatusCode(url);
                    console.log(`   --> got ${httpStatusCode}`);
                    if (httpStatusCode === 200) {
                        clearInterval(intervalHandler);
                        if (timeoutHandler)
                            clearTimeout(timeoutHandler);
                        resolve();
                    }
                }, checkEvery);

                timeoutHandler = setTimeout(() => {
                    if (intervalHandler)
                        clearInterval(intervalHandler);
                    reject(new Error("ran into timeout of " + timeout + "ms!"));
                }, timeout);
            }
        });
    }

    public getDockerCloudBasicAuth() {
        const username: string = process.env.DOCKERCLOUD_USER;
        if (username === undefined)
            throw new Error("Please set 'DOCKERCLOUD_USER' as environment variable!");
        const apiKey: string = process.env.DOCKERCLOUD_APIKEY;
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

    private buildRequest(method: "GET" | "POST" | "DELETE" | "PATCH", endpoint: "app" | "repo", path: string, urlParams?: any, body?: any): Promise<any> {
        let queryParams = "";
        if (urlParams)
            queryParams = qs.stringify(urlParams);

        const url: string = this.getDockerCloudApiUrl(endpoint, path) + "?" + queryParams;
        console.log("  [" + method + "] " + url);
        return requestPromise({
            method,
            url,
            headers: {
                Authorization: this.getDockerCloudBasicAuth()
            },
            json: true,
            body
        }) as any;
    }

    private truncateServiceName(serviceName: string, limit: number = 30) {
        return serviceName.substr(0, limit);
    }

    private truncateDomainsSubdomain(url: string, maximumLength: number = 30) {
        const split: string[] = url.split(".");
        if (split.length < 2)
            throw new Error("No subdomain Found!");

        const subDomain: string = split[0];
        const rest: string = url.substring(subDomain.length);
        const subDomainLength: number = maximumLength - rest.length;
        if (subDomainLength < 1)
            throw new Error("Subdomain cannot be truncated since the rest is too long already. It would result in an empty subdomain!");
        const truncatedSubdomain: string = subDomain.substring(0, subDomainLength);
        return url.replace(subDomain, truncatedSubdomain);
    }

    private waitForStateInternal(parameters: any, timeoutHandler?: NodeJS.Timer, intervalHandler?: NodeJS.Timer): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            let allServicesInCorrectState: boolean = true;

            // get all services
            this.getServices(parameters).then((services: IDockerCloudPageable<IDockerCloudService[]>) => {

                // check status
                if (services.meta.total_count === 0) {
                    // fail if no services were found (maybe they will get created within the timeout)
                    allServicesInCorrectState = false;
                }
                else {
                    for (const service of services.objects) {
                        if (service.state !== parameters.state) {
                            allServicesInCorrectState = false;
                            break;
                        }
                    }
                }
                if (allServicesInCorrectState) {
                    if (timeoutHandler)
                        clearTimeout(timeoutHandler);
                    if (intervalHandler)
                        clearInterval(intervalHandler);
                }
                resolve(allServicesInCorrectState);
            });
        });
    }

    private getHTTPStatusCode(url: string): Promise<number> {
        return new Promise<number>(async (resolve, reject) => {
            const options = {
                method: "GET",
                uri: url,
                resolveWithFullResponse: true
            };
            try {
                const response: any = await requestPromise(options);
                resolve(response.statusCode);
            } catch (e) {
                if (e.statusCode)
                    resolve(e.statusCode);
                else
                    resolve(501);
            }
        });
    }
}
