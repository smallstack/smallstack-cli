/**
 * THIS FILE IS AUTO-GENERATED AND WILL BE REPLACED ON ANY RE-COMPILE
 */

/// <reference path="<%= relativePathToTypeDefinitionsGen %>/smallstack.d.ts" />
/// <reference path="<%= relativePathToTypeDefinitionsGen %>/meteor/meteor.d.ts" />
/// <reference path="<%= relativePathToTypeDefinitionsGen %>/underscore/underscore.d.ts" />
/// <reference path="<%= relativePathFromGeneratedModelToPackages %>/smallstack-collections/QueryObject.ts" />
/// <reference path="<%= relativePathFromGeneratedModelToPackages %>/smallstack-collections/QueryOptions.ts" />

/// <reference path="<%= relativePathFromGeneratedModelToModel %>" />
<%

// check for unknown properties
functions.checkSchema(config.model.schema, config.model.name);
	
_.forEach(config.model.schema, function(schema) {
	

	
	if (schema.type === "foreign" || schema.type === "foreign[]") {	
        if (schema.collection === undefined)
            throw new Error("schema." + schema.name + " is of type foreign or foreign[] but doesn't have a collection!!!");
        if (others[schema.collection] === undefined)
            throw new Error("Type '" + schema.collection + "' is unknown!");
			
		if (others[schema.collection].modelClassName !== modelClassName) {
        %>
/// <reference path="<%=functions.relativePath(modelsGeneratedDirectory,others[schema.collection].servicesDirectory + "/" + others[schema.collection].serviceClassName + ".ts")%>" /><%
    	}
	}
});


var enumsFound = false;
var foreignKeysFound = false;

_.forEach(config.model.schema, function(schema) {
	if (schema.type === "foreign" || schema.type === "foreign[]") {
		foreignKeysFound = true;
	}
});



var subTypes = [];

function addSubtype(currentArray, split, schema) {
	var subType = split[0];
	if (currentArray[subType] === undefined)
		currentArray[subType] = {};
	if (split.length > 1)
		addSubtype(currentArray[subType], _.drop(split, 1), schema);
	else 
		currentArray[subType] = schema.type;
}

function getSubTypes(schema) {
	_.forEach(schema, function(schema) {
		if (schema.name.indexOf(".") !== -1) {
			var split = schema.name.split(".");
			addSubtype(subTypes, split, schema);
		}
	});
	return subTypes;
}

// check model properties


%>


