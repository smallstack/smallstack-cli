var fs = require("fs-extra");
var path = require("path");
var config = require("../Config").Config;

module.exports = function () {

    console.log("Persisting Versions...");

    // smallstack version
    var version = undefined;
    var versionCheckFile = path.join(config.rootDirectory, "smallstack", "packages", "package.json");
    if (!fs.existsSync(versionCheckFile)) {
        console.warn("Version cannot be persisted since file does not exist : " + versionCheckFile);
    } else {
        var versionCheckFileContent = require(versionCheckFile);
        version = versionCheckFileContent.version;
        if (version === null || version === undefined)
            throw new Error("Could not find version in file : ", versionCheckFile);
    }

    var content = "";
    content += "// THIS FILE IS AUTO-GENERATED BY 'smallstack compile|generate'! PLEASE IGNORE THE FILE IN YOUR SCM!\n\n";
    content += "export var versions = {\n";
    content += "\tsmallstack: \"" + version + "\",\n";
    content += "\tproject: \"" + config.version + "\",\n";
    content += "\tcompileDate: " + new Date().getTime() + ",\n";
    content += "\tprojectName: \"" + config.project.name + "\"\n";
    content += "}\n";

    fs.ensureDirSync(config.datalayerPath);
    fs.writeFileSync(path.join(config.datalayerPath, "versions.ts"), content);

}
