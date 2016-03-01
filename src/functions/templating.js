var _ = require("underscore");
var fs = require("fs-extra");

module.exports = {

    compile: function (content, replacers) {
        replacers = replacers || {};
        var template = _.template("" + content);
        return template(replacers);
    },
    compileFileToFile: function (fromPath, toPath, replacers) {
        if (!fs.existsSync(fromPath))
            throw new Error("File to read does not exist : " + fromPath);
        var content = fs.readFileSync(fromPath);
        var compiledContent = this.compile(content, replacers);
        fs.createFileSync(toPath);
        fs.writeFileSync(toPath, compiledContent);
    },
    compileFile: function (fromPath, replacers) {
        if (!fs.existsSync(fromPath))
            throw new Error("File to read does not exist : " + fromPath);
        var content = fs.readFileSync(fromPath);
        return this.compile(content, replacers);
    }
}