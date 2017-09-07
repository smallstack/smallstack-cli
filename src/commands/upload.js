var config = require("../config");
var AWS = require('aws-sdk');
var fs = require("fs-extra");
var gitState = require("git-state");
var gitTagCheck = require("../functions/gitTagCheck");
var path = require("path");

module.exports = function (parameters, done) {

    var version = config.version;
    var remoteFileName = getRemoteFileName();
    var fileEnding = ".tar.gz";
    var defaultBucketName = "smallstack-bundles";
    var localFile;
    var remotePath = "smallstack/" + config.name + "/";

    if (config.isSmallstackEnvironment()) {
        remotePath = "";
        fileEnding = ".zip";
        defaultBucketName = "smallstack-releases";
        localFile = path.join(config.rootDirectory, "dist", "smallstack-" + version + ".zip");
        remoteFileName = "smallstack-" + remoteFileName;
    } else if (config.isProjectEnvironment()) {
        localFile = path.join(config.builtDirectory, "/meteor.tar.gz")
    }
    gitTagCheck();

    var region = parameters.region || "eu-central-1";
    var bucketName = parameters.bucket || defaultBucketName;
    var uploadName = parameters.filename || remotePath + remoteFileName + fileEnding;

    console.log("Branch Name :      " + getBranchName());
    console.log("Tag Name :         " + getTagName());
    console.log("Local File Name :  " + localFile);
    console.log("Target File Name : " + uploadName);
    console.log("AWS Region :       " + region);
    console.log("Bucket :           " + bucketName);
    console.log(" ");

    console.log("Uploading file...");

    AWS.config.region = region;

    var s3bucket = new AWS.S3({
        params: {
            Bucket: bucketName
        }
    });
    fs.readFile(localFile, function (err, data) {
        if (err) throw err;
        var params = {
            Key: uploadName,
            Body: data
        };
        s3bucket.upload(params, function (s3err, s3data) {
            if (s3err) {
                console.log("Error uploading data: ", s3err);
            } else {
                console.log("Successfully Uploaded!");
                s3bucket.getSignedUrl('getObject', {
                    Bucket: bucketName,
                    Key: uploadName,
                    Expires: 60 * 60
                }, function (err, url) {
                    console.log('Signed URL: ' + url);
                    done();
                });
            }
        });
    });
}

function getTagName() {
    var envTagName = process.env["CI_COMMIT_TAG"];
    if (envTagName !== undefined)
        return envTagName;
    return undefined;
}

function getBranchName() {
    var envBranchName = process.env["CI_COMMIT_REF_NAME"];
    if (envBranchName !== undefined)
        return envBranchName;

    var state = gitState.checkSync(config.rootDirectory);
    if (state !== undefined && state.branch !== undefined)
        return state.branch.replace(new RegExp("/", "gi"), "_");
    return undefined;
}

function getRemoteFileName() {
    var tagName = getTagName();
    if (tagName !== undefined)
        return tagName;
    var branchName = getBranchName();
    if (branchName !== undefined)
        return branchName;
    throw new Error("Could not create remote file name due branch and tag names are undefined!");
}
