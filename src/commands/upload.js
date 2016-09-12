var config = require("../config");
var AWS = require('aws-sdk');


module.exports = function (parameters, done) {

    AWS.config.region = 'eu-central-1';
    var bucketName = "smallstack-bundles";
    var uploadName = "project-" + config.name + "-" + config.version + ".tar.gz";

    console.log("Target File Name : ", uploadName);
    console.log("AWS Region : ", "eu-central-1");
    console.log("Bucket : ", "smallstack-bundles");
    console.log(" ");
    console.log("Uploading file...");


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

