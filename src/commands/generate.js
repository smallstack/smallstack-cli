// third party
var fs = require("fs-extra");
var path = require("path");
var glob = require("glob");
var _ = require("underscore");
var lodash = require("lodash");
var capitalize = require("underscore.string/capitalize");

var templating = require("../functions/templating");
var notifier = require("../functions/notifier");
var exec = require("../functions/exec");
var genFunctions = require("../functions/generateSourcesFunctions");
var config = require("../config");

module.exports = function (params, done) {

    var forcedGenerationMode = params.forcedGeneration === true;

    // own stuff
    // require("../functions/compile.version")();

    var logPath = "logs/generator.log";

    // empty log
    fs.removeSync(logPath);

    if (config.datalayerPath)
        prepareDataLayerDirectory();


    try {

        ////////////////////////////////////////////////////////////////////// prepare 
        // general configurations
        var configuration = {};
        var roots = {};
        var extendings = {};

        // display some information
        console.log(generatorLog("Resources Directory: ", config.cliResourcesPath));
        if (config.datalayerPath)
            console.log(generatorLog("DataLayer Directory: ", config.datalayerPath));

        console.log("\n");

        var allSmallstackFiles = [];

        if (config.isProjectEnvironment()) {

            // load files from datalayer/types
            allSmallstackFiles = allSmallstackFiles.concat(glob.sync("datalayer/types/**/*.smallstack.json", {
                cwd: config.rootDirectory,
                follow: true,
                absolute: true
            }));

            // also load types from smallstack framework
            _.each(glob.sync("**/*.smallstack.json", {
                cwd: config.smallstackDirectory,
                follow: true,
                absolute: true
            }), function (smallstackFile) {
                evaluateSmallstackFile(smallstackFile, extendings, roots, configuration, {
                    generate: false
                });
            });

        }

        if (config.isSmallstackEnvironment())
            allSmallstackFiles = allSmallstackFiles.concat(glob.sync("**/*.smallstack.json", {
                cwd: config.rootDirectory,
                follow: true,
                absolute: true,
                ignore: ["**/dist/**", "**/node_modules/**", "**/undone/**"]
            }));

        if (allSmallstackFiles.length === 0)
            throw new Error("Aborting! No *.smallstack.json files found!");

        _.each(allSmallstackFiles, function (smallstackFile) {
            evaluateSmallstackFile(smallstackFile, extendings, roots, configuration);
        });


        // evaluate extends
        _.each(_.values(configuration), function (data) {
            if (data.modelClassName) {
                console.log(generatorLog("evaluating extends for : " + data.modelClassName));

                if (extendings[data.modelClassName] !== undefined) {
                    console.log(generatorLog("Extending type " + data.modelClassName));

                    throw new Error("Extending types currently not supported!");

                    // console.log(generatorLog("Before : ", JSON.stringify(data.config, null, 2)));
                    // lodash.mergeWith(data.config, extendings[data.modelClassName], function (a, b) {
                    //     if (_.isArray(a)) {
                    //         return a.concat(b);
                    //     }
                    // });
                    // console.log(generatorLog("After  : ", JSON.stringify(data.config, null, 2)));
                }
            }
        });



        // evaluate secured methods
        _.each(_.values(configuration), function (data) {
            console.log(generatorLog("evaluating secured methods for : " + data.modelClassName));
            data.methods = [];
            if (data.config.service !== undefined) {
                _.each(data.config.service.securedmethods, function (meth) {
                    var method = {};
                    method.sharedMethodsPath = getMethodsPath(data.rootDirectory, "shared");
                    method.serverMethodsPath = getMethodsPath(data.rootDirectory, "server");
                    method.clientMethodsPath = getMethodsPath(data.rootDirectory, "client");
                    method.methodName = data.collectionName + "-" + meth.name;
                    var params = [];
                    if (meth.modelAware)
                        params.push("modelId:string");
                    if (meth.parameters)
                        params = _.union(params, meth.parameters);
                    method.methodParameters = genFunctions.convertMethodParametersToTypescriptMethodParameters(params);
                    method.methodParameterChecks = genFunctions.getChecksForParameters(params, configuration);
                    if (meth.returns === undefined) {
                        console.warn(generatorLog("No method return type given for method '" + meth.name + "', using 'any'!"));
                        meth.returns = "any";
                        method.returns = "any";
                    } else
                        method.returns = meth.returns;
                    if (meth.visibility === undefined) {
                        console.warn(generatorLog("No method visibility type given for method '" + meth.name + "', using 'server'!"));
                        method.methodVisibility = "server";
                    } else {
                        if (meth.visibility === 'server' || meth.visibility === 'separate' || meth.visibility === 'shared')
                            method.methodVisibility = meth.visibility;
                        else
                            throw new Error("'" + meth.visibility + "' is not a known method visibility. Please use 'server', 'separate', or 'shared'!");
                    }
                    data.methods.push(method);
                });
            }
        });



        _.each(_.values(configuration), function (data) {

            console.log(generatorLog("processing : " + data.modelClassName));

            // extending the data
            data.functions = genFunctions;
            data.others = configuration;
            data.general = config;


            // process collections
            if (!data.config.collection || data.config.collection.skipGeneration === true || data.generate === false)
                generatorLog("  | - skipping generating collection since collection.skipGeneration === true");
            else {
                generatorLog("  | - generating collection");
                processTemplate(config.datalayerTemplatesPath + "/GeneratedCollection.ts", data.collectionsGeneratedDirectory + "/" + data.generatedCollectionClassName + ".ts", data);
                var collectionImpl = data.collectionsDirectory + "/" + data.collectionClassName + ".ts";
                if (!fs.existsSync(collectionImpl) || forcedGenerationMode)
                    processTemplate(config.datalayerTemplatesPath + "/Collection.ts", collectionImpl, data);
            }

            // process services
            if (!data.config.service || data.config.service.skipGeneration === true || data.generate === false)
                generatorLog("  | - skipping generating service since service.skipGeneration === true");
            else {
                generatorLog("  | - generating service");
                processTemplate(config.datalayerTemplatesPath + "/GeneratedService.ts", data.servicesGeneratedDirectory + "/" + data.generatedServiceClassName + ".ts", data);
                var serviceImpl = data.servicesDirectory + "/" + data.serviceClassName + ".ts";
                if (!fs.existsSync(serviceImpl) || forcedGenerationMode)
                    processTemplate(config.datalayerTemplatesPath + "/Service.ts", serviceImpl, data);
            }

            // process models
            if (data.config.model.skipGeneration === true || data.generate === false)
                generatorLog("  | - skipping generating model since model.skipGeneration === true");
            else {
                generatorLog("  | - generating model");
                processTemplate(config.datalayerTemplatesPath + "/GeneratedModel.ts", data.modelsGeneratedDirectory + "/" + data.generatedModelClassName + ".ts", data);
                var modelImpl = data.modelsDirectory + "/" + data.modelClassName + ".ts";
                if (!fs.existsSync(modelImpl) || forcedGenerationMode)
                    processTemplate(config.datalayerTemplatesPath + "/Model.ts", modelImpl, data);
            }

            // process secured methods
            if (data.config.service && data.config.service.securedmethods && data.config.service.skipSecuredMethodsGeneration === true || data.generate === false)
                generatorLog("  | - skipping generating secured methods since service.skipSecuredMethodsGeneration === true");
            else {
                generatorLog("  | - generating secured methods");
                _.each(data.methods, function (method) {


                    var methodClientFile = method.clientMethodsPath + "/" + method.methodName + ".ts";
                    var methodSharedFile = method.sharedMethodsPath + "/" + method.methodName + ".ts";
                    var methodServerFile = method.serverMethodsPath + "/" + method.methodName + ".ts";

                    switch (method.methodVisibility) {
                        case "shared":
                            if (!fs.existsSync(methodSharedFile))
                                processTemplate(config.datalayerTemplatesPath + "/SecureMethodShared.ts", methodSharedFile, method);
                            else generatorLog("Skipping generation of file since it exists already : ", methodSharedFile);
                            if (fs.existsSync(methodClientFile))
                                throw new Error("Using visibility=shared, so this file should not exist : " + methodClientFile);
                            if (fs.existsSync(methodServerFile))
                                throw new Error("Using visibility=shared, so this file should not exist : " + methodServerFile);
                            break;
                        case "separate":
                            if (!fs.existsSync(methodClientFile))
                                processTemplate(config.datalayerTemplatesPath + "/SecureMethodClient.ts", methodClientFile, method);
                            else generatorLog("Skipping generation of file since it exists already : ", methodClientFile);
                            if (!fs.existsSync(methodServerFile))
                                processTemplate(config.datalayerTemplatesPath + "/SecureMethodServer.ts", methodServerFile, method);
                            else generatorLog("Skipping generation of file since it exists already : ", methodServerFile);
                            if (fs.existsSync(methodSharedFile))
                                throw new Error("Using visibility=separate, so this file should not exist : " + methodSharedFile);
                            break;
                        case "server":
                            if (!fs.existsSync(methodServerFile))
                                processTemplate(config.datalayerTemplatesPath + "/SecureMethodServer.ts", methodServerFile, method);
                            else generatorLog("Skipping generation of file since it exists already : ", methodServerFile);
                            if (fs.existsSync(methodClientFile))
                                throw new Error("Using visibility=server, so this file should not exist : " + methodClientFile);
                            if (fs.existsSync(methodSharedFile))
                                throw new Error("Using visibility=server, so this file should not exist : " + methodSharedFile);
                            break;
                        default:
                            throw new Error("Still no method.visibility given for method : ", method.methodName);
                    }
                });
            }
        });

        _.each(_.keys(roots), function (root) {

            if (config.isProjectEnvironment()) {
                // generate services file
                console.log("generating service register file ...");
                processTemplate(config.datalayerTemplatesPath + "/datalayer_init.ts", root + "/init.ts", {
                    services: roots[root].services,
                    collections: roots[root].collections,
                    functions: genFunctions,
                    packagesPathRelative: roots[root].packagesPathRelative
                });
            }

            // // generate .gitignore
            // console.log("generating .gitignore file ...");
            // processTemplate(config.datalayerTemplatesPath + "/generated-folder.gitignore", root + "/.gitignore", {
            //     services: roots[root].services,
            //     functions: genFunctions
            // });
        });


        // generate services file
        console.log("generating index.ts file ...");
        _.each(_.keys(roots), (root) => {
            if (root === config.datalayerPath) {
                console.log(root);
                processTemplate(config.datalayerTemplatesPath + "/datalayer_index.ts", root + "/index.ts", {
                    services: roots[root].services,
                    models: roots[root].models,
                    collections: roots[root].collections,
                    functions: genFunctions
                });
            }
        });

        // generate server-counts file
        if (config.meteorDirectory) {
            console.log("generating server-counts.ts file ...");
            processTemplate(config.datalayerTemplatesPath + "/server-counts.ts", path.join(config.meteorDirectory, "server", "methods", "server-counts.ts"), {
                functions: genFunctions,
                config: config,
                configuration: _.values(configuration)
            });
        }

        if (config.datalayerPath) {
            // generate typesystem file
            console.log("generating typesystem.ts file ...");
            processTemplate(config.datalayerTemplatesPath + "/typesystem.ts", path.join(config.datalayerPath, "typesystem.ts"), {
                functions: genFunctions,
                configuration: _.values(configuration)
            });

            // installing npm dependencies
            // _.each(_.keys(roots), function (root) {
            //     console.log("installing npm dependencies for: " + root);
            //     exec("npm install", {
            //         cwd: root
            //     });
            // });


            // install dependencies
            console.log("installing npm dependencies for datalayer: " + config.datalayerPath);
            exec("npm install", {
                cwd: config.datalayerPath
            });

            // console.log("compiling datalayer for: " + config.datalayerPath);
            // exec("npm run build", {
            //     cwd: config.datalayerPath
            // });
        }


        notifier("Generating Source Code completed!");

        if (typeof done === "function")
            done();

    } catch (e) {
        console.error("Could not generate source code!", e);
    }
}



