module.exports = function (grunt) {
	grunt.registerTask("smallstackHelp", function () {
        function printTask(taskName, taskDescription) {
            grunt.log.writeln(grunt.log.table([2, 6, 25, 1, 100], ["", "grunt ", taskName, " ", taskDescription]));
        }

        function printArgument(name, description) {
            grunt.log.writeln(grunt.log.table([4, 31, 1, 100], ["", name, " ", description]));
        }

        function printSmallHeader(title) {
            grunt.log.writeln("\n");
            grunt.log.writeln(title);
        }

        printSmallHeader("Compilation Tasks");
        printTask("compile", "Compiles the whole project");
        printTask("compile:auto", "Compiles the whole project and watches the sourcecode for changes");
        printTask("compile:project", "Compiles only the project files");
        printTask("compile:packages", "Compiles only the packages files");
        printTask("clean", "Deletes all generated and compiled files");

        printSmallHeader("Android Tasks");
        printTask("android:createApp", "Creates an unaligned Android App and, if keystore file is availabe, an aligned one as well");
        printArgument("--deploy.env", "Sets the deployment environment that shall be used");

        printSmallHeader("Smallstack Tasks");
        printTask("packages:update", "Runs the Smallstack Packages Configuration");
        printTask("generate", "(Re-)generates all generated source files");
        printTask("generate:sources", "(Re-)generates source files based on *.smallstack.json files");
        printTask("ui", "Runs the UI Generator Wizard");

        printSmallHeader("Deployment Tasks");
        printTask("deploy", "Deploys the project with the default deployment (dev)");
        printArgument("--deploy.env", "Sets the deployment environment that shall be used");
        printTask("deploy:createDefaults", "Creates a default deployment configuration file, backs up existing ones");
        printTask("deploy:apache-conf", "Shows the apache/passenger phusion configuration for the current deployment");
        printArgument("--deploy.env", "Sets the deployment environment that shall be used");
        printTask("jenkins:createJobs", "Creates Jenkins Jobs for all environments");

        printSmallHeader("Backup Tasks");
        printTask("backup", "Creates a mongoDB and a media folder backup and zips it to the backups directory");
        printArgument("--deploy.env", "Sets the deployment environment that shall be used");

        printSmallHeader("Documentation Tasks");
        printTask("doc", "Creates documentation for the project and all packages available");
    });
}