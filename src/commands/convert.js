module.exports = function (parameters, done) {

    var propertiesParser = require("properties-parser");
    var flat = require("flat");
    var fs = require("fs-extra");
    var _ = require("underscore");



    if (parameters.file === undefined)
        throw new Error("Please define a file via --file !");

    console.log(JSON.stringify(flat.unflatten(propertiesParser.parse(fs.readFileSync(parameters.file))), null, 2));
}