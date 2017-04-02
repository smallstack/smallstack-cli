
var fs = require("fs-extra");




module.exports = function modifyProductionPackageJson(file) {
    var content = require(file);
    delete content.devDependencies;
    delete content.scripts;
    content.main = content.main.replace("./dist/bundle/", "./")
    content.types = content.types.replace("./dist/bundle/", "./")
    fs.writeJSONSync(file, content);
}