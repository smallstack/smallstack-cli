module.exports = function (parameters) {

    var config = require('../config').Config;
    var path = require("path");
    var _ = require("underscore");
    var fs = require("fs-extra");
    var exec = require('../functions/exec');

    // android config
    var unalignedAPK = path.join(config.builtDirectory, "android", "release-unsigned.apk");
    var alignedAPK = path.join(config.builtDirectory, "android", "release-signed.apk");
    var sdkDir = process.env.ANDROID_HOME;
    if (!sdkDir)
        throw new Error("Please set ANDROID_HOME environment variable!");
    var buildToolVersion = "23.0.3";
    var buildToolsDirectory = path.join(sdkDir, "build-tools", buildToolVersion);
    var keystoreAlias = config.name;
    var keystorePassword = parameters.keystorePassword || config.name + "654321!";
    if (!parameters.keystoreFilePath)
        console.warn("Warning: No --keystoreFilePath given, using default : deployment/android/dev.keystore");
    var keystoreFilePath = parameters.keystoreFilePath || "deployment/android/dev.keystore";

    // sign the unaligned app
    exec("jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore " + keystoreFilePath + " -storepass " + keystorePassword + " -keypass " + keystorePassword + " " + unalignedAPK + " " + keystoreAlias);
    exec("rm -f " + alignedAPK);
    exec(path.join(buildToolsDirectory, "zipalign") + " 4 " + unalignedAPK + " " + alignedAPK);
}