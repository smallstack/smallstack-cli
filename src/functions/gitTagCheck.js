var config = require("../config");
var AWS = require('aws-sdk');
var fs = require("fs-extra");
var gitState = require("git-state");

module.exports = function (parameters, done) {

    var projectVersion = config.version;
    var state = gitState.checkSync(config.rootDirectory);
    if (state !== undefined && state.branch !== undefined) {
        var branchName = state.branch;
        if (branchName.indexOf("heads/tags/") === 0 || branchName.indexOf("tags/") === 0) {
            branchName = branchName.replace("heads/tags/", "");
            branchName = branchName.replace("tags/", "");
            if (branchName !== projectVersion)
                throw new Error("Project version (" + projectVersion + ") should be same as tag name (" + branchName + ")! Please make a new release + tag where those two versions match!");
        }
    }
}