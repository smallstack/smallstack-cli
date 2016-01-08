module.exports = function () {

    // third party
    var path = require("path");
    var find = require("find");
    var _ = require("underscore");
    var lodash = require("lodash");
    var fs = require("fs-extra");
    
    // own stuff
    var genFunctions = require("./functions/generateSourcesFunctions");
    var config = require("./config");

    var logPath = "logs/generator.log";

    // empty log
    fs.removeSync(logPath);

    ////////////////////////////////////////////////////////////////////// prepare 
    // general configurations
    var configuration = {};
    var roots = {};
    var extendings = {};
    
    
        
    // display some information
    console.log(generatorLog("Root Directory :       ", config.rootDirectory));
    console.log(generatorLog("Data Layer Directory : ", config.dataLayerDirectory));
    console.log("\n");

    var allSmallstackFiles = find.fileSync(/\.smallstack\.json$/, config.dataLayerDirectory);
    if (allSmallstackFiles.length === 0) {
        console.log(generatorLog("Aborting! No *.smallstack.json files found!"));
    }




    _.each(allSmallstackFiles, function (smallstackFile) {
        console.log(generatorLog("preparing : " + smallstackFile));
            
        // read in data          
        var content = fs.readFileSync(smallstackFile);
        var jsonContent = JSON.parse(content);
            
        // "just" extending?
        if (jsonContent.extends !== undefined) {
            generatorLog("found schema extending for : " + jsonContent.extends);
            if (extendings[jsonContent.extends] === undefined)
                extendings[jsonContent.extends] = {};
            _.extend(extendings[jsonContent.extends], jsonContent);
            return;
        }
            

        // generate files and directories            
        var rootDirectory = path.dirname("" + smallstackFile);
        if (roots[rootDirectory] === undefined) {
            roots[rootDirectory] = {};
            roots[rootDirectory].services = [];
            roots[rootDirectory].collections = [];
        }

        var id = jsonContent.collection.name;         

        // fill the configuration
        configuration[id] = {};

        // generals
        configuration[id].config = jsonContent;
        configuration[id].filename = smallstackFile;
        configuration[id].collectionName = jsonContent.collection.name;
        configuration[id].rootDirectory = path.dirname(smallstackFile);
        configuration[id].generatedDirectory = path.join(configuration[id].rootDirectory, "generated");

        // model variables
        configuration[id].modelsDirectory = path.join(configuration[id].rootDirectory, "models");
        configuration[id].modelsGeneratedDirectory = path.join(configuration[id].generatedDirectory, "models");
        configuration[id].modelClassName = capitalize(jsonContent.model.name);
        configuration[id].generatedModelClassName = "Generated" + configuration[id].modelClassName;
        configuration[id].relativePathFromModelToGeneratedModel = path.relative(configuration[id].modelsDirectory, configuration[id].modelsGeneratedDirectory).replace(/\\/g, "/") + "/" + configuration[id].generatedModelClassName + ".ts";
        configuration[id].relativePathFromGeneratedModelToModel = path.relative(configuration[id].modelsGeneratedDirectory, configuration[id].modelsDirectory).replace(/\\/g, "/") + "/" + configuration[id].modelClassName + ".ts";
        configuration[id].relativePathFromGeneratedModelToPackages = path.relative(configuration[id].modelsGeneratedDirectory, config.packagesDirectory).replace(/\\/g, "/");

        // collection variables
        configuration[id].collectionsDirectory = path.join(configuration[id].rootDirectory, "collections");
        configuration[id].collectionsGeneratedDirectory = path.join(configuration[id].generatedDirectory, "collections");
        configuration[id].baseCollectionFilePath = path.relative(configuration[id].collectionsGeneratedDirectory, config.pathToBaseCollectionFile).replace(/\\/g, "/");
        configuration[id].collectionClassName = capitalize(configuration[id].collectionName) + "Collection";
        configuration[id].generatedCollectionClassName = "Generated" + configuration[id].collectionClassName;
        configuration[id].relativePathFromCollectionToGeneratedCollection = path.relative(configuration[id].collectionsDirectory, configuration[id].collectionsGeneratedDirectory).replace(/\\/g, "/") + "/" + configuration[id].generatedCollectionClassName + ".ts";
        configuration[id].relativePathFromCollectionToModel = path.relative(configuration[id].collectionsGeneratedDirectory, configuration[id].modelsDirectory).replace(/\\/g, "/") + "/" + configuration[id].modelClassName + ".ts";
        configuration[id].relativePathFromGeneratedCollectionToCollectionService = path.relative(configuration[id].collectionsGeneratedDirectory, path.join(config.packagesDirectory, "smallstack-collections")).replace(/\\/g, "/") + "/CollectionService.ts";
        configuration[id].relativePathFromGeneratedCollectionToSmallstackCollection = path.relative(configuration[id].collectionsGeneratedDirectory, path.join(config.packagesDirectory, "smallstack-collections")).replace(/\\/g, "/") + "/SmallstackCollection.ts";
        if (jsonContent.collection.skipGeneration !== true)
            roots[configuration[id].rootDirectory].collections.push(configuration[id].collectionClassName);


        // service variables
        configuration[id].servicesDirectory = path.join(configuration[id].rootDirectory, "services");
        configuration[id].servicesGeneratedDirectory = path.join(configuration[id].generatedDirectory, "services");
        configuration[id].serviceClassName = genFunctions.getServiceName(jsonContent);
        configuration[id].generatedServiceClassName = "Generated" + configuration[id].serviceClassName;
        configuration[id].relativePathFromServiceToGeneratedService = path.relative(configuration[id].servicesDirectory, configuration[id].servicesGeneratedDirectory).replace(/\\/g, "/") + "/" + configuration[id].generatedServiceClassName + ".ts";
        configuration[id].relativePathFromServiceToModel = path.relative(configuration[id].servicesGeneratedDirectory, configuration[id].modelsDirectory).replace(/\\/g, "/") + "/" + configuration[id].modelClassName + ".ts";
        configuration[id].relativePathFromGeneratedServiceToPackages = path.relative(configuration[id].servicesGeneratedDirectory, config.packagesDirectory).replace(/\\/g, "/");
        configuration[id].relativePathFromGeneratedServiceToGeneratedDefinitionsFile = path.relative(configuration[id].servicesGeneratedDirectory, config.pathToGeneratedDefinitionsFile).replace(/\\/g, "/");
        configuration[id].relativePathFromGeneratedModelToService = path.relative(configuration[id].modelsGeneratedDirectory, configuration[id].servicesDirectory).replace(/\\/g, "/") + "/" + configuration[id].serviceClassName + ".ts";
        roots[configuration[id].rootDirectory].services.push(configuration[id].serviceClassName);


        // shared variables			
        configuration[id].relativePathToTypeDefinitions = path.relative(configuration[id].collectionsDirectory, config.pathToTypeDefinitions).replace(/\\/g, "/");
        configuration[id].relativePathToTypeDefinitionsGen = path.relative(configuration[id].collectionsGeneratedDirectory, config.pathToTypeDefinitions).replace(/\\/g, "/");

        // secure method variables
        configuration[id].methods = [];
        _.each(jsonContent.service.securedmethods, function (meth) {
            var method = {};
            method.sharedMethodsPath = path.resolve("app/shared/functions");
            method.serverMethodsPath = path.resolve("app/server/functions");
            method.clientMethodsPath = path.resolve("app/client/functions");
            method.pathFromSharedMethodToDefinitionsFile = path.relative(method.sharedMethodsPath, config.pathToGeneratedDefinitionsFile).replace(/\\/g, "/");
            method.pathFromServerMethodToDefinitionsFile = path.relative(method.serverMethodsPath, config.pathToGeneratedDefinitionsFile).replace(/\\/g, "/");
            method.pathFromClientMethodToDefinitionsFile = path.relative(method.clientMethodsPath, config.pathToGeneratedDefinitionsFile).replace(/\\/g, "/");
            method.methodName = configuration[id].collectionName + "-" + meth.name;
            method.methodParameters = genFunctions.convertMethodParametersToTypescriptMethodParameters(meth.parameters);
            method.methodParameterChecks = genFunctions.getChecksForParameters(meth.parameters, configuration);
            if (meth.returns === undefined) {
                console.warn(generatorLog("No method return type given for method '" + meth.name + "', using 'string'!"));
                method.methodReturnType = "string";
            } else
                method.methodReturnType = meth.returns;
            if (meth.visibility === undefined) {
                console.warn(generatorLog("No method visibility type given for method '" + meth.name + "', using 'server'!"));
                method.methodVisibility = "server";
            } else {
                if (meth.visibility === 'server' || meth.visibility === 'separate' || meth.visibility === 'shared')
                    method.methodVisibility = meth.visibility;
                else
                    throw new Error("'" + meth.visibility + "' is not a known method visibility. Please use 'server', 'separate', or 'shared'!");
            }
            configuration[id].methods.push(method);
        });
    });

     
    // empty generated folders
    _.each(_.keys(roots), function (root) {
        fs.emptydirSync(path.join(root, "generated"));
    });

    _.each(_.values(configuration), function (data) {

        console.log(generatorLog("processing : " + data.collectionName));

        if (extendings[data.collectionName] !== undefined) {
            generatorLog("Extending type " + data.collectionName);
            generatorLog("Before : ", data.config);
            lodash.merge(data.config, extendings[data.collectionName], function (a, b) {
                if (_.isArray(a)) {
                    return a.concat(b);
                }
            });
            generatorLog("After  : ", data.config);
        }
        
        // extending the data
        data.functions = genFunctions;
        data.others = configuration;
        data.general = config;
                
        // extending queries if byId and byIds are missing
        var byIdsName = genFunctions.getByIdsGetter(data.modelClassName);
        var byIdName = genFunctions.lowerCaseFirst(data.modelClassName) + "ById";

        var byIdsFound = _.find(data.config.service.queries, function (query) { return query.name === byIdsName; })
        var byIdFound = _.find(data.config.service.queries, function (query) { return query.name === byIdName; })

        if (!byIdsFound) {
            if (data.config.service === undefined)
                data.config.service = {};
            if (data.config.service.queries === undefined)
                data.config.service.queries = [];
            data.config.service.queries.push({
                "name": byIdsName,
                "selector": {
                    "_id": { $in: ":ids:string[]" }
                }
            });
        }
        if (!byIdFound)
            data.config.service.queries.push({
                "name": byIdName,
                "selector": {
                    "_id": ":id:string"
                }
            });

        // process collections
        // if (data.config.collection.skipGeneration === true)
        //     generatorLog("  | - skipping generating collection since collection.skipGeneration === true");
        // else {
        //     generatorLog("  | - generating collection");
        //     processTemplate(config.mscTemplatesPath + "/GeneratedCollection.ts", data.collectionsGeneratedDirectory + "/" + data.generatedCollectionClassName + ".ts", data);
        //     var collectionImpl = data.collectionsDirectory + "/" + data.collectionClassName + ".ts";
        //     if (!fs.existsSync(collectionImpl))
        //         processTemplate(config.mscTemplatesPath + "/Collection.ts", collectionImpl, data);
        // }

        // process services
        if (data.config.service.skipGeneration === true)
            generatorLog("  | - skipping generating service since service.skipGeneration === true");
        else {
            generatorLog("  | - generating service");
            processTemplate(config.mscTemplatesPath + "/GeneratedService.ts", data.servicesGeneratedDirectory + "/" + data.generatedServiceClassName + ".ts", data);
            var serviceImpl = data.servicesDirectory + "/" + data.serviceClassName + ".ts";
            if (!fs.existsSync(serviceImpl))
                processTemplate(config.mscTemplatesPath + "/Service.ts", serviceImpl, data);
        }

        // process models
        if (data.config.model.skipGeneration === true)
            generatorLog("  | - skipping generating model since model.skipGeneration === true");
        else {
            generatorLog("  | - generating model");
            processTemplate(config.mscTemplatesPath + "/GeneratedModel.ts", data.modelsGeneratedDirectory + "/" + data.generatedModelClassName + ".ts", data);
            var modelImpl = data.modelsDirectory + "/" + data.modelClassName + ".ts";
            if (!fs.existsSync(modelImpl))
                processTemplate(config.mscTemplatesPath + "/Model.ts", modelImpl, data);
        }

        //         // process secured methods
        //         if (data.config.service && data.config.service.securedmethods && data.config.service.securedmethods.skipGeneration === true)
        //             generatorLog("  | - skipping generating secured methods since service.securedmethods.skipGeneration === true");
        //         else {
        //             generatorLog("  | - generating secured methods");
        //             _.each(data.methods, function (method) {

        //                 var methodClientFile = method.clientMethodsPath + "/" + method.methodName + ".ts";
        //                 var methodSharedFile = method.sharedMethodsPath + "/" + method.methodName + ".ts";
        //                 var methodServerFile = method.serverMethodsPath + "/" + method.methodName + ".ts";

        //                 switch (method.methodVisibility) {
        //                     case "shared":
        //                         if (!fs.existsSync(methodSharedFile))
        //                             processTemplate(config.mscTemplatesPath + "/SecureMethodShared.ts", methodSharedFile, method);
        //                         else generatorLog("Skipping generation of file since it exists already : ", methodSharedFile);
        //                         if (fs.existsSync(methodClientFile))
        //                             throw new Error("Using visibility=shared, so this file should not exist : " + methodClientFile);
        //                         if (fs.existsSync(methodServerFile))
        //                             throw new Error("Using visibility=shared, so this file should not exist : " + methodServerFile);
        //                         break;
        //                     case "separate":
        //                         if (!fs.existsSync(methodClientFile))
        //                             processTemplate(config.mscTemplatesPath + "/SecureMethodClient.ts", methodClientFile, method);
        //                         else generatorLog("Skipping generation of file since it exists already : ", methodClientFile);
        //                         if (!fs.existsSync(methodServerFile))
        //                             processTemplate(config.mscTemplatesPath + "/SecureMethodServer.ts", methodServerFile, method);
        //                         else generatorLog("Skipping generation of file since it exists already : ", methodServerFile);
        //                         if (fs.existsSync(methodSharedFile))
        //                             throw new Error("Using visibility=separate, so this file should not exist : " + methodSharedFile);
        //                         break;
        //                     case "server":
        //                         if (!fs.existsSync(methodServerFile))
        //                             processTemplate(config.mscTemplatesPath + "/SecureMethodServer.ts", methodServerFile, method);
        //                         else generatorLog("Skipping generation of file since it exists already : ", methodServerFile);
        //                         if (fs.existsSync(methodClientFile))
        //                             throw new Error("Using visibility=server, so this file should not exist : " + methodClientFile);
        //                         if (fs.existsSync(methodSharedFile))
        //                             throw new Error("Using visibility=server, so this file should not exist : " + methodSharedFile);
        //                         break;
        //                     default:
        //                         throw new Error("Still no method.visibility given for method : ", method.methodName);
        //                 }
        //             });
        //         }
        //     });

        //     _.each(_.keys(roots), function (root) {

        //         // generate services file
        //         console.log("generating service instances file ...");
        //         processTemplate(config.mscTemplatesPath + "/generated-services-instances.ts", root + "/generated-services-instances.ts", {
        //             services: roots[root].services,
        //             functions: genFunctions,
        //             relativePathFromGenServicesToApp: path.relative(root, config.appDirectory).replace(/\\/g, "/")
        //         });
            
            
        //         // generate .gitignore
        //         console.log("generating .gitignore file ...");
        //         processTemplate(config.mscTemplatesPath + "/generated-folder.gitignore", root + "/.gitignore", {
        //             services: roots[root].services,
        //             functions: genFunctions
        //         });
        //     });

        //     // generate definitions file
        //     console.log("generating global definitions.d.ts file ...");
        //     processTemplate(config.mscTemplatesPath + "/definitions.d.ts", config.pathToGeneratedDefinitionsFile, {
        //         roots: roots,
        //         relativePathFromDefToPackages: path.relative(config.pathToGeneratedDefinitions, config.packagesDirectory).replace(/\\/g, "/"),
        //         functions: genFunctions,
        //         pathToGeneratedDefinitions: config.pathToGeneratedDefinitions
        //     });

    });



    function generatorLog() {
        var content = new Date().toLocaleString() + "     ";
        for (var i = 0; i < arguments.length; i++) {
            if (typeof arguments[i] === 'object')
                content += JSON.stringify(arguments[i]);
            else
                content += arguments[i];
        }
        // var fileContent = content;
        // if (grunt.file.exists(logPath))
        //     fileContent = grunt.file.read(logPath) + "\n" + fileContent;
        // grunt.file.write(logPath, fileContent, {
        //     encoding: "UTF-8"
        // });
        return content;
    }



    function processTemplate(from, to, replacers) {

        var template = fs.readFileSync(from);
        var content = lodash.template(template);
        fs.createFileSync(to);
        fs.writeFileSync(to, content(replacers));
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.substring(1);
    }

    function checkJson(variable, errorMessage) {
        if (variable === undefined || variable === null)
            errors.push(errorMessage);
    }

}