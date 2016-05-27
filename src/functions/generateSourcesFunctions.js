

var path = require("path");
var pluralizer = require("pluralize");
var _ = require("underscore");
var _trim = require("underscore.string/trim");

var functions = {};

functions.getSchemaType = function getSchemaType(type) {
    switch (type.toLowerCase()) {
        case "date":
            return "Date";
        case "string[]":
        case "foreign[]":
            return "[String]";
        case "string":
        case "foreign":
            return "String";
        case "number":
            return "Number";
        case "number[]":
            return "[Number]";
        case "boolean":
            return "Boolean";
        case "boolean[]":
            return "[Boolean]";
        case "file":
        case "any":
        case "object":
            return "Object";
        case "file[]":
        case "any[]":
        case "object[]":
            return "[Object]";
    }

    if (!functions.isPrimitiveType(type))
        return type;

    throw new Error("Can't convert '" + type + "' to a schema type!");

}


functions.getTypescriptType = function getTypescriptType(type) {
    switch (type.toLowerCase()) {
        case "date":
            return "Date";
        case "string[]":
        case "foreign[]":
            return "string[]";
        case "string":
        case "foreign":
            return "string";
        case "number":
            return "number";
        case "number[]":
            return "number[]";
        case "boolean":
            return "boolean";
        case "blob":
            return "Blob";
        case "file":
            return "File";
        case "object":
        case "any":
            return "any";
        case "object[]":
        case "any[]":
            return "any[]";
    }

    if (!functions.isPrimitiveType(type))
        return type;

    throw new Error("Can't convert '" + type + "' to a typescript type!");
}

functions.getJavascriptType = function getJavascriptType(type) {
    switch (type.toLowerCase()) {
        case "date":
            return "Date";
        case "string[]":
        case "foreign[]":
            return "String[]";
        case "string":
        case "foreign":
            return "String";
        case "number":
            return "Number";
        case "number[]":
            return "Number[]";
        case "boolean":
            return "Boolean";
        case "blob":
            return "Blob";
        case "file":
            return "File";
        case "any":
            return "Object";
        case "any[]":
            return "Object[]";
    }

    if (!functions.isPrimitiveType(type))
        return type;

    throw new Error("Can't convert '" + type + "' to a javascript type!");
}

functions.checkSchema = function checkSchema(schema, modelName) {
    for (var i = 0; i < schema.length; i++) {
        for (var key in schema[i]) {
            switch (key) {
                case "name":
                case "type":
                case "optional":
                case "collection":
                case "allowedValues":
                case "defaultValue":
                case "blackbox":
                case "min":
                case "max":
                    continue;
                default:
                    throw new Error("Unknown schema property : " + modelName + "[" + (i + 1) + "] -> " + key);
            }
        }
    }
}

functions.toArrayString = function toArrayString(arr) {
    var out = "[";
    for (var i = 0; i < arr.length; i++) {
        out += "\"" + arr[i] + "\"";
        if (i !== (arr.length - 1))
            out += ", ";
    };
    out += "]";
    return out;
}

functions.convertMethodParametersToTypescriptMethodParameters = function convertMethodParametersToTypescriptMethodParameters(array, traillingComma) {
    var out = "";
    if (array !== undefined && array instanceof Array) {
        for (var i = 0; i < array.length; i++) {
            if (array[i].indexOf(":") === -1)
                // default shall be string
                out += array[i] + ": string";
            else {
                var type = array[i].substring(array[i].indexOf(":") + 1);
                var name = array[i].substring(0, array[i].indexOf(":"));
                out += name + ": " + functions.getTypescriptType(type);
            }
            if (i !== (array.length - 1) || traillingComma)
                out += ", ";
        }
    }
    return out;
}

functions.convertMethodParametersToObject = function convertMethodParametersToObject(array) {
    var out = "{ ";
    if (array !== undefined && array instanceof Array) {
        for (var i = 0; i < array.length; i++) {
            if (array[i].indexOf(":") === -1)
                out += array[i] + ": " + array[i];
            else {
                var name = array[i].substring(0, array[i].indexOf(":"));
                out += name + ": " + name;
            }
            if (i !== (array.length - 1))
                out += ", ";
        }
    }
    out += " }";
    return out;
}

