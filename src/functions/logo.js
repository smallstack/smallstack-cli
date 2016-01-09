module.exports = function () {
    
    var config = require("../config");
    
    console.log(" ");
    console.log("                        _  _       _                 _    ");
    console.log(" ___  _ __ ___    __ _ | || | ___ | |_   __ _   ___ | | __");
    console.log("/ __|| '_ ` _ \\  / _` || || |/ __|| __| / _` | / __|| |/ /");
    console.log("\\__ \\| | | | | || (_| || || |\\__ \\| |_ | (_| || (__ |   < ");
    console.log("|___/|_| |_| |_| \\__,_||_||_||___/ \\__| \\__,_| \\___||_|\\_\\");
    console.log("                             command line interface v" + config.cli.version);
    console.log(" ");
}