function generatorLog() {
    var content = ""; //new Date().toLocaleString() + "     ";
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
    try {
        templating.compileFileToFile(from, to, replacers);
        //     var template = fs.readFileSync(from);
        //     var content = lodash.template(template);
        //     fs.createFileSync(to);
        //     fs.writeFileSync(to, content(replacers));
    } catch (e) {
        console.log(e);
        throw new Error("Exception while processing template : \n\tfrom  : " + from + "\n\tto    : " + to + "\n\terror : " + e);
    }

}

function checkJson(variable, errorMessage) {
    if (variable === undefined || variable === null)
        errors.push(errorMessage);
}

function prepareDataLayerDirectory() {
    fs.ensureDirSync(config.datalayerPath);

    // generate package.json
    console.log("generating datalayer package.json file ...");
    if (fs.existsSync(config.datalayerPath + "/package.json"))
        console.log("    ... skipped since file exists already! Remove it for re-generating!");
    else
        processTemplate(config.datalayerTemplatesPath + "/datalayer_package.json", config.datalayerPath + "/package.json", {});

    if (!fs.existsSync(config.datalayerPath + "/index_custom.ts"))
        processTemplate(config.datalayerTemplatesPath + "/datalayer_index_custom.ts", config.datalayerPath + "/index_custom.ts", {});

    // generate package_bundle.json
    console.log("generating datalayer package_bundle.json file ...");
    processTemplate(config.datalayerTemplatesPath + "/datalayer_package_bundle.json", config.datalayerPath + "/package_bundle.json", {});

    // generate tsconfig.json
    console.log("generating datalayer tsconfig.json file ...");
    processTemplate(config.datalayerTemplatesPath + "/datalayer_tsconfig.json", config.datalayerPath + "/tsconfig.json", {});

    // generate gitignore
    console.log("generating datalayer gitignore ...");
    processTemplate(config.datalayerTemplatesPath + "/datalayer.gitignore", config.datalayerPath + "/.gitignore", {});

    // generate rollup.config.js
    console.log("generating datalayer rollup.config.js file ...");
    processTemplate(config.datalayerTemplatesPath + "/datalayer_rollup.config.js", config.datalayerPath + "/rollup.config.js", {});
}

function getMethodsPath(rootDirectory, clientServerBoth) {
    if (config.meteorDirectory)
        return path.join(config.meteorDirectory, clientServerBoth + "/methods");
    if (config.smallstackFound(config.rootDirectory))
        return path.join(rootDirectory, "methods", clientServerBoth);
}


function evaluateSmallstackFile(smallstackFile, extendings, roots, configuration, additionalConfiguration) {
    console.log(generatorLog("preparing :       " + smallstackFile));


    var generate = !additionalConfiguration || additionalConfiguration.generate !== false;

    // read in data          
    var content = fs.readFileSync(smallstackFile);
    var jsonContent = JSON.parse(content);

    // "just" extending?
    if (jsonContent.extends !== undefined) {
        console.log(generatorLog("found schema extending for : " + jsonContent.extends));
        if (extendings[jsonContent.extends] === undefined)
            extendings[jsonContent.extends] = {};
        // console.log("before extendings[jsonContent.extends]: ", JSON.stringify(extendings[jsonContent.extends], null, 2));
        lodash.merge(extendings[jsonContent.extends], jsonContent, function (a, b) {
            if (_.isArray(a)) {
                return a.concat(b);
            }
        });
        // console.log("after  extendings[jsonContent.extends]: ", JSON.stringify(extendings[jsonContent.extends], null, 2));
        return;
    }


    // generate files and directories            
    var rootDirectory = undefined;
    var smallstackFilePath = path.dirname("" + smallstackFile);
    if (config.isSmallstackEnvironment() || generate === false)
        rootDirectory = smallstackFilePath;
    else if (config.isProjectEnvironment() && config.datalayerPath)
        rootDirectory = config.datalayerPath;
    else
        throw new Error("Could not guess a possible root directory for " + smallstackFile);
    console.log("root directory : ", rootDirectory);
    if (roots[rootDirectory] === undefined) {
        roots[rootDirectory] = {};
        roots[rootDirectory].rootDirectory = rootDirectory;
        roots[rootDirectory].services = [];
        roots[rootDirectory].models = [];
        roots[rootDirectory].collections = [];
        if (config.isSmallstackEnvironment() && (!additionalConfiguration || additionalConfiguration.generate === false)) {
            // check where the root of the smallstack folder is
            var relative = "../";
            for (var tryIt = 0; tryIt < 10; tryIt++) {
                if (config.smallstackModuleFound(path.resolve(path.join(rootDirectory, relative)))) {
                    roots[rootDirectory].packagesPathRelative = relative;
                    roots[rootDirectory].moduleName = require(path.resolve(path.join(rootDirectory, relative, "package.json"))).name;
                    break;
                } else {
                    relative += "../";
                }
            }
            if (roots[rootDirectory].packagesPathRelative === undefined)
                throw new Error("Could not find relative path to smallstack framework from " + rootDirectory);
        } else {
            if (smallstackFilePath.endsWith("/datalayer/types"))
                roots[rootDirectory].moduleName = undefined;
            else if (smallstackFilePath.endsWith("/modules/core-common/types"))
                roots[rootDirectory].moduleName = "@smallstack/core-common";
            else if (smallstackFilePath.endsWith("/modules/core-client/types"))
                roots[rootDirectory].moduleName = "@smallstack/core-client";
            else if (smallstackFilePath.endsWith("/modules/core-server/types"))
                roots[rootDirectory].moduleName = "@smallstack/core-server";
            else
                throw new Error("Could not find module name for :" + smallstackFilePath);
            roots[rootDirectory].packagesPathRelative = "";
        }
    }

    var id = jsonContent.model.name;
    if (id === undefined || id === null || id === "")
        throw new Error("Please provide a model.name!");


    // fill the configuration
    if (configuration[id] !== undefined)
        throw new Error("Configuration for ID '" + id + "' already exists!!!");
    configuration[id] = {};
    configuration[id].root = roots[rootDirectory];

    // generals
    configuration[id].config = jsonContent;
    configuration[id].filename = smallstackFile;
    if (jsonContent.collection)
        configuration[id].collectionName = jsonContent.collection.name;
    configuration[id].rootDirectory = rootDirectory;
    configuration[id].generatedDirectory = path.join(configuration[id].rootDirectory, "generated");

    // model variables
    configuration[id].modelsDirectory = path.join(configuration[id].rootDirectory, "models");
    configuration[id].modelsGeneratedDirectory = path.join(configuration[id].generatedDirectory, "models");
    configuration[id].modelClassName = capitalize(jsonContent.model.name);
    configuration[id].generatedModelClassName = "Generated" + configuration[id].modelClassName;
    configuration[id].relativePathFromModelToGeneratedModel = path.relative(configuration[id].modelsDirectory, configuration[id].modelsGeneratedDirectory).replace(/\\/g, "/") + "/" + configuration[id].generatedModelClassName;
    configuration[id].relativePathFromGeneratedModelToModel = path.relative(configuration[id].modelsGeneratedDirectory, configuration[id].modelsDirectory).replace(/\\/g, "/") + "/" + configuration[id].modelClassName;
    // configuration[id].relativePathFromGeneratedModelToPackages = path.relative(configuration[id].modelsGeneratedDirectory, config.packagesDirectory).replace(/\\/g, "/");
    if (generate)
        roots[configuration[id].rootDirectory].models.push(configuration[id].modelClassName);

    // collection variables
    configuration[id].collectionsDirectory = path.join(configuration[id].rootDirectory, "collections");
    configuration[id].collectionsGeneratedDirectory = path.join(configuration[id].generatedDirectory, "collections");
    configuration[id].collectionClassName = capitalize(configuration[id].collectionName) + "Collection";
    configuration[id].generatedCollectionClassName = "Generated" + configuration[id].collectionClassName;
    configuration[id].relativePathFromCollectionToGeneratedCollection = path.relative(configuration[id].collectionsDirectory, configuration[id].collectionsGeneratedDirectory).replace(/\\/g, "/") + "/" + configuration[id].generatedCollectionClassName;
    configuration[id].relativePathFromCollectionToModel = path.relative(configuration[id].collectionsGeneratedDirectory, configuration[id].modelsDirectory).replace(/\\/g, "/") + "/" + configuration[id].modelClassName;
    configuration[id].relativePathFromCollectionToGeneratedModel = path.relative(configuration[id].collectionsGeneratedDirectory, configuration[id].modelsGeneratedDirectory).replace(/\\/g, "/") + "/" + configuration[id].generatedModelClassName;
    // configuration[id].relativePathFromGeneratedCollectionToCollectionService = path.relative(configuration[id].collectionsGeneratedDirectory, path.join(config.packagesDirectory, "smallstack-collections")).replace(/\\/g, "/") + "/CollectionService.ts";
    // configuration[id].relativePathFromGeneratedCollectionToSmallstackCollection = path.relative(configuration[id].collectionsGeneratedDirectory, path.join(config.packagesDirectory, "smallstack-collections")).replace(/\\/g, "/") + "/SmallstackCollection.ts";
    configuration[id].skipCollectionGeneration = !jsonContent.collection || jsonContent.collection.skipGeneration === true;
    if (!configuration[id].skipCollectionGeneration && generate)
        roots[configuration[id].rootDirectory].collections.push(configuration[id].collectionClassName);


    // service variables
    configuration[id].servicesDirectory = path.join(configuration[id].rootDirectory, "services");
    configuration[id].servicesGeneratedDirectory = path.join(configuration[id].generatedDirectory, "services");
    configuration[id].serviceClassName = genFunctions.getServiceName(jsonContent);
    configuration[id].generatedServiceClassName = "Generated" + configuration[id].serviceClassName;
    configuration[id].relativePathFromServiceToGeneratedService = path.relative(configuration[id].servicesDirectory, configuration[id].servicesGeneratedDirectory).replace(/\\/g, "/") + "/" + configuration[id].generatedServiceClassName;
    configuration[id].relativePathFromServiceToModel = path.relative(configuration[id].servicesGeneratedDirectory, configuration[id].modelsDirectory).replace(/\\/g, "/") + "/" + configuration[id].modelClassName;
    // configuration[id].relativePathFromGeneratedServiceToPackages = path.relative(configuration[id].servicesGeneratedDirectory, config.packagesDirectory).replace(/\\/g, "/");
    configuration[id].relativePathFromGeneratedModelToService = path.relative(configuration[id].modelsGeneratedDirectory, configuration[id].servicesDirectory).replace(/\\/g, "/") + "/" + configuration[id].serviceClassName;
    configuration[id].skipServiceGeneration = !jsonContent.service || jsonContent.service.skipGeneration === true;
    if (!configuration[id].skipServiceGeneration && generate)
        roots[configuration[id].rootDirectory].services.push(configuration[id].serviceClassName);

    if (additionalConfiguration !== undefined)
        configuration[id] = _.extend(configuration[id], additionalConfiguration);
}
