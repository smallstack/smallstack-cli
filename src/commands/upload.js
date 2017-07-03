var config = require("../config");
var AWS = require('aws-sdk');
var fs = require("fs-extra");
var dateFormat = require('dateformat');

module.exports = function (parameters, done) {

    var now = new Date();
    var dateString = dateFormat(now, "yyyy-mm-dd-HH-MM-ss");

    var version = config.version;
    var state = gitState.checkSync(config.rootDirectory);
    if (state !== undefined && state.branch !== undefined) {
        version += "-" + state.branch;
        version = version.replace(new RegExp("/", "gi"), "_");
    }
    var region = parameters.region || "eu-central-1";
    var bucketName = parameters.bucket || "smallstack-bundles";
    var uploadName = parameters.filename || "smallstack/" + config.name + "/" + version + "-" + dateString + ".tar.gz";

    console.log("Target File Name : " + uploadName);
    console.log("AWS Region :       " + region);
    console.log("Bucket :           " + bucketName);
    console.log(" ");

    console.log("Uploading file...");

    AWS.config.region = region;

    var s3bucket = new AWS.S3({ params: { Bucket: bucketName } });
    fs.readFile(config.builtDirectory + "/meteor.tar.gz", function (err, data) {
        if (err) throw err;
        var params = { Key: uploadName, Body: data, ACL: 'public-read' };
        s3bucket.upload(params, function (s3err, s3data) {
            if (s3err) {
                console.log("Error uploading data: ", s3err);
            } else {
                console.log("Successfully Uploaded!");
                s3bucket.getSignedUrl('getObject', { Bucket: bucketName, Key: uploadName, Expires: 60 * 60 }, function (err, url) {
                    console.log('Signed URL: ' + url);
                    done();
                });
            }
        });
    });


}

