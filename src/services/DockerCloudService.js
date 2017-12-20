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
const qs = require("querystring");
const requestPromise = require("request-promise");
const timers_1 = require("timers");
class DockerCloudService {
    constructor() {
        this.dockerApiVersion = "v1";
        this.dockerApiUrl = "https://cloud.docker.com/api";
    }
    getContainers(parameters) {
        return this.buildRequest("GET", "app", "container", parameters);
    }
    getStacks(parameters) {
        return this.buildRequest("GET", "app", "stack", parameters);
    }
    getServices(parameters) {
        return __awaiter(this, void 0, void 0, function* () {
            // check if stack needs to be interpolated
            if (typeof parameters.name === "string" && parameters.name.indexOf(".") !== -1) {
                console.log("Found dot in service name, trying to find a stack...");
                const serviceNameSplit = parameters.name.split(".");
                if (serviceNameSplit.length !== 2)
                    throw new Error("Too many dots in service name. If you want to get a service inside a stack, please use STACK_NAME.SERVICE_NAME!");
                const stacks = yield this.getStacks({ name: serviceNameSplit[0] });
                if (stacks.meta.total_count === 0)
                    throw new Error("Could not find stack with name " + serviceNameSplit[0]);
                parameters.stack = stacks.objects[0].resource_uri;
                parameters.name = serviceNameSplit[1];
            }
            if (parameters.name !== undefined)
                parameters.name = this.truncateServiceName(parameters.name);
            return this.buildRequest("GET", "app", "service/", parameters);
        });
    }
    getService(parameters) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.getServices(parameters).then((services) => {
                    if (services.meta.total_count === 0)
                        reject(new Error("No matching services found!"));
                    else if (services.meta.total_count > 1)
                        reject(new Error("Found " + services.meta.total_count + " matching services! Please "));
                    else
                        resolve(services.objects[0]);
                });
            });
        });
    }
    getServiceDetail(uuid) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.buildRequest("GET", "app", "service/" + uuid + "/");
        });
    }
    registerExternalRepository(parameters) {
        // we have to register external repositories twice, see https://forums.docker.com/t/tags-from-external-registry-not-loading-net-err-content-decoding-failed/25831/4
        const namespacedUrl = this.getDockerCloudApiUrl("repo", "repository/");
        const personalUrl = this.getDockerCloudApiUrl("repo", "repository/", true);
        const personalRegistryCall = requestPromise.post(personalUrl, {
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
        const namespacedRegistryCall = requestPromise.post(namespacedUrl, {
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
        return Promise.all([personalRegistryCall, namespacedRegistryCall]);
    }
    createService(parameters) {
        if (parameters.name === undefined)
            throw new Error("name must be set");
        parameters.name = this.truncateServiceName(parameters.name);
        return this.buildRequest("POST", "app", "service/", undefined, parameters);
    }
    sendServiceCommand(uuid, command) {
        if (uuid === undefined)
            throw new Error("Please provide a uuid!");
        if (command !== "terminate")
            return this.buildRequest("POST", "app", "service/" + uuid + "/" + command + "/");
        else
            return this.buildRequest("DELETE", "app", "service/" + uuid + "/");
    }
    linkServices(fromUUID, toUUID, linkName) {
        return __awaiter(this, void 0, void 0, function* () {
            // get original links for from.to
            const sourceService = yield this.getServiceDetail(fromUUID);
            const linkedToServices = sourceService.linked_to_service;
            // new link
            const linkedService = { to_service: "/api/app/v1/service/" + toUUID + "/" };
            if (linkName !== undefined)
                linkedService.name = linkName;
            linkedToServices.push(linkedService);
            return this.buildRequest("PATCH", "app", "service/" + fromUUID + "/", undefined, { linked_to_service: linkedToServices });
        });
    }
    unlinkServices(fromUUID, toUUID) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    waitForState(parameters) {
        return __awaiter(this, void 0, void 0, function* () {
            if (parameters.state === undefined)
                throw new Error("No state given to check against!");
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                const timeout = 10 * 60 * 1000;
                const checkEvery = 5000;
                let timeoutHandler;
                let intervalHandler;
                let allServicesInCorrectState = yield this.waitForStateInternal(parameters);
                if (allServicesInCorrectState)
                    resolve();
                else {
                    intervalHandler = timers_1.setInterval(() => __awaiter(this, void 0, void 0, function* () {
                        allServicesInCorrectState = yield this.waitForStateInternal(parameters, timeoutHandler, intervalHandler);
                        if (allServicesInCorrectState)
                            resolve();
                    }), checkEvery);
                    timeoutHandler = timers_1.setTimeout(() => {
                        if (intervalHandler)
                            timers_1.clearInterval(intervalHandler);
                        reject(new Error("ran into timeout of " + timeout + "ms!"));
                    }, timeout);
                }
            }));
        });
    }
    waitForURL(url) {
        return __awaiter(this, void 0, void 0, function* () {
            if (url === undefined)
                throw new Error("No url given to wait for!");
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                const timeout = 5 * 60 * 1000;
                const checkEvery = 5000;
                let timeoutHandler;
                let intervalHandler;
                console.log(`Testing url ${url} to return "HTTP 200 OK"...`);
                let httpStatusCode = yield this.getHTTPStatusCode(url);
                console.log(`   --> got ${httpStatusCode}`);
                if (httpStatusCode === 200)
                    resolve();
                else {
                    intervalHandler = timers_1.setInterval(() => __awaiter(this, void 0, void 0, function* () {
                        httpStatusCode = yield this.getHTTPStatusCode(url);
                        console.log(`   --> got ${httpStatusCode}`);
                        if (httpStatusCode === 200) {
                            timers_1.clearInterval(intervalHandler);
                            if (timeoutHandler)
                                timers_1.clearTimeout(timeoutHandler);
                            resolve();
                        }
                    }), checkEvery);
                    timeoutHandler = timers_1.setTimeout(() => {
                        if (intervalHandler)
                            timers_1.clearInterval(intervalHandler);
                        reject(new Error("ran into timeout of " + timeout + "ms!"));
                    }, timeout);
                }
            }));
        });
    }
    getDockerCloudBasicAuth() {
        const username = process.env.DOCKERCLOUD_USER;
        if (username === undefined)
            throw new Error("Please set 'DOCKERCLOUD_USER' as environment variable!");
        const apiKey = process.env.DOCKERCLOUD_APIKEY;
        if (apiKey === undefined)
            throw new Error("Please set 'DOCKERCLOUD_APIKEY' as environment variable!");
        return "Basic " + new Buffer(username + ":" + apiKey).toString("base64");
    }
    getDockerCloudNamespace() {
        return process.env.DOCKERCLOUD_NAMESPACE;
    }
    /**
     * GET /api/app/v1/[optional_namespace/]service/
     * POST /api/repo/v1/[optional_namespace/]repository/
     */
    getDockerCloudApiUrl(endpoint, additionalPath, withoutNamespace = false) {
        let namespace = this.getDockerCloudNamespace();
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
    buildRequest(method, endpoint, path, urlParams, body) {
        let queryParams = "";
        if (urlParams)
            queryParams = qs.stringify(urlParams);
        const url = this.getDockerCloudApiUrl(endpoint, path) + "?" + queryParams;
        console.log("  [" + method + "] " + url);
        return requestPromise({
            method,
            url,
            headers: {
                Authorization: this.getDockerCloudBasicAuth()
            },
            json: true,
            body
        });
    }
    truncateServiceName(serviceName, limit = 30) {
        return serviceName.substr(0, limit);
    }
    waitForStateInternal(parameters, timeoutHandler, intervalHandler) {
        return new Promise((resolve) => {
            let allServicesInCorrectState = true;
            // get all services
            this.getServices(parameters).then((services) => {
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
                        timers_1.clearTimeout(timeoutHandler);
                    if (intervalHandler)
                        timers_1.clearInterval(intervalHandler);
                }
                resolve(allServicesInCorrectState);
            });
        });
    }
    getHTTPStatusCode(url) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            const options = {
                method: "GET",
                uri: url,
                resolveWithFullResponse: true
            };
            try {
                const response = yield requestPromise(options);
                resolve(response.statusCode);
            }
            catch (e) {
                if (e.statusCode)
                    resolve(e.statusCode);
                else
                    resolve(501);
            }
        }));
    }
}
exports.DockerCloudService = DockerCloudService;
