module.exports = function () {
    var config = require("../config");

    console.log("Project Directory :    " + config.rootDirectory);
    console.log("Smallstack Directory : " + config.smallstackDirectory);
    console.log("Meteor Directory :     " + config.meteorDirectory);
    console.log("Supersonic Directory : " + config.supersonicDirectory);
}