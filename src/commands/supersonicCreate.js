module.exports = function () {

    var config = require("../config");
    var exec = require('child_process').exec;

    console.log("Creating supersonic app for project :", config.project.name);

    var process = exec("steroids create supersonic --language=js --type=spa");
    process.stderr.on('data', function (data) {
        console.log(data);
    });
    process.stdout.on('data', function (data) {
        console.error(data);
    });
    process.on('close', function (code) {
        console.log(' |-- Done!');
    });
}