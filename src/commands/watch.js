var config = require("../config");
var path = require("path");
var _ = require("underscore");
var watch = require("node-watch");
var exec = require('child_process').exec;
var functions = require("../functions/generateSourcesFunctions");
var logger = require('single-line-log').stdout;
var Spinner = require('cli-spinner').Spinner;

module.exports = function (parameters, done) {
    var linePrefixes = ["Queue: ", "", " ", "Command Log: ", " ", " "];
    var lines = ["Empty", "", " ", "watching files for changes...", " ", ""];
    var queueLine = 0;
    var executionsLine = 1;
    var executionLogLine = 3;
    var errorLine = 5;
    var isExecuting = false;

    logUpdate();

    var executions = [];

    var directories = [];
    directories.push("./modules/core-client");
    directories.push("./modules/core-common");
    directories.push("./modules/core-server");
    directories.push("./modules/meteor-client");
    directories.push("./modules/meteor-common");
    directories.push("./modules/meteor-server");

    watch(directories, {
        recursive: true,
        filter: function (fullpath) {
            if (fullpath === undefined)
                return false;
            if (fullpath.indexOf("node_modules") !== -1)
                return false;
            if (fullpath.indexOf(".git") !== -1)
                return false;
            if (fullpath.indexOf("dist") !== -1)
                return false;
            if (fullpath.indexOf(".meteor") !== -1)
                return false;
            if (functions.endsWith(fullpath, ".d.ts"))
                return false;
            return true;
        }
    }, function (filename) {
        if (filename.indexOf("modules\\core-client") === 0)
            addExecution("core-client");
        if (filename.indexOf("modules\\core-common") === 0)
            addExecution("core-common");
        if (filename.indexOf("modules\\core-server") === 0)
            addExecution("core-server");
        if (filename.indexOf("modules\\meteor-client") === 0)
            addExecution("meteor-client");
        if (filename.indexOf("modules\\meteor-common") === 0)
            addExecution("meteor-common");
        if (filename.indexOf("modules\\meteor-server") === 0)
            addExecution("meteor-server");
        executeNextExecution();
    });

    function addExecution(packageName) {
        if (_.find(executions, function (execution) { return execution.packageName === packageName; }) === undefined) {
            executions.push({ cmd: "npm run bundle", packageName: packageName, options: { cwd: path.join(config.rootDirectory, "modules/" + packageName) } });
        }
    }


    function logUpdate(message, line) {
        if (message !== undefined && line !== undefined)
            lines[line] = message;
        logger.clear();
        var text = "";
        for (var i = 0; i < lines.length; i++) {
            text += linePrefixes[i] + lines[i] + "\n";
        }
        logger(text);
    }

    function updateExecutionsText() {
        var text = "";
        _.each(executions, function (exec) {
            if (text !== "")
                text += ", ";
            text += exec.packageName;
        });
        if (text === "")
            text = "Empty";
        logUpdate(text, queueLine);
    }

    function executeNextExecution() {
        updateExecutionsText();
        if (executions.length > 0 && !isExecuting) {
            isExecuting = true;
            var execution = executions[0];
            var spinner = new Spinner('%s Bundling ' + execution.packageName);
            spinner.start();
            executions.splice(0, 1);
            updateExecutionsText();
            var childProcess = exec(execution.cmd, execution.options, (error) => {
                if (error !== null)
                    logUpdate(error.message, errorLine);
            });
            childProcess.on("exit", (code, signal) => {
                isExecuting = false;
                spinner.stop();
                logUpdate("watching files for changes...", executionLogLine);
                executeNextExecution();
            });
            childProcess.on("error", (err) => {
                logUpdate(err.message, errorLine);
            });
            childProcess.stdout.on("data", (data) => {
                logUpdate(data, executionLogLine);
            });
        }
    }
}