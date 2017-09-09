


export function stringifyParametersWithoutPasswords(parameters) {
    var withoutPlainPasswords = {};
    for (let paramKey in parameters) {
        if (parameters.hasOwnProperty(paramKey)) {
            if (paramKey.toLowerCase().indexOf("password") !== -1)
                withoutPlainPasswords[paramKey] = "XXXXXXXXX";
            else
                withoutPlainPasswords[paramKey] = parameters[paramKey];
        }
    }
    return JSON.stringify(withoutPlainPasswords);
}
