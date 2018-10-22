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
    container_envvars: Array<{
        key: string;
        value: string;
    }>;
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
export declare class DockerCloudService {
    private dockerApiVersion;
    private dockerApiUrl;
    getContainers(parameters?: any): Promise<IDockerCloudPageable<IDockerCloudContainer[]>>;
    getStacks(parameters?: any): Promise<IDockerCloudPageable<IDockerCloudStack[]>>;
    getServices(parameters?: any): Promise<IDockerCloudPageable<IDockerCloudService[]>>;
    getService(parameters?: any): Promise<IDockerCloudService>;
    getServiceDetail(uuid: string): Promise<IDockerCloudServiceDetail>;
    createService(parameters: any): Promise<IDockerCloudService>;
    sendServiceCommand(uuid: string, command: "start" | "stop" | "scale" | "terminate"): Promise<void>;
    linkServices(fromUUID: string, toUUID: string, linkName?: string): Promise<void>;
    unlinkServices(fromUUID: string, toUUID: string): Promise<void>;
    waitForState(parameters: any): Promise<any>;
    waitForURL(url: string): Promise<any>;
    getDockerCloudBasicAuth(): string;
    getDockerCloudNamespace(): string;
    /**
     * GET /api/app/v1/[optional_namespace/]service/
     * POST /api/repo/v1/[optional_namespace/]repository/
     */
    getDockerCloudApiUrl(endpoint: "app" | "repo", additionalPath?: string, withoutNamespace?: boolean): string;
    private buildRequest;
    private truncateServiceName;
    private truncateDomainsSubdomain;
    private waitForStateInternal;
    private getHTTPStatusCode;
}
