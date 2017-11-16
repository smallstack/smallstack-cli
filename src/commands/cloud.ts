import * as moment from "moment";
import * as _ from "underscore";
import { DockerCloudService, IDockerCloudService } from "../services/DockerCloudService";
import * as request from "request-promise";

export async function cloud(parameters) {

    const dockerCloudService = new DockerCloudService();

    // this service instance can be used for sharing between commands
    let currentService: IDockerCloudService;

    if (parameters.listContainers) {
        const containers = await (dockerCloudService.getContainers(_.omit(parameters, "listContainers")));
        console.log(containers.objects);
    }

    if (parameters.listServices) {
        const services = await (dockerCloudService.getServices(_.omit(parameters, "listServices")));
        console.log(services.objects);
    }

    if (parameters.listStacks) {
        const services = await (dockerCloudService.getStacks(_.omit(parameters, "listStacks")));
        console.log(services.objects);
    }

    if (parameters.registerExternalRepository) {
        const response = await (dockerCloudService.registerExternalRepository(_.omit(parameters, "registerExternalRepository")));
        console.log("Successfully added " + response[0].name + " to docker cloud registry!");
    }

    if (parameters.createService) {
        currentService = await (dockerCloudService.createService(_.omit(parameters, "createService")));
        console.log("Successfully created service!");
        console.log("  |- name:       " + currentService.name);
        console.log("  |- uuid:       " + currentService.uuid);
        console.log("  |- image:      " + currentService.image_tag);
        console.log("  |- public dns: " + currentService.public_dns);
    }

    if (parameters.startService) {
        try {
            currentService = await dockerCloudService.getService(_.extend(_.omit(parameters, "startService"), { state: "Not running" }));
        } catch (e) { }
        if (!currentService) {
            try {
                currentService = await (dockerCloudService.getService(_.extend(_.omit(parameters, "startService"), { state: "Stopped" })));
            } catch (e) { }
        }
        if (!currentService)
            throw new Error("Couldn't find a non running or stopped service for the provided parameters!");
        const uuid = currentService.uuid;
        console.log("Starting Service with UUID " + uuid);
        await (dockerCloudService.sendServiceCommand(uuid, "start"));
        console.log("Service start command successfully sent!");
    }

    if (parameters.stopService) {
        if (parameters.name) {
            const services = await (dockerCloudService.getServices({ name: parameters.name, state: "Running" }));
            if (services.meta.total_count !== 1)
                throw new Error("Couldn't find a running service with the name '" + parameters.name + "'!");
            currentService = services.objects[0];
            const uuid = currentService.uuid;
            console.log("Stopping Service with UUID " + uuid);
            await (dockerCloudService.sendServiceCommand(uuid, "stop"));
            console.log("Service stop command successfully sent!");
        }
        else
            throw new Error("Please provide a service name via --name parameter!");
    }

    if (parameters.terminateService) {
        if (parameters.name) {
            const services = await (dockerCloudService.getServices({ name: parameters.name }));
            if (services.meta.total_count !== 1)
                throw new Error("Couldn't find a service with the name '" + parameters.name + "'!");
            currentService = services.objects[0];
            const uuid: string = currentService.uuid;
            console.log("Terminating Service with UUID " + uuid);
            await (dockerCloudService.sendServiceCommand(uuid, "terminate"));
            console.log("Service terminate command successfully sent!");

            console.log("Waiting for service to get into state 'Terminated'!");
            await dockerCloudService.waitForState(_.extend(parameters, { state: "Terminated" }));
            console.log("Service is now in state 'Terminated'!");
        }
        else
            throw new Error("Please provide a service name via --name parameter!");
    }

    if (parameters.linkServices) {
        if (typeof parameters.from !== "string" || typeof parameters.to !== "string")
            throw new Error("Please provide a --from and a --to parameter (service names)");

        console.log("Getting UUID for fromService...");
        const fromUUIDs = await (dockerCloudService.getServices({ name: parameters.from }));
        let fromService: IDockerCloudService;
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
        const toUUIDs = await (dockerCloudService.getServices({ name: parameters.to }));
        let toService: IDockerCloudService;
        for (let to of toUUIDs.objects) {
            if (to.state !== "Terminated" && to.state !== "Terminating") {
                toService = to;
                break;
            }
        }
        if (!toService)
            throw new Error("Could not find to service...");
        console.log("     --> " + toService.uuid);

        await (dockerCloudService.linkServices(fromService.uuid, toService.uuid, parameters.name));
        console.log("Service linking was successful!");
    }

    if (parameters.unlinkServices) {
        if (typeof parameters.from !== "string" || typeof parameters.to !== "string")
            throw new Error("Please provide a --from and a --to parameter (service names)");

        console.log("Getting UUID for fromService...");
        const fromUUIDs = await (dockerCloudService.getServices({ name: parameters.from }));
        console.log("     --> " + fromUUIDs.objects[0].uuid);

        console.log("Getting UUID for toService...");
        const toUUIDs = await (dockerCloudService.getServices({ name: parameters.to }));
        console.log("     --> " + toUUIDs.objects[0].uuid);

        await (dockerCloudService.unlinkServices(fromUUIDs.objects[0].uuid, toUUIDs.objects[0].uuid));
        console.log("Service unlinking was successful!");
    }

    if (parameters.waitForState) {
        if (parameters.name === undefined)
            throw new Error("Please provide a service name via --name parameter!");
        if (parameters.state === undefined)
            throw new Error("Please provide a docker service state name via --state parameter!");
        const waitStart: Date = new Date();
        console.log("Waiting for service to get into state '" + parameters.state + "'!");
        await dockerCloudService.waitForState(parameters);
        const durationString: string = moment((new Date().getTime() - waitStart.getTime())).format('mm:ss.SSS');
        console.log("Service is now in state " + parameters.state + " after waiting for " + durationString);
    }

    if (parameters.httpReachableTest) {
        await dockerCloudService.waitForURL(parameters.url);
    }
}
