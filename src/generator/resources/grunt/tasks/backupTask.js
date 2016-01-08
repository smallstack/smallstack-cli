
module.exports = function (grunt) {
    
    var child_process = require('child_process');
    var path = require('path');
    var runsync = require(process.cwd() + "/node_modules/runsync");
    var fs = require(process.cwd() + "/node_modules/fs-extra");
    var archiver = require(process.cwd() + "/node_modules/archiver");
    var dateFormat = require(process.cwd() + "/node_modules/dateformat");
    var inquirer = require(process.cwd() + "/node_modules/inquirer");
    var DecompressZip = require(process.cwd() + "/node_modules/decompress-zip");



    function exec(command, options) {
        console.log("  executing : ", command);
        if (child_process !== undefined && typeof child_process.execSync === 'function')
            child_process.execSync(command, [], options);
        else
            runsync.shell(command, options);
    }

    grunt.registerTask("backup", ["deploy:init", "deploy:prepare", "backup:prepare", "backup:createBackup"]);
    grunt.registerTask("restore", ["deploy:init", "deploy:prepare", "backup:prepare", "backup:doRestore"]);

    grunt.registerTask("backup:prepare", function () {
        var deployment = grunt.config.get("deploy.currentDeployment");

        grunt.config.set("backup.directory", "backups");
        grunt.config.set("backup.mongo.host", grunt.option("backup.mongo.host") || "localhost");
        grunt.config.set("backup.mongo.port", grunt.option("backup.mongo.port") || "27017");
        grunt.config.set("backup.mongo.database.name", grunt.option("backup.mongo.database.name") || deployment.database.name);
        grunt.config.set("backup.mongo.username", grunt.option("backup.mongo.username") || "");
        grunt.config.set("backup.mongo.password", grunt.option("backup.mongo.password") || "");
        
        // zip file       
        grunt.config.set("backup.zip.prefix", grunt.config.get("project.name") + "-" + grunt.config.get("deploy.currentDeployment.name") + "-");
        grunt.config.set("backup.zip.dateformat", "dd-mm-yyyy-hh-MM-ss");
        grunt.config.set("backup.zip.filename", grunt.config.get("backup.zip.prefix") + dateFormat(new Date(), grunt.config.get("backup.zip.dateformat")) + ".zip");
    });

    grunt.registerTask("backup:createBackup", function () {

        var deployment = grunt.config.get("deploy.currentDeployment");
        var done = this.async();

        var workingTmpDirectory = "backups/tmp";
        var mongoDBDirectory = path.join(workingTmpDirectory, "mongodb");
        var mediasDirectory = path.join(workingTmpDirectory, "medias");
        var zipFilePath = path.join("backups", grunt.config.get("backup.zip.filename"));
        
        // create tmp folder
        fs.emptyDirSync(mongoDBDirectory);
        fs.ensureDirSync(mongoDBDirectory);
        fs.emptyDirSync(mediasDirectory);
        fs.ensureDirSync(mediasDirectory);
        
        // create mongodump
        var authentication = grunt.config.get("backup.mongo.username") === "" ? "" : "--username \"" + grunt.config.get("backup.mongo.username") + "\" --password \"" + grunt.config.get("backup.mongo.password") + "\""
        exec("mongodump --host \"" + grunt.config.get("backup.mongo.host") + "\" --port \"" + grunt.config.get("backup.mongo.port") + "\" " + authentication + " --db \"" + grunt.config.get("backup.mongo.database.name") + "\" --out \"" + mongoDBDirectory + "\"");
        fs.copySync(path.join(mongoDBDirectory, grunt.config.get("backup.mongo.database.name")), mongoDBDirectory);
        fs.removeSync(path.join(mongoDBDirectory, grunt.config.get("backup.mongo.database.name")));
        
        // copy media folder to backup dir
        var mediaPath = path.join(deployment.rootServerPath, "medias");
        if (grunt.file.exists(mediaPath) && grunt.file.isDir(mediaPath)) {
            console.log("backing up medias : " + mediaPath);
            fs.copySync(mediaPath, mediasDirectory);
        } else
            console.warn("no medias found, not backing up : " + mediaPath);
        
        // create zip file
        var output = fs.createWriteStream(zipFilePath);
        var archive = archiver('zip');
        output.on('close', function () {
            console.log(archive.pointer() + ' total bytes');
            
            // delete tmp folder
            fs.removeSync(workingTmpDirectory);
            done();
        });
        archive.on('error', function (err) {
            throw err;
        });
        archive.pipe(output);
        archive.directory(workingTmpDirectory, "");
        archive.finalize();
    });


    grunt.registerTask("backup:doRestore", function () {

        var done = this.async();
        inquirer.prompt({
            type: "confirm",
            name: "do",
            message: "THIS WILL OVERWRITE ALL USER DATA INCLUDING DATABASE AND MEDIA, ARE YOU SHURE YOU WANT TO CONTINUE?",
            default: false
        }, function (answers) {
            if (answers.do === true) {
                inquirer.prompt({
                    type: "list",
                    name: "backup",
                    message: "Which backup would you like to restore?",
                    choices: function () {
                        var backups = grunt.file.expand("backups/*.zip");
                        if (backups.length === 0)
                            throw new Error("No backups found. Please create backups via 'grunt backup' or move them manually to the 'backups' folder!");
                        return grunt.file.expand("backups/*.zip");
                    }
                }, function (answers) {

                    var backupFile = answers.backup;
                    var mongoDBDirectory = "backups/tmp/mongodb";
                    fs.emptyDirSync("backups/tmp");
                    fs.ensureDirSync("backups/tmp");
                    var unzipper = new DecompressZip(backupFile);
                    unzipper.on('error', function (err) {
                        console.log('Caught an error', err);
                    });

                    unzipper.on('extract', function (log) {
                        console.log('Finished extracting');                       
                                            
                        // restore medias
                        fs.emptyDirSync("medias");
                        fs.emptyDirSync("medias/tmp");
                        fs.ensureDirSync("medias/tmp");
                        if (grunt.file.exists("backups/tmp/medias"))
                            fs.copySync("backups/tmp/medias", "medias");
                        else
                            console.warn("No medias found in backup!");
                    
                        // import mongodb
                        if (grunt.file.exists("backups/tmp/mongodb")) {
                            // find sub directory
                            var authentication = grunt.config.get("backup.mongo.username") === "" ? "" : "--username \"" + grunt.config.get("backup.mongo.username") + "\" --password \"" + grunt.config.get("backup.mongo.password") + "\""
                            exec("mongorestore --host \"" + grunt.config.get("backup.mongo.host") + "\" --port \"" + grunt.config.get("backup.mongo.port") + "\" " + authentication + " --drop --db \"" + grunt.config.get("backup.mongo.database.name") + "\" --dir \"" + mongoDBDirectory + "\"");
                        }
                        else
                            console.warn("No mongodb files found in backup!");

                        fs.removeSync("backups/tmp");
                        done();
                    });

                    unzipper.on('progress', function (fileIndex, fileCount) {
                        console.log('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
                    });

                    unzipper.extract({
                        path: 'backups/tmp',
                        filter: function (file) {
                            return file.type !== "SymbolicLink";
                        }
                    });


                });
            }
            else {
                console.log("aborting...");
                process.exit();
            }
        });
    });
}