
/// <reference path="<%= relativePathFromModelToGeneratedModel %>" />

<% if(config.model.abstract === true) print("abstract "); %>class <%= modelClassName %> extends <%= generatedModelClassName %> {

	/**
	 * If you want to you can implement your own model methods here. This file only gets generated once and will not get overwritten!
	 */

}