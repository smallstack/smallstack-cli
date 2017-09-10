


export function stringifyParametersWithoutPasswords(parameters, prefix: string = "") {
    var withoutPlainPasswords = {};
    let lineLength = 0;
    for (let paramKey in parameters) {
        if (parameters.hasOwnProperty(paramKey))
            if (paramKey.length > lineLength)
                lineLength = paramKey.length;
    }
    for (let paramKey in parameters) {
        if (parameters.hasOwnProperty(paramKey)) {
            const type = getType(parameters[paramKey]);
            withoutPlainPasswords += prefix + padString(paramKey, lineLength, "right") + " " + padString(type, 10, "right") + " = ";
            if (paramKey.toLowerCase().indexOf("password") !== -1)
                withoutPlainPasswords += "XXXXXXXXX\n";
            else {
                if (type === "object" || type === "object[]")
                    withoutPlainPasswords += JSON.stringify(parameters[paramKey], undefined, 2) + "\n";
                else
                    withoutPlainPasswords += parameters[paramKey] + "\n";
            }
        }
    }
    return withoutPlainPasswords;
}

function getType(val) {
    if (val instanceof Array)
        return typeof val[0] + "[]";
    return typeof val;
}
function padString(str, maxLength, direction, fillingCharacter = ' ') {
    let padlen = maxLength - str.length;
    if (fillingCharacter.length > 1)
        fillingCharacter = fillingCharacter.charAt(0);
    switch (direction) {
        case "right":
            for (var i = 0; i < padlen; i++) {
                str = str + fillingCharacter;
            }
            return str;
        default:
            for (var i = 0; i < padlen; i++) {
                str = fillingCharacter + str;
            }
            return str;
    }
}

