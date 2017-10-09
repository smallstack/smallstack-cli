module.exports = function () {
    var config = require("../config").Config;

    console.log("Project Directory :    " + config.rootDirectory);
    console.log("Temp Directory :       " + config.tmpDirectory);
    console.log("Smallstack Directory : " + config.smallstackDirectory);
    console.log("Meteor Directory :     " + config.meteorDirectory);
    console.log("Supersonic Directory : " + config.supersonicDirectory);
}