<% if(config.model.abstract === true) print("abstract "); %>class <%= generatedModelClassName %><% if (config.model.extends !== undefined) {%> extends <%=config.model.extends%><%}%><% if (config.model.implements !== undefined) {%> implements <%=config.model.implements%><%}%> {
	
	// generated model properties
	public id:string;
	<% _.forEach(config.model.schema, function(schema) {
		if (typeof schema.name !== "string")
				throw new Error(config.filename + " --> model.schema : All schemas must have a non-empty string as 'name'!");
		if (typeof schema.type !== "string")
				throw new Error(config.filename + " --> model.schema." + schema.name + ".type must be a non-empty string!");
		if (schema.allowedValues !== undefined)
			enumsFound = true;
		if (schema.name.indexOf(".") === -1) {
            %>public <%=functions.getModelPropertyName(schema) %>: <%=functions.getTypescriptType(schema.type) %><% if (schema.defaultValue !== undefined) {%> = <%=JSON.stringify(schema.defaultValue)%><%}%>; 
	<% }
	else {
		throw new Error(config.filename + " --> model.schema." + schema.name + ".name : dot annotation is not yet supported!");
		}
	});
	 %>	
	
	// internal properties
	private _hasSubDocuments:boolean = <%=foreignKeysFound%>;
	private _isStored:boolean = false;
	
	<% if (enumsFound) {%>
	// generated enums
	public static enums = {
		<% for(var s = 0; s < config.model.schema.length; s++) {
		if (config.model.schema[s].allowedValues !== undefined) {
			%>"<%=config.model.schema[s].name%>": { <%for(var a = 0; a < config.model.schema[s].allowedValues.length; a++){
	 			%>"<%=config.model.schema[s].allowedValues[a].toUpperCase()%>": "<%=config.model.schema[s].allowedValues[a]%>"<% if (a !== (config.model.schema[s].allowedValues.length - 1)) {%>,<%}
				};
			 %>}<% if (s !== (config.model.schema.length - 1)) {%>,
		<%}
		}		
		};
		%>
	}<%
	} %>
	
	// roles
	public static roles = {
		manage : "<%=functions.lowerCaseFirst(modelClassName)%>-manage",
		write : "<%=functions.lowerCaseFirst(modelClassName)%>-write",
		read : "<%=functions.lowerCaseFirst(modelClassName)%>-read"
	}
		
	// generated constructors and factory methods
	constructor() {
		
	}
	
	public static fromDocument(doc: any): <%= modelClassName %> {
		<% if(config.model.abstract === true) { %>
		throw new Error("<%= generatedModelClassName %> is abstract and cannot be instanciated!");
		<%} else {%>
		var model = new <%= modelClassName %>();
		if (doc._id !== undefined) {
			model._isStored = true; 
			model.id = doc._id;		
		}
		<% _.forEach(config.model.schema, function(schema) {
	 		%>model["<%=functions.getModelPropertyName(schema) %>"] = doc["<%=functions.getModelPropertyName(schema) %>"]; 
		<%});
		%>return model;
		<% } %>
	}
	
	public toDocument() {
		var doc = {};
		<% _.forEach(config.model.schema, function(schema) {
	 		%>doc["<%=functions.getModelPropertyName(schema) %>"] = this["<%=functions.getModelPropertyName(schema) %>"]; 
		<%});%>
		if (this.isStored()) {
			doc["_id"] = this.id;
		}
		return doc;
	}

	<% _.forEach(config.model.schema, function(schema) {
		if (schema.type === "foreign" || schema.type === "foreign[]") {
			if (typeof schema.collection !== "string")
				throw new Error(config.filename + " --> model.schema." + schema.name + ".collection must be a non-empty string when using 'foreign' or 'foreign[]' as type!");                    
        if (schema.type === "foreign[]") {                    
    %>
	
	/** 
	 * Adds a reference to <%=functions.capitalize(schema.name) %> 
	 */
    public add<%= functions.capitalize(functions.getModelPropertyName(schema)) %>(ids:string[]) {
        if (this.<%=functions.getModelPropertyName(schema)%> === undefined)
            this.<%=functions.getModelPropertyName(schema)%> = [];
		_.each(ids, function(id) {
			if (!_.contains(this.<%=functions.getModelPropertyName(schema)%>, id))
				this.<%=functions.getModelPropertyName(schema)%>.push(id);
		}, this);
	}
		
<%}%>
    public <%=functions.getForeignModelGetterName(schema,false,others, functions) %>(options?:QueryOptions): QueryObject<<%=others[schema.collection].modelClassName%>> {
		return smallstack.ioc.get<<%=others[schema.collection].serviceClassName%>>("<%=functions.lowerCaseFirst(others[schema.collection].serviceClassName)%>").<%=functions.getForeignModelGetterName(schema,true, others) %>({id<% if (schema.type === "foreign[]") {%>s<%}%> : this.<%=functions.getModelPropertyName(schema)%>}, options);
	}
		<%
	}
	}) %>
	
	/**
	 * Returns true if the model can contain sub documents
	 */
	public hasSubDocuments(): boolean {
		return this._hasSubDocuments; 
	}
	
	/**
	 * Deletes all sub documents recursively
	 */
	public deleteSubDocuments(): void {
		<% if (foreignKeysFound) {
		 _.forEach(config.model.schema, function(schema) {
		if (schema.type === "foreign[]") {%>
		smallstack.collections["<%=schema.collection%>"].find({"_id" : { "$in" : this["<%=functions.getModelPropertyName(schema)%>"]}}).forEach(function(model){
			if (model.hasSubdocuments()) {
				model.deleteSubDocuments();
			}
			smallstack.collections["<%=schema.collection%>"].remove(model.id);
		});		
		<%}	else if (schema.type === "foreign") {%>
		smallstack.collections["<%=schema.collection%>"].find({"_id" : this["<%=functions.getModelPropertyName(schema)%>"]}).forEach(function(model){
			if (model.hasSubdocuments()) {
				model.deleteSubDocuments();
			}
			smallstack.collections["<%=schema.collection%>"].remove(model.id);
		});		
		<%}		
	})}%>
	}
	
	/**
	 * Returns true if model is stored in database
	 */
	public isStored(): boolean {
		return this._isStored;
	}
    
    <%    
	_.forEach(config.service.securedmethods, function(method){
        if (method.modelAware === true) {%>
	public <%=method.name%>(<%=functions.arrayToCommaSeparatedString(method.parameters, true, true, false)%>callback?: (error: Meteor.Error, result: <%=method.returns%>) => void): void {
        return <%=functions.getServiceName(config)%>.instance().<%=method.name%>(this.id, <%=functions.arrayToCommaSeparatedString(method.parameters,false, true, false)%>callback);
	}					
	<%}});%>
	
	
	public delete(callback?:(error: Meteor.Error, numberOfRemovedDocuments:number) => void): number {
		if (callback === undefined && Meteor.isClient)  {
			var that = this;
			callback = function(error: Meteor.Error, numberOfRemovedDocuments:number) {
				if (error)
					NotificationService.instance().getStandardErrorPopup(error, "Could not delete <%=config.model.name%> with ID '" + that.id + "'!");
				else
					NotificationService.instance().notification.success("Successfully removed <%=config.model.name%> with ID '" + that.id + "'!");
			}
		}
		return <%=functions.getServiceName(config)%>.instance().delete<%=config.model.name%>(<any> this, callback);
	}
	
	public update(callback?:(error: Meteor.Error, numberOfSavedDocuments:number) => void): number {
		if (callback === undefined && Meteor.isClient)  {
			var that = this;
			callback = function(error: Meteor.Error, numberOfSavedDocuments:number) {
				if (error)
					NotificationService.instance().getStandardErrorPopup(error, "Could not update <%=config.model.name%> with ID '" + that.id + "'!");
				else
					NotificationService.instance().notification.success("Successfully updated <%=config.model.name%> with ID '" + that.id + "'!");
			}
		}
		return <%=functions.getServiceName(config)%>.instance().update<%=config.model.name%>(<any> this, callback);
	}
	
	public getModelName() {
		return "<%= modelClassName %>";
	}
}