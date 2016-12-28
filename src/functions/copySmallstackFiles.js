var config = require("../config");
var fsUtils = require("nodejs-fs-utils");
var _ = require("underscore");
var typings = require("typings-core");
var path = require("path");

module.exports = function (toDir, done) {

    if (toDir === undefined)
        toDir = config.smallstackDirectory;



    fsUtils.copySync(path.join(config.cliResourcesPath, "smallstack"), toDir, function (errors, cache) {
        if (errors)
            _.each(errors, function (err) {
                console.error("Error", err)
            });
    }, { skipErrors: true });

    typings.install({
        cwd: config.smallstackDirectory
    }).then(function () {
        if (typeof done === "function")
            done()
    });
}
