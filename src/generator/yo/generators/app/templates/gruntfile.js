/**
 * THIS FILE IS AUTO-GENERATED AND WILL BE REPLACED BY 'yo smallstack'
 */


module.exports = function (grunt) {

    // node tasks
    var _ = require("underscore");
    var path = require("path");
    var runsync = require('runsync');
    var fs = require("fs-extra");
    var DecompressZip = require(process.cwd() + "/node_modules/decompress-zip");

    // grunt tasks
    require('load-grunt-tasks')(grunt);
    require('time-grunt')(grunt);
    var coreGruntTasksDirectory = "app/packages/smallstack-core/generator/resources/grunt/tasks";
    if (grunt.file.exists(coreGruntTasksDirectory)) {
        grunt.loadTasks(coreGruntTasksDirectory);
        console.log("Grunt Tasks loaded from " + coreGruntTasksDirectory + "!");
    } else
        console.warn("Grunt Tasks could not be loaded from " + coreGruntTasksDirectory + "!");
    
    // shell helper
    function exec(command, options) {
        console.log("  executing : ", command);
        runsync.shell(command, options);
    }
    
    // properties
    var smallstackZipFilePath = grunt.option("smallstack.zipfiles.path") || "smallstack";

    // packages
    var availablePackages = ["smallstack-angular-components", "smallstack-angular-core", "smallstack-angular-login", "smallstack-collections", "smallstack-core",
        "smallstack-configuration", "smallstack-hotcode-push", "smallstack-i18n", "smallstack-ioc", "smallstack-navigation", "smallstack-location",
        "smallstack-user", "smallstack-testdata", "smallstack-utils", "smallstack-analytics", "smallstack-social", "smallstack-notifications",
        "smallstack-media", "smallstack-messaging", "smallstack-cookies", "smallstack-beta", "smallstack-migration", "smallstack-roles",
        "smallstack-angular-messaging"];

    var projectFiles = ["app/shared/**/*.ts", "app/server/**/*.ts", "app/client/**/*.ts"];
    var packagesFiles = ["app/packages/**/*.ts", "!app/packages/**/*.d.ts", "!app/packages/smallstack-core/generator/**/*"];

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        shell: {
            runMeteor: {
                command: [
                    "cd app",
                    "meteor"
                ].join('&&')
            },
            mgp: {
                command: ["cd app", "mgp"].join("&&")
            },
            mgpLink: {
                command: ["cd app", "mgp link"].join("&&")
            }
        },
        watch: {
            project: {
                files: projectFiles,
                tasks: ["compile:project"]
            },
            packages: {
                files: packagesFiles,
                tasks: ["compile:packages"]
            }
        },
        ts: {
            project: {
                src: projectFiles,
                options: {
                    removeComments: false,
                    failOnTypeErrors: true,
                    inlineSourceMap: true,
                    inlineSources: true,
                    newLine: "CRLF"
                },
                outDir: "tmp/built/app"
            },
            packages: {
                src: packagesFiles,
                options: {
                    removeComments: false,
                    failOnTypeErrors: true,
                    inlineSourceMap: true,
                    inlineSources: true,
                    newLine: "CRLF"
                },
                outDir: "tmp/built/packages"
            }
        },
        concurrent: {
            tasks: ["run", "watch"],
            options: {
                logConcurrentOutput: true

            }
        },
        prompt: {
            packages: {
                options: {
                    questions: [
                        {
                            config: "smallstack.mode",
                            type: 'list',
                            message: 'smallstack location :',
                            choices: [
                                { name: "locally checked out version (e.g. develop, master or a feature branch)", value: "local" },
                                { name: "downloaded zip file (placed in " + smallstackZipFilePath + ")", value: "downloadedZip" }
                            ],
                            when: function () {
                                return !grunt.option("smallstack.mode");
                            }
                        },
                        {
                            config: "smallstack.path",
                            type: 'input',
                            message: 'relative path from project root to local smallstack directory :',
                            default: "../smallstack",
                            when: function (answers) {
                                return answers["smallstack.mode"] === "local";
                            }
                        },
                        {
                            config: "smallstack.zip",
                            type: 'list',
                            message: 'Select the downloaded file : ',
                            choices: function () {
                                var choices = [];
                                _.each(grunt.file.expand(smallstackZipFilePath + "/smallstack-*.zip"), function (zipPath) {
                                    choices.push(zipPath);
                                });
                                return choices;
                            },
                            when: function (answers) {
                                return answers["smallstack.mode"] === "downloadedZip";
                            }
                        }
                    ]
                }
            },
            jenkins: {
                options: {
                    questions: [
                        {
                            config: "jenkins.username",
                            type: 'input',
                            message: 'Your Jenkins Username'
                        },
                        {
                            config: "jenkins.password",
                            type: 'password',
                            message: 'Your Jenkins Password'
                        }
                    ]
                }
                }
            },
            notify_hooks: {
                options: {
                    enabled: true,
                    max_jshint_notifications: 5,
                    success: true,
                    duration: 3
            }
        }
    });    
    
    // config stuff
    grunt.config.set("project.name", grunt.option("project.name") || "<%= projectName %>");
    grunt.config.set("project.builtDirectory", path.resolve("built"));
    grunt.config.set("project.appDirectory", path.resolve("app"));
    grunt.task.run('notify_hooks');

    // main tasks
    grunt.registerTask("default", "smallstackHelp");
    grunt.registerTask("test", []);
    grunt.registerTask("run", ["shell:runMeteor"]);
    grunt.registerTask("run:auto", ["compile", "concurrent"]);
    grunt.registerTask("ci", ["readOptions", "persistPackageConfiguration", "generate", "compile", "test", "deploy", "android"]);
    grunt.registerTask("ci:packages", ["deploy:init", "deploy:prepare", "persistPackageConfiguration"]);
    grunt.registerTask("ci:build", ["generate", "compile", "test"]);
    grunt.registerTask("ci:deploy", ["generate", "compile", "deploy"]);
    grunt.registerTask("packages:update", ["prompt:packages", "persistPackageConfiguration"]);
    grunt.registerTask("doc", ["typedoc:project"]);
    grunt.registerTask("help", ["smallstackHelp"]);
    
    // helpers for max
    grunt.registerTask("gca", ["generate", "compile:auto"]);

    grunt.registerTask("readOptions", function () {
        grunt.config.set("smallstack.mode", grunt.option("smallstack.mode"));
        grunt.config.set("smallstack.path", grunt.option("smallstack.path"));
        grunt.config.set("smallstack.version", grunt.option("smallstack.version"));
    });

    grunt.registerTask("persistPackageConfiguration", function () {

        var mode = grunt.config.get("smallstack.mode") || grunt.option("smallstack.mode");
        console.log("Mode    : ", mode);
        if (mode === "local") {
            var smallstackPath = grunt.config("smallstack.path") || grunt.option("smallstack.path");
            if (smallstackPath === undefined)
                throw Error("Smallstack Version is set to 'local' but no smallstack.path is given!");
            var localPackagesContent = {};
            _.each(availablePackages, function (availablePackage) {
                localPackagesContent[availablePackage] = {
                    "path": "../" + smallstackPath + "/" + availablePackage
                }
            });
            grunt.file.write("app/local-packages.json", JSON.stringify(localPackagesContent));
            grunt.task.run("shell:mgpLink");
        } else if (mode === "downloadedZip") {
            var done = this.async();
            var smallstackZipPath = grunt.config.get("smallstack.zip") || grunt.option("smallstack.zip");
            if (smallstackZipPath === undefined)
                throw Error("Smallstack Mode is set to 'downloadedZip' but no smallstack.zip is given!");
            console.log("zip path : ", smallstackZipPath);
            
            // clean packages directory
            fs.emptyDirSync("app/packages");
            
            // unzip file
            var unzipper = new DecompressZip(smallstackZipPath);
            unzipper.on('error', function (err) {
                console.log('Caught an error', err);
            });

            unzipper.on('extract', function (log) {
                console.log('Finished extracting');
                done();
            });

            unzipper.on('progress', function (fileIndex, fileCount) {
                console.log('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
            });

            unzipper.extract({
                path: 'app/packages',
                filter: function (file) {
                    return file.type !== "SymbolicLink";
                }
            });



        }
        else
            throw new Error("No valid smallstack version given (neither 'local' nor 'remote')!");
    });


    function appendLineToFile(contentLine, filePath) {
        var fileContent = contentLine + "\n";
        if (grunt.file.exists(filePath))
            fileContent = grunt.file.read(filePath) + fileContent;
        grunt.file.write(filePath, fileContent, {
            encoding: "UTF-8"
        });
    }
    
    // deploy operations
    
    grunt.registerTask("deploy:init", function () {
        grunt.config.set("deploy.deploymentsPath", path.resolve("deployment"));
        grunt.config.set("deploy.deploymentsFileName", "deployments");
        grunt.config.set("deploy.deploymentsFileEnding", ".json");
        grunt.config.set("deploy.deploymentsFile", path.join(grunt.config.get("deploy.deploymentsPath"), grunt.config.get("deploy.deploymentsFileName") + grunt.config.get("deploy.deploymentsFileEnding")));

    });

    grunt.registerTask("deploy:prepare", function () {

        if (!grunt.file.exists(grunt.config.get("deploy.deploymentsFile"))) {
            throw new Error("Deployments File (" + grunt.config.get("deploy.deploymentsFile") + ") not found. Use 'grunt deploy:createDefaultDeploymentFile' to create a default one!");
        }

        var deploymentFileContent = grunt.file.readJSON(grunt.config.get("deploy.deploymentsFile"));
        var selectedDeployment = grunt.option("deploy.env") || "dev";
        var currentDeployment = deploymentFileContent[selectedDeployment];
        if (currentDeployment === undefined)
            throw new Error("Could not find deployment with name '" + selectedDeployment + "'! (You can specify the deployment via --deploy.env NAME)");
        currentDeployment.name = selectedDeployment;
        currentDeployment.database = { name: "<%=projectName%>_" + currentDeployment.name };
        grunt.config.set("deploy.currentDeployment", currentDeployment);
    });

    function getCurrentDeployment() {
        var conf = grunt.config.get("deploy.currentDeployment");
        if (conf === undefined)
            throw new Error("Could not load deploy configuration, maybe deploy:prepare didn't get called properly!");
        return conf;
    }
};