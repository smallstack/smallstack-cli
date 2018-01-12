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
const moment = require("moment");
const _ = require("underscore");
const DockerCloudService_1 = require("../services/DockerCloudService");
function cloud(parameters) {
    return __awaiter(this, void 0, void 0, function* () {
        const dockerCloudService = new DockerCloudService_1.DockerCloudService();
        // this service instance can be used for sharing between commands
        let currentService;
        if (parameters.listContainers) {
            const containers = yield (dockerCloudService.getContainers(_.omit(parameters, "listContainers")));
            console.log(containers.objects);
        }
        if (parameters.listServices) {
            const services = yield (dockerCloudService.getServices(_.omit(parameters, "listServices")));
            console.log(services.objects);
        }
        if (parameters.listStacks) {
            const services = yield (dockerCloudService.getStacks(_.omit(parameters, "listStacks")));
            console.log(services.objects);
        }
        if (parameters.createService) {
            currentService = yield (dockerCloudService.createService(_.omit(parameters, "createService")));
            console.log("Successfully created service!");
            console.log("  |- name:       " + currentService.name);
            console.log("  |- uuid:       " + currentService.uuid);
            console.log("  |- image:      " + currentService.image_tag);
            console.log("  |- public dns: " + currentService.public_dns);
        }
        if (parameters.startService) {
            try {
                currentService = yield dockerCloudService.getService(_.extend(_.omit(parameters, "startService"), { state: "Not running" }));
            }
            catch (e) {
                // can happen
            }
            if (!currentService) {
                try {
                    currentService = yield (dockerCloudService.getService(_.extend(_.omit(parameters, "startService"), { state: "Stopped" })));
                }
                catch (e) {
                    // can happen
                }
            }
            if (!currentService)
                throw new Error("Couldn't find a non running or stopped service for the provided parameters!");
            const uuid = currentService.uuid;
            console.log("Starting Service with UUID " + uuid);
            yield (dockerCloudService.sendServiceCommand(uuid, "start"));
            console.log("Service start command successfully sent!");
        }
        if (parameters.linkServices) {
            if (typeof parameters.from !== "string" || typeof parameters.to !== "string")
                throw new Error("Please provide a --from and a --to parameter (service names)");
            console.log("Getting UUID for fromService...");
            const fromUUIDs = yield (dockerCloudService.getServices({ name: parameters.from }));
            let fromService;
            for (const from of fromUUIDs.objects) {
                if (from.state !== "Terminated" && from.state !== "Terminating") {
                    fromService = from;
                    break;
                }
            }
            if (!fromService)
                throw new Error("Could not find from service...");
            console.log("     --> " + fromService.uuid);
            console.log("Getting UUID for toService...");
            const toUUIDs = yield (dockerCloudService.getServices({ name: parameters.to }));
            let toService;
            for (const to of toUUIDs.objects) {
                if (to.state !== "Terminated" && to.state !== "Terminating") {
                    toService = to;
                    break;
                }
            }
            if (!toService)
                throw new Error("Could not find to service...");
            console.log("     --> " + toService.uuid);
            yield (dockerCloudService.linkServices(fromService.uuid, toService.uuid, parameters.name));
            console.log("Service linking was successful!");
        }
        if (parameters.unlinkServices) {
            if (typeof parameters.from !== "string" || typeof parameters.to !== "string")
                throw new Error("Please provide a --from and a --to parameter (service names)");
            console.log("Getting UUID for fromService...");
            const fromUUIDs = yield (dockerCloudService.getServices({ name: parameters.from }));
            console.log("     --> " + fromUUIDs.objects[0].uuid);
            console.log("Getting UUID for toService...");
            const toUUIDs = yield (dockerCloudService.getServices({ name: parameters.to }));
            console.log("     --> " + toUUIDs.objects[0].uuid);
            yield (dockerCloudService.unlinkServices(fromUUIDs.objects[0].uuid, toUUIDs.objects[0].uuid));
            console.log("Service unlinking was successful!");
        }
        if (parameters.waitForState) {
            if (parameters.name === undefined)
                throw new Error("Please provide a service name via --name parameter!");
            if (parameters.state === undefined)
                throw new Error("Please provide a docker service state name via --state parameter!");
            const waitStart = new Date();
            console.log("Waiting for service to get into state '" + parameters.state + "'!");
            yield dockerCloudService.waitForState(parameters);
            const durationString = moment((new Date().getTime() - waitStart.getTime())).format("mm:ss.SSS");
            console.log("Service is now in state " + parameters.state + " after waiting for " + durationString);
        }
        if (parameters.httpReachableTest) {
            if (parameters.url === undefined && currentService !== undefined) {
                // refreshing current service to get updated public dns
                const containers = yield dockerCloudService.getContainers({ service: currentService.resource_uri });
                if (containers.meta.total_count === 0)
                    throw new Error("No containers found for current service!");
                // pick first container
                const container = containers.objects[0];
                yield dockerCloudService.waitForURL(container.container_ports[0].endpoint_uri);
            }
            else
                yield dockerCloudService.waitForURL(parameters.url);
        }
        if (parameters.stopService) {
            if (parameters.name) {
                const services = yield (dockerCloudService.getServices({ name: parameters.name, state: "Running" }));
                if (services.meta.total_count === 0)
                    throw new Error("Couldn't find a running service with the name '" + parameters.name + "'!");
                _.each(services.objects, (service) => __awaiter(this, void 0, void 0, function* () {
                    const uuid = service.uuid;
                    if (service.state === "Stopped")
                        console.log("Service with UUID " + uuid + " is already stopped!");
                    else if (service.state === "Stopping")
                        console.log("Service with UUID " + uuid + " is currently stopping!");
                    else if (["Not running", "Starting", "Scaling", "Redeploying", "Terminating", "Terminated"].indexOf(service.state) !== -1)
                        console.log("Not stopping service with UUID " + uuid + " since its in state " + service.state + "!");
                    else {
                        console.log("Stopping Service with UUID " + uuid);
                        yield (dockerCloudService.sendServiceCommand(uuid, "stop"));
                        console.log("Service stop command successfully sent!");
                    }
                }));
            }
            else
                throw new Error("Please provide a service name via --name parameter!");
        }
        if (parameters.terminateService) {
            if (parameters.name) {
                const services = yield (dockerCloudService.getServices({ name: parameters.name }));
                if (services.meta.total_count === 0)
                    throw new Error("Couldn't find a service with the name '" + parameters.name + "'!");
                _.each(services.objects, (service) => __awaiter(this, void 0, void 0, function* () {
                    const uuid = service.uuid;
                    if (service.state === "Terminated")
                        console.log("Service with UUID " + uuid + " is already terminated!");
                    else if (service.state === "Terminating")
                        console.log("Service with UUID " + uuid + " is currently terminating!");
                    else {
                        console.log("Terminating Service with UUID " + uuid);
                        yield (dockerCloudService.sendServiceCommand(uuid, "terminate"));
                        console.log("Service terminate command successfully sent!");
                        console.log("Waiting for service to get into state 'Terminated'!");
                        yield dockerCloudService.waitForState(_.extend(parameters, { state: "Terminated" }));
                        console.log("Service is now in state 'Terminated'!");
                    }
                }));
            }
            else
                throw new Error("Please provide a service name via --name parameter!");
        }
    });
}
exports.cloud = cloud;
