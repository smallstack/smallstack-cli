var _ = require("underscore");


module.exports = function (args) {
    if (!(args instanceof Array))
        throw new Error("No Arguments given!");

    args.splice(0, 2);

    var commands = [];
    _.each(args, function (arg) {
        if (arg.indexOf("--") === 0) {
            if (commands.length === 0)
                throw new Error("parameter given before first command!");
            var parameterSplit = arg.substring(2).split("=");
            var key = parameterSplit[0];
            var value = parameterSplit[1];
            if (value === undefined)
                value = true;
            try {
                // if array or object is passed, parse it as json
                if (typeof value === "string") {
                    value = value.replace(/'/g, "\"");
                    value = JSON.parse(value);
                }
            } catch (e) { }
            commands[(commands.length - 1)].parameters[key] = value;
        } else if (arg.indexOf("-") === 0) {
            throw new Error("please use -- as parameter indicator!");
        }
        else {
            var command = { name: arg, parameters: {} };
            commands.push(command);
        }
    });

    return commands;
}