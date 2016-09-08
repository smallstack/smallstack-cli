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
            if (parameterSplit[1] === undefined)
                parameterSplit[1] = true;
            commands[(commands.length - 1)].parameters[parameterSplit[0]] = parameterSplit[1];
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