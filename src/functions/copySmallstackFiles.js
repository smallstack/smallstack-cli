module.exports = function (toDir) {

    var config = require("../config");
    var fsUtils = require("nodejs-fs-utils");
    var _ = require("underscore");
    var typings = require("typings");

    if (toDir === undefined)
        toDir = config.smallstackDirectory;



    fsUtils.copySync(__dirname + "/../resources/smallstack", toDir, function (errors, cache) {
        if (errors)
            _.each(errors, function (err) {
                console.error("Error", err)
            });
    }, { skipErrors: true });

    typings.install({
        cwd: config.smallstackDirectory
    });
}