functions.arrayToCommaSeparatedString = function arrayToCommaSeparatedString(array, withType, trailingComma, toDocument) {
    var out = "";
    if (array !== undefined && array instanceof Array) {
        for (var i = 0; i < array.length; i++) {
            if (withType || array[i].indexOf(":") === -1)
                out += array[i];
            else {
                var type = array[i].substring(array[i].indexOf(":") + 1);
                out += array[i].substring(0, array[i].indexOf(":"));
                if (toDocument && !functions.isPrimitiveType(type))
                    out += ".toDocument()";
            }
            if (i !== (array.length - 1) || trailingComma)
                out += ", ";
        }
    }
    return out;
}

functions.getForeignModelGetterName = function getForeignModelGetterName(schema, real, others) {
    if (schema.type === "foreign[]") {
        if (schema.name.toLowerCase().indexOf("ids") === schema.name.length - 3)
            throw new Error("model.schema." + schema.name + " : Don't end schema.name with 'Ids' when using 'foreign[]'. It will get appended automatically!");
    }
    else if (schema.type === "foreign") {
        if (schema.name.toLowerCase().indexOf("id") === schema.name.length - 2)
            throw new Error("model.schema." + schema.name + " : Don't end schema.name with 'Id' when using 'foreign'. It will get appended automatically!");
    }
    else throw new Error("'" + schema.type + "' is not a known foreign key!");

    if (real) {
        if (schema.type === "foreign")
            return "get" + others[schema.collection].modelClassName + "ById";
        else
            return "get" + functions.capitalize((pluralizer(others[schema.collection].modelClassName)) + "ByIds");
    }
    else
        return "get" + functions.capitalize(schema.name);
}

functions.getChecksForParameters = function getChecksForParameters(array, others, callback) {
    var out = "";
    if (array !== undefined && array instanceof Array) {
        for (var i = 0; i < array.length; i++) {
            var type = "";
            var name = "";
            if (array[i].indexOf(":") !== -1) {
                var split = array[i].split(":");
                name = split[0];
                var schemaTypeFound = functions.getSchemaForType(split[1], others);
                if (schemaTypeFound)
                    type = "smallstack.schemas[\"" + schemaTypeFound + "\"]";
                else
                    type = functions.getSchemaType(split[1]);
            } else {
                name = array[i];
                type = "String";
            }

            out += "\t\tUtils.check(params." + name + ", " + type + ", \"" + name + "\"";
            if (callback)
                out += ", callback";
            out += ");\n";
        }
    }
    return out;
}

functions.getSchemaForType = function getSchemaForType(type, others) {

    for (var other in others) {
        if (others[other].modelClassName === type)
            return other;
    };
    return undefined;
}

functions.getMongoUpdateJson = function getMongoUpdateJson(schema) {
    var out = "{ $set : {";

    for (var i = 0; i < schema.length; i++) {
        var propertyName = functions.getModelPropertyName(schema[i])
        out += "\"" + propertyName + "\": model[\"" + propertyName + "\"]";
        if (i !== (schema.length - 1))
            out += ", ";
    }
    out += "}}";
    return out;
}

functions.lowerCaseFirst = function lowerCaseFirst(str) {
    if (typeof str !== 'string')
        return str;
    return str.charAt(0).toLowerCase() + str.substring(1);
}


functions.relativePath = function relativePath(pathA, pathB) {
    return path.relative(pathA, pathB).replace(/\\/g, "/");
}

functions.isPrimitiveType = function isPrimitiveType(typeAsString) {
    typeAsString = typeAsString.toLowerCase().replace(/\[|\]/g, "");
    switch (typeAsString) {
        case "number":
        case "string":
        case "date":
        case "boolean":
        case "blob":
        case "file":
        case "any":
        case "object":
            return true;
    }
    return false;
}

functions.getModelPropertyName = function getModelPropertyName(schema) {
    switch (schema.type) {
        case "foreign":
            return schema.name + "Id";
        case "foreign[]":
            var singular = pluralizer.singular(schema.name);
            return singular + "Ids";
        default:
            return schema.name;
    }
}

functions.capitalize = function capitalize(str) {
    if (str !== undefined)
        return str.charAt(0).toUpperCase() + str.substring(1);
    else
        return undefined;
}

functions.trim = function trim(str, characters) {
    return _trim(str, characters);
}

functions.getServiceName = function getServiceName(type) {
    if (type.service.name)
        return type.service.name;
    else
        return functions.capitalize(type.collection.name) + "Service";
}

functions.singularize = function singularize(plural) {
    return pluralizer.singular(plural);
}

functions.pluralize = function pluralize(singular) {
    return pluralizer(singular, 2);
}

functions.getSearchableFieldsArray = function getSearchableFieldsArray(schema) {
    var fields = [];
    for (var i = 0; i < schema.length; i++) {
        if (schema[i].type !== "foreign" && schema[i].type !== "foreign[]")
            fields.push(schema[i].name);
    }
    return fields;
}

functions.getExpandablesArray = function getExpandablesArray(schema) {
    var fields = [];
    for (var i = 0; i < schema.length; i++) {
        if (schema[i].type === "foreign" || schema[i].type === "foreign[]")
            fields.push(functions.getModelPropertyName(schema[i]));
    }
    return fields;
}

functions.getAllQueryParameters = function getAllQueryParameters(query) {
    var parameters = [];
    if (query.selector !== undefined) {
        var selectorString = JSON.stringify(query.selector);
        var match = selectorString.match(/\"\:([a-zA-Z\[\]\:]{2,})\"/g);
        if (match !== null) {
            _.each(match, function (ma) {
                var param = ma.split(":")[1];
                param = param.replace("\"", "");
                parameters.push(param);
            });
        }
    }
    return parameters;
}

functions.getByIdsGetter = function getByIdsGetter(modelClassName) {
    return functions.lowerCaseFirst(functions.pluralize(modelClassName)) + "ByIds";
}

functions.urlToJavaPackage = function urlToJavaPackage(url) {
    url = url.replace(/http[s]?:\/\//, "");
    var parts = url.split(".");
    var pkg = "";
    for (var i = (parts.length - 1); i >= 0; i--) {
        pkg += parts[i];
        if (i !== 0)
            pkg += ".";
    }
    return pkg;
}

functions.evaluateQuery = function evaluateQuery(query, userIdString) {
    if (userIdString === undefined)
        userIdString = "Meteor.userId()";
    var parameters = "";
    var firstParameter = undefined;
    var secondParameter = undefined;
    var parameterArray = [];
    var subscriptionOptions = "";
    var parsedSelector = JSON.stringify(query.selector) || "{}";
    if (query.selector !== undefined) {
        var stringified = JSON.stringify(query.selector);
        var match = stringified.match(/\"\:([a-zA-Z\[\]\:]{2,})\"/g);
        if (match !== null) {
            subscriptionOptions += "{";
            for (var p = 0; p < match.length; p++) {
                var param = functions.trim(match[p], '":');
                var typeSplit = param.split(":");
                var paramName = typeSplit[0];
                var paramType = typeSplit[1] || "any";
                if (firstParameter === undefined)
                    firstParameter = paramName;
                else if (secondParameter === undefined)
                    secondParameter = paramName;
                parameterArray.push(paramName);
                parameters += paramName + ": " + paramType;
                if (p !== (match.length - 1))
                    parameters += ", ";
                parsedSelector = parsedSelector.replace(match[p], " parameters." + paramName + " ");
                subscriptionOptions += "\"" + paramName + "\": parameters." + paramName + ", ";
            };
            subscriptionOptions += "},";
        }
        parsedSelector = parsedSelector.replace(/\"_currentLoggedInUser_\"/g, userIdString);
    }

    return {
        parameters: parameters,
        firstParameter: firstParameter,
        secondParameter: secondParameter,
        parameterArray: parameterArray,
        subscriptionOptions: subscriptionOptions,
        parsedSelector: parsedSelector
    }
}

module.exports = functions;