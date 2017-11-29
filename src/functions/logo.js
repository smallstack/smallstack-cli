var config = require("../Config").Config;
var figlet = require("figlet");
var colors = require("colors");

module.exports = function () {

    var versionString = "command line interface v" + config.cli.version;
    if (config.isCIMode()) {
        console.log(colors.gray(versionString + ", CI mode enabled"));
        return;
    }

    var asciiText = figlet.textSync('smallstack', {
        font: "Ogre",
        horizontalLayout: 'default',
        verticalLayout: 'default'
    });

    // it is very important to calculate the exact amount of spaces for the version string below the logo!!! This is rocket science!    
    var logoMaxLength = 0;
    var filteredAsciiText = "";
    var asciiTextLines = asciiText.split("\n");
    for (var al = 0; al < asciiTextLines.length - 1; al++) {
        if (asciiTextLines[al].length > logoMaxLength)
            logoMaxLength = asciiTextLines[al].length;
        if (asciiTextLines[al] !== "\n")
            filteredAsciiText += "\n " + asciiTextLines[al];
    };
    var versionStringStart = logoMaxLength - versionString.length + 1;
    if (versionStringStart < 0)
        versionStringStart = 0; // how did that happen...
    var spaces = "";
    for (var spacesCounter = 0; spacesCounter < versionStringStart; spacesCounter++)
        spaces += " ";


    console.log(colors.gray(filteredAsciiText));
    console.log(colors.gray(spaces + versionString));
    console.log(" ");
}