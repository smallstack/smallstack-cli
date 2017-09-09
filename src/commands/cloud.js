"use strict";

var DockerCloudService = require("../services/DockerCloudService").DockerCloudService;
var _ = require("underscore");
var async = require('asyncawait/async');
var await = require('asyncawait/await');
var Promise = require('bluebird');

module.exports = async(function (parameters, done) {

    const dockerCloudService = new DockerCloudService();

    if (parameters.listContainers) {
        const containers = await(dockerCloudService.getContainers(_.omit(parameters, "listContainers")));
        console.log(containers.objects);
        return;
    }

    if (parameters.listServices) {
        const services = await(dockerCloudService.getServices(_.omit(parameters, "listServices")));
        console.log(services.objects);
        return;
    }

    if (parameters.listStacks) {
        const services = await(dockerCloudService.getStacks(_.omit(parameters, "listStacks")));
        console.log(services.objects);
        return;
    }

    if (parameters.registerExternalRepository) {
        const response = await(dockerCloudService.registerExternalRepository(_.omit(parameters, "registerExternalRepository")));
        console.log("Successfully added " + response[0].name + " to docker cloud registry!");
        return;
    }

    if (parameters.createService) {
        const service = await(dockerCloudService.createService(_.omit(parameters, "createService")));
        console.log("Successfully created service!");
        console.log("  |- name:       " + service.name);
        console.log("  |- uuid:       " + service.uuid);
        console.log("  |- image:      " + service.image_tag);
        console.log("  |- public dns: " + service.public_dns);
        return;
    }

    if (parameters.startService) {
        if (parameters.name) {
            let service = await(dockerCloudService.getServices({ name: parameters.name, state: "Not running" }));
            if (service.meta.total_count !== 1) {
                service = await(dockerCloudService.getServices({ name: parameters.name, state: "Stopped" }));
                if (service.meta.total_count !== 1)
                    throw new Error("Couldn't find a non running or stopped service with the name '" + parameters.name + "'!");
            }
            const uuid = service.objects[0].uuid;
            console.log("Starting Service with UUID " + uuid);
            await(dockerCloudService.sendServiceCommand(uuid, "start"));
            console.log("Service start command successfully sent!");
        }
        else
            throw new Error("Please provide a service name via --name parameter!");
        return;
    }

    if (parameters.stopService) {
        if (parameters.name) {
            const service = await(dockerCloudService.getServices({ name: parameters.name, state: "Running" }));
            if (service.meta.total_count !== 1)
                throw new Error("Couldn't find a running service with the name '" + parameters.name + "'!");
            const uuid = service.objects[0].uuid;
            console.log("Stopping Service with UUID " + uuid);
            await(dockerCloudService.sendServiceCommand(uuid, "stop"));
            console.log("Service stop command successfully sent!");
        }
        else
            throw new Error("Please provide a service name via --name parameter!");
        return;
    }

    if (parameters.terminateService) {
        if (parameters.name) {
            const service = await(dockerCloudService.getServices({ name: parameters.name }));
            if (service.meta.total_count !== 1)
                throw new Error("Couldn't find a service with the name '" + parameters.name + "'!");
            const uuid = service.objects[0].uuid;
            console.log("Terminating Service with UUID " + uuid);
            await(dockerCloudService.sendServiceCommand(uuid, "terminate"));
            console.log("Service terminate command successfully sent!");
        }
        else
            throw new Error("Please provide a service name via --name parameter!");
        return;
    }

    if (parameters.linkServices) {
        if (typeof parameters.from !== "string" || typeof parameters.to !== "string")
            throw new Error("Please provide a --from and a --to parameter (service names)");

        console.log("Getting UUID for fromService...");
        const fromUUIDs = await(dockerCloudService.getServices({ name: parameters.from }));
        console.log("     --> " + fromUUIDs.objects[0].uuid);

        console.log("Getting UUID for toService...");
        const toUUIDs = await(dockerCloudService.getServices({ name: parameters.to }));
        console.log("     --> " + toUUIDs.objects[0].uuid);

        await(dockerCloudService.linkServices(fromUUIDs.objects[0].uuid, toUUIDs.objects[0].uuid, parameters.name));
        console.log("Service linking was successful!");
        return;
    }

    if (parameters.unlinkServices) {
        if (typeof parameters.from !== "string" || typeof parameters.to !== "string")
            throw new Error("Please provide a --from and a --to parameter (service names)");

        console.log("Getting UUID for fromService...");
        const fromUUIDs = await(dockerCloudService.getServices({ name: parameters.from }));
        console.log("     --> " + fromUUIDs.objects[0].uuid);

        console.log("Getting UUID for toService...");
        const toUUIDs = await(dockerCloudService.getServices({ name: parameters.to }));
        console.log("     --> " + toUUIDs.objects[0].uuid);

        await(dockerCloudService.unlinkServices(fromUUIDs.objects[0].uuid, toUUIDs.objects[0].uuid));
        console.log("Service unlinking was successful!");
        return;
    }


});
