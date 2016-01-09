module.exports = function (grunt) {

	var path = require("path");
	var inquirer = require(process.cwd() + "/node_modules/inquirer");
	var _ = require(process.cwd() + "/node_modules/underscore");
	var fs = require(process.cwd() + "/node_modules/fs-extra");
	var pluralize = require(process.cwd() + "/node_modules/pluralize");
    var genFunctions = require("../functions/generateSourcesFunctions");

	function processTemplate(from, to, replacers) {

		var template = grunt.file.read(from);
		var content = grunt.template.process(template, {
			data: replacers
		});
		grunt.file.write(to, content);
	}


	grunt.registerTask("ui", ["ui:prepare", "generate:prepare", "ui:generate"]);

	grunt.registerTask("ui:prepare", function () {

		var done = this.async();
		inquirer.prompt([{
			type: "list",
			name: "type",
			message: "Which type would you like to generate the UI for?",
			choices: function () {
				var types = [];
				var allSmallstackFiles = grunt.file.expand("app/**/*.smallstack.json");
				if (allSmallstackFiles.length === 0)
					throw new Error("No smallstack data types (*.smallstack.json files) found!");
				_.each(allSmallstackFiles, function (smallstackFile) {
					var jsonContent = grunt.file.readJSON(smallstackFile);
					if (jsonContent !== undefined && jsonContent.collection !== undefined && jsonContent.collection.name !== undefined)
						types.push({ name: jsonContent.collection.name, value: smallstackFile, short: jsonContent.collection.name });
				});
				types.sort(function (a, b) {
					return a.name.localeCompare(b.name);
				});
				return types;
			}
		}, {
				type: "input",
				name: "directory",
				message: "Where should the files be generated to? (relative to app/client directory)",
				default: function (answers) {
					var jsonContent = grunt.file.readJSON(answers.type);
					return "views/" + jsonContent.collection.name.toLowerCase();
				}
			}, {
				type: "confirm",
				name: "overwriteFiles",
				message: "The directory exists, overwrite?",
				default: false,
				when: function (answers) {
					return grunt.file.exists(path.join("app/client", answers.directory));
				}
			}, {
				type: "list",
				name: "theme",
				message: "Which theme would you like to use?",
				choices: function () {
					var themes = [];
					var allSmallstackFiles = grunt.file.expand("app/packages/smallstack-core/generator/resources/templates/ui/themes/*.json");
					_.each(allSmallstackFiles, function (smallstackFile) {
						themes.push(path.basename(smallstackFile, path.extname(smallstackFile)));
					});
					themes.sort();
					return themes;
				}
			}], function (answers) {
				grunt.config.set("ui.type", answers.type);
				grunt.config.set("ui.theme", answers.theme);
				grunt.config.set("ui.directory", answers.directory);
				grunt.config.set("ui.overwriteFiles", answers.overwriteFiles);
				done();
			});
	});

	grunt.registerTask("ui:generate", function () {
		grunt.task.requires("generate:prepare");
		grunt.task.requires("ui:prepare");

		var generateConfiguration = grunt.config.get("generate.configuration");

		var type = grunt.config.get("ui.type");
		var themeString = grunt.config.get("ui.theme");
		var theme = grunt.file.readJSON("app/packages/smallstack-core/generator/resources/templates/ui/themes/" + themeString + ".json");
		var directoryString = grunt.config.get("ui.directory");
		var directory = path.join("app/client", directoryString);
		var framework = "angular";
		var typeDefinition = grunt.file.readJSON(type);

		console.log("Generating " + framework + " / " + themeString + " UI for type : " + typeDefinition.collection.name);
		
		// check if directory already exists
		if (grunt.file.exists(directory) && !grunt.config.get("ui.overwriteFiles")) {
			throw new Error("Directory '" + directory + "' already exists, please choose a non-existing location!");
		}

		// create directories
		fs.ensureDirSync(directory);

		function getDestinationPath(templatePath, prefix) {
			if (prefix === undefined)
				prefix = false;
			var completePath = templatePath.replace("app/packages/smallstack-core/generator/resources/templates/ui/" + framework, directory).toLowerCase();
			if (!prefix)
				return completePath;
			var basePath = path.dirname(completePath);
			var fileName = path.basename(completePath);
			var prefixString = completePath.indexOf("/list/") === -1 ? pluralize.singular(typeDefinition.collection.name) : typeDefinition.collection.name;
			return path.join(basePath, prefixString + "." + fileName).toLowerCase();
		}

		var templates = grunt.file.expand("app/packages/smallstack-core/generator/resources/templates/ui/" + framework + "/**/*");
		_.each(templates, function (template) {
			if (grunt.file.isDir(template))
				fs.ensureDirSync(getDestinationPath(template, false));
			else {
				var destinationPath = getDestinationPath(template, true);
				console.log("Processsing Template : " + destinationPath);
				processTemplate(template, destinationPath, {
					type: typeDefinition,
					types: generateConfiguration.types,
					theme: theme,
					paths: {
						pathToGeneratedDefinitionFile: path.relative(path.dirname(destinationPath), "app/typedefinitions").replace(/\\/g, "/") + "/generated.d.ts",
						workingDirectory: path.dirname(directory).replace(/\\/g, "/").replace("app/", "")
					},
					f: genFunctions
				});
			}
		});

	});


}