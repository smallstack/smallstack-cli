var exec = require("../functions/exec");
var execSync = require('child_process').execSync;

module.exports = function (command, options) {
    console.log("Node Version:");
    execSync("node -v ", {
        stdio: 'inherit'
    });
    console.log("NPM Version:");
    execSync("npm -v", {
        stdio: 'inherit'
    });
    exec(command, options);
}