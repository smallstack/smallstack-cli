var generators = require('yeoman-generator');

var fs = require("fs-extra");

module.exports = generators.Base.extend({
    prompting: function () {
        if (this.config.get("project.name") === undefined) {
            var done = this.async();
            this.prompt([{
                type: 'input',
                name: 'name',
                message: 'project name (lowercase letters, no spaces)',
                default: this.appname,
                validate: function (input) {
                    return (typeof input === "string" && input.length > 2 && /^[a-z]*$/.test(input));
                }
            }], function (answers) {
                this.config.set("project.name", answers.name);
                done();
            }.bind(this));
        }
    },
    writing: function () {
        var done = this.async();

        // create gruntfile.js
        this.fs.copyTpl(this.templatePath('gruntfile.js'), this.destinationPath('gruntfile.js'), { projectName: this.config.get("project.name") });

        // create mobile config template
        if (!this.fs.exists(this.destinationPath("deployment/mobile-config-template.js")))
        this.fs.copyTpl(this.templatePath('mobile-config-template.js'), this.destinationPath('deployment/mobile-config-template.js'));

        // create package.json
        this.fs.copyTpl(this.templatePath('package.json'), this.destinationPath('package.json'), { projectName: this.config.get("project.name") });

        // create default .gitignore
        if (!this.fs.exists(this.destinationPath(".gitignore")))
            this.fs.copyTpl(this.templatePath('default.gitignore'), this.destinationPath('.gitignore'));
            
        // create deployment scripts
        // this.fs.copyTpl(this.templatePath('apache-configuration.template'), this.destinationPath('deployment/apache-configuration.template'), { projectName: this.config.get("project.name") });
        // this.fs.copyTpl(this.templatePath('jenkins-templates/build-job.xml'), this.destinationPath('deployment/jenkins/build-job.xml'), { projectName: this.config.get("project.name") });
        // this.fs.copyTpl(this.templatePath('jenkins-templates/deploy-job.xml'), this.destinationPath('deployment/jenkins/deploy-job.xml'), { projectName: this.config.get("project.name") });
        // this.fs.copyTpl(this.templatePath('jenkins-templates/android-job.xml'), this.destinationPath('deployment/jenkins/android-job.xml'), { projectName: this.config.get("project.name") });
        // this.fs.copyTpl(this.templatePath('jenkins-templates/backup-job.xml'), this.destinationPath('deployment/jenkins/backup-job.xml'), { projectName: this.config.get("project.name") });
        // this.fs.copyTpl(this.templatePath('jenkins-templates/partials/scm.xml'), this.destinationPath('deployment/jenkins/partials/scm.xml'), { projectName: this.config.get("project.name") });
        // this.fs.copyTpl(this.templatePath('jenkins-templates/partials/scm-without-smallstack.xml'), this.destinationPath('deployment/jenkins/partials/scm-without-smallstack.xml'), { projectName: this.config.get("project.name") });
        // this.fs.copyTpl(this.templatePath('jenkins-templates/view.xml'), this.destinationPath('deployment/jenkins/view.xml'), { projectName: this.config.get("project.name") });
            
        // create application folder
        var appDirectory = this.destinationPath('app');
        console.log("Using App Folder : ", appDirectory);
        if (this.fs.exists(appDirectory + "/.meteor/packages"))
            console.log("Meteor Application exists, skipping code generation!");
        else {
            this.spawnCommandSync('meteor', ['create', this.config.get("project.name")]);
            fs.rename(this.destinationPath() + "/" + this.config.get("project.name"), appDirectory);
        }

        // copy grunt templates
        // this.fs.copy(this.templatePath('grunt-templates'), this.destinationPath() + "/grunt");

        // copy ui templates
        // this.fs.copy(this.templatePath('ui-templates'), this.destinationPath() + "/grunt/ui-templates");

        // copy grunt tasks
        // this.fs.copy(this.templatePath('grunt-tasks'), this.destinationPath() + "/grunt");

        // copy nightwatch.json
        // this.fs.copy(this.templatePath('nightwatch.json'), this.destinationPath() + "/nightwatch.json");

        done();
    },
    end: function () {
        console.log("\n\nProject initialization complete!\n\n");

        console.log("--> Updating NPM Dependencies : ");
        this.spawnCommandSync('npm', ['install']);

        console.log("\n--> Type 'grunt help' to see available commands!\n");
    }
});