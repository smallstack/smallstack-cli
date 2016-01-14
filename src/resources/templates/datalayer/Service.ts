
/// <reference path="<%= relativePathFromServiceToGeneratedService %>" />
/// <reference path="<%= functions.relativePath(servicesDirectory, modelsDirectory) %>/<%=modelClassName%>.ts" />


class <%= serviceClassName %> extends <%= generatedServiceClassName %><<%=modelClassName%>> {

	/**
	 * If you want to you can implement your own service methods here. This file only gets generated once and will not get overwritten!
	 */

}