module.exports = function (grunt) {


    var path = require("path");
    var fs = require("fs-extra");
    var _ = require("underscore");
    var archiver = require("archiver");

    require('load-grunt-tasks')(grunt);
    grunt.loadTasks("smallstack-core/generator/resources/grunt/tasks");
    
    // get all bump files
    var bumpFiles = ['package.json', 'smallstack-core/generator/yo/package.json'];
    grunt.util.recurse(grunt.file.expand("smallstack-*/package.js"), function (file) {
        bumpFiles.push(file);
    });

    grunt.initConfig({
        bump: {
            options: {
                files: bumpFiles,
                updateConfigs: [],
                commit: true,
                commitMessage: 'version changed to v%VERSION%',
                commitFiles: bumpFiles,
                developVersionCommitMsg: 'Increased version for development',
                tagName: '%VERSION%',
                createTag: true,
                bumpVersion: true
            }
        },
        sg_release: {
            release: {
                options: {
                    skipBowerInstall: true,
                    skipNpmInstall: true,
                    developBranch: 'develop',
                    masterBranch: 'master',
                    files: bumpFiles,
                    commitMessage: 'Release v%VERSION%',
                    commitFiles: ['-a'],
                    pushTo: 'origin',
                    mergeOptions: '--strategy-option theirs'
                }
            }
        },
        ts: {
            smallstack: {
                src: ["**/*.ts", "!**/*.d.ts", "!smallstack-core/generator/**/*", "!**/node_modules/**/*", "!tmp/**"],
                options: {
                    sourceMap: false,
                    module: "commonjs",
                    declaration: false,
                    removeComments: false,
                    failOnTypeErrors: true
                }
            }
        }
    });

    grunt.registerTask("compile", ["clean", "ts:smallstack"]);
     
    // custom tasks
    grunt.registerTask("production:zip", ["clean", "createProductionZip"]);

    grunt.registerTask("createProductionZip", function () {
        var done = this.async();
        
        // special clean
        fs.removeSync("smallstack-core/generator/yo/node_modules");
        fs.removeSync("smallstack-media/.npm");

        var workingDirectory = path.join("tmp", "production");
        fs.emptyDirSync(workingDirectory);
        
        // copy packages to working directory
        console.log("preparing files...");
        var smallstackDirectories = grunt.file.expand("smallstack-*");
        _.each(smallstackDirectories, function (smDir) {
            fs.copySync(smDir, path.join(workingDirectory, smDir), {
                filter: function (path) {
                    if (path.indexOf("node_modules") !== -1)
                        return false;
                    if (path.indexOf("generated") !== -1 && grunt.file.isDir(path))
                        return false;

                    console.log("copying : ", path);
                    return true;
                }
            });
        });  
        
        // zip it
        var packageJSON = grunt.file.readJSON("package.json");
        var output = fs.createWriteStream("tmp/smallstack-" + packageJSON.version + ".zip");
        var archive = archiver('zip');
        output.on('close', function () {
            console.log(archive.pointer() + ' total bytes');
            
            // delete tmp folder
            fs.removeSync(workingDirectory);
            done();
        });
        archive.on('error', function (err) {
            throw err;
        });
        archive.pipe(output);
        archive.directory(workingDirectory, "");
        archive.finalize();
    });
};