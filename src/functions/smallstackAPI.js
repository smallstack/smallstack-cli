var http = require("http");
var https = require("https");
var _ = require("underscore");


// apiProtocol, apiHost, apiPort, apiKey, path, callback
module.exports = function (options, callback) {

    // defaults
    if (options.protocol)
        options.protocol += ":";
    options = options || {};
    options.protocol = options.protocol || "https:";
    options.host = options.host || "smallstack.io";
    options.port = options.port || "443";

    console.log("Using API endpoint : " + options.protocol + "//" + options.host + ":" + options.port + "/api\n");

    var httpCaller = https;
    if (options.protocol === "http:")
        httpCaller = http;

    var apiKey = options.apiKey || process.env.SMALLSTACK_API_KEY;
    if (!apiKey) {
        console.info("ERROR: Please provide an API Key");
        console.info("\t* via SMALLSTACK_API_KEY environment variable");
        console.info("\t* via --apikey parameter\n");
        console.info("If you don't have an api key, please generate one in your profile at https://smallstack.io/profile\n\n");
        return;
    }

    options = _.extend(options, {
        headers: {
            "x-smallstack-apikey": apiKey
        }
    })

    return httpCaller.request(options, function (response) {

        var str = "";
        response.on('data', function (chunk) {
            str += chunk;
        });
        response.on('end', function () {

            if (response.statusCode !== 200) {
                throw new Error(response.statusCode + " - " + str);
            }

            if (typeof callback === 'function') {
                try {
                    callback(JSON.parse(str));
                }
                catch (e) {
                    callback(str);
                }
            }
        });
    });
}