module.exports = function (grunt) {

    var child_process = require("child_process");
    var runsync = require(process.cwd() + "/node_modules/runsync");

    function exec(command, options) {
        console.log("  executing : ", command);
        if (child_process !== undefined && typeof child_process.execSync === 'function')
            child_process.execSync(command, [], options);
        else
            runsync.shell(command, options);
    }

    grunt.registerTask("ci:android", ["generate", "compile", "android"]);
    grunt.registerTask("android", ["deploy:init", "deploy:prepare", "deploy:mobilePrepare", "android:prepare", "android:createApp"]);

    grunt.registerTask("android:prepare", function () {
            
        // android config
        grunt.config.set("android.unalignedAPK", "app/.meteor/local/cordova-build/platforms/android/build/outputs/apk/android-release-unsigned.apk");
        grunt.config.set("android.alignedAPK", "app/.meteor/local/cordova-build/platforms/android/build/outputs/apk/android-release-signed.apk");
        grunt.config.set("android.sdkDir", grunt.option("android.sdk") || "/opt/android-sdk-linux");
        grunt.config.set("android.version", grunt.option("android.version") || "23.0.1");
        grunt.config.set("android.buildToolsDirectory", grunt.option("android.buildToolsDirectory") || (grunt.config.get("android.sdkDir") + "/build-tools/" + grunt.config.get("android.version")));
        grunt.config.set("android.keystoreAlias", grunt.option("android.keystoreAlias") || grunt.config.get("project.name"));
        grunt.config.set("android.keystorePassword", grunt.option("android.keystorePassword") || grunt.config.get("project.name") + "654321!");
        grunt.config.set("android.keystoreFilePath", grunt.option("android.keystoreFilePath") || "deployment/android/dev.keystore");
    });

    grunt.registerTask("android:createKeystore", ["android:prepare", "android:createKeystoreInternal"]);
    grunt.registerTask("android:createKeystoreInternal", function () {
        grunt.task.requires("android:prepare");
        grunt.file.mkdir("deployment/android");
        exec("keytool -genkey -v -keystore " + grunt.config.get("android.keystoreFilePath") + " -alias " + grunt.config.get("android.keystoreAlias") + " -keyalg RSA -keysize 2048 -validity 10000 -storepass " + grunt.config.get("android.keystorePassword") + " -dname \"cn=, ou=, o=, c=\" -keypass " + grunt.config.get("android.keystorePassword"));
    });

    grunt.registerTask("android:createApp", function () {
        grunt.task.requires("android:prepare");

        if (/^win/.test(process.platform))
            throw new Error("Creating an android app only works on mac & linux!");

        var serverUrl = grunt.option("deploy.currentDeployment.url") || grunt.config.get("deploy.currentDeployment.url");
        var meteorDebug = grunt.option("meteor.build.debug") === "true" ? " --debug" : "";
        
        // create unaligned app
        exec("rm -Rf " + grunt.config.get("project.builtDirectory") + "/android");
        exec("meteor install-sdk android", {
            cwd: grunt.config.get("project.appDirectory")
        });
        exec("meteor build --directory ../" + grunt.config.get("project.builtDirectory") + " --server=" + serverUrl + " " + meteorDebug + " --verbose", {
            cwd: grunt.config.get("project.appDirectory")
        });
        
        // sign the unaligned app
        exec("jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore " + grunt.config.get("android.keystoreFilePath") + " -storepass " + grunt.config.get("android.keystorePassword") + " -keypass " + grunt.config.get("android.keystorePassword") + " " + grunt.config.get("android.unalignedAPK") + " " + grunt.config.get("android.keystoreAlias"));
        exec("rm -f " + grunt.config.get("android.alignedAPK"));
        exec(grunt.config.get("android.buildToolsDirectory") + "/zipalign 4 " + grunt.config.get("android.unalignedAPK") + " " + grunt.config.get("android.alignedAPK"));
    });
}