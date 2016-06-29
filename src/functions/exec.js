module.exports = function (command, options) {

    options = options || {};
    options.linePrefix = options.linePrefix || " |-- ";

    var exec = require('child_process').exec;
    var _ = require("underscore");
    var config = require("../config");

    console.log("executing : ", command, options);

    var process = exec(command, {
        cwd: options.cwd || config.rootDirectory
    }, function (error) {
        if (error !== null) {
            if (options.error)
                options.error(error);
            else
                throw new Error(error);
        }
    });

    process.stdout.on('data', function (data) {
        var lines = data.split("\n");
        _.each(lines, function (line) {
            if (options.stdout)
                options.stdout(options.linePrefix + line);
            else
                console.log(options.linePrefix + line);
        });
    });

    process.stderr.on('data', function (data) {
        var lines = data.split("\n");
        _.each(lines, function (line) {
            if (options.stderr)
                options.stderr(options.linePrefix + line);
            else
                console.error(options.linePrefix + line);
        });
        if (options.error)
            options.error(data);
    });

    process.on('close', function (code) {
        console.log(options.linePrefix + 'Done\n');
        if (options.finished)
            options.finished();
    });

}