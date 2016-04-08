/**
 * THIS FILE IS AUTO-GENERATED AND WILL BE REPLACED ON ANY RE-COMPILE
 */

/// <reference path="<%= relativePathToTypeDefinitionsGen %>/meteor/meteor.d.ts" />
/// <reference path="<%= relativePathToTypeDefinitionsGen %>/underscore/underscore.d.ts" />
/// <reference path="<%= relativePathFromGeneratedCollectionToCollectionService %>" />
/// <reference path="<%= relativePathFromGeneratedCollectionToSmallstackCollection %>" />
/// <reference path="<%= relativePathFromCollectionToModel %>" />


class <%= generatedCollectionClassName %> implements SmallstackCollection<<%=modelClassName%>> {
	
	protected _collection: Mongo.Collection<<%=modelClassName%>>;
	public static name = "<%=collectionName%>";
	public name = "<%=collectionName%>";
	
	protected collectionService:CollectionService;
	protected rolesService:RolesService;
	
	public static queries = {<% 
		for(var q = 0; q < config.service.queries.length; q++) {%>
		"<%=config.service.queries[q].name%>": {name : "<%=config.service.queries[q].name%>", parameters : {<% 
		var parameters = functions.getAllQueryParameters(config.service.queries[q]);
		for (var p = 0; p < parameters.length; p++) {
			print(parameters[p] + " : \"" + parameters[p] + "\"");
			if (p !== (parameters.length - 1))
				print(", ");	
		}		
		%>}}<% if (q !== (config.service.queries.length - 1)) {%>,<%}		
	};%>
	}
	
	public static expandables = {<% 
		var expandables = functions.getExpandablesArray(config.model.schema); 
		for(var e = 0; e < expandables.length; e++) {
		%>"<%=expandables[e]%>": "<%=expandables[e]%>"<% if (e !== (expandables.length - 1)) {%>,<%}		
	};%>}
	
	constructor() {
		this.collectionService = smallstack.ioc.get<CollectionService>("collectionService");
		this.rolesService = smallstack.ioc.get<RolesService>("rolesService");
		
		// create collection
		this.createCollection();
		this._collection["smallstackCollection"] = this;
		
		// allow/deny
		this.configureAllowDenyRules();
				
		// attach schema
		var schema = this.getSchema();
		if (schema === undefined)
			throw new Error("No Schema given for collection : <%=collectionName%>");
		else {
			var simpleSchema = new SimpleSchema(schema);
			this._collection.attachSchema(simpleSchema);
			smallstack.schemas["<%=collectionName%>"] = simpleSchema;
		}
		
		// create search index
		if (Package["easysearch:core"]) {
			console.log("Creating search index for collection '<%=collectionName%>' and fields '<%=functions.getSearchableFieldsArray(config.model.schema)%>'!");
			smallstack.indizes["<%=collectionName%>"] = new EasySearch.Index({
				collection: this._collection,
				fields: <%=JSON.stringify(functions.getSearchableFieldsArray(config.model.schema))%>,
				engine: new EasySearch.MongoDB()
			});
		}

		// attach collection to smallstack.collections
		smallstack.collections["<%=collectionName%>"] = this._collection;
		
		// Add publishing methods
		this.createPublications();
	}	
	
	protected createPublications() {
		if (Meteor.isServer) {
			<% _.forEach(config.service.queries, function(query) {
            if (typeof query.name !== 'string' || query.name.length === 0)
                throw new Error("query.name is empty for query : " + query);
                        
			%>this.collectionService.addPublisher("<%=config.collection.name%>", "<%=query.name%>"<% if(query.selector !== undefined) {%>, <%=JSON.stringify(query.selector)%><%} if (query.options !== undefined) {%>, <%=JSON.stringify(query.options)%><%}%>);
		<%});%>}
	}
	
	protected createCollection() {
		this._collection = new Mongo.Collection<<%=modelClassName%>>("<%=collectionName%>", { "transform" : function(doc){
			return <%=modelClassName%>.fromDocument(doc);
		}});
		console.log("created collection : <%=collectionName%>");
	}
	
	protected configureAllowDenyRules():void {

		var allow = this.getCollectionAllowRules();
		if (allow !== undefined)
			this._collection.allow(allow);
		else {
			var deny = this.getCollectionDenyRules();
			if (deny !== undefined)
				this._collection.deny(deny);
			else
				console.warn("No allow/deny rules set for collection : <%=collectionName%>");
		}
	}
	
		
	/**
	 * If return value is not undefined these rules will get applied 
	 */
	protected getCollectionAllowRules(): Mongo.AllowDenyOptions {
		return {
            insert: function(userId, doc) {
                // the user must be logged in, and the document must be owned by the user
                return (userId && doc.ownerId === userId);
            },
            update: function(userId, doc, fields, modifier) {
                // can only change your own documents
                return (doc.ownerId === userId || this.rolesService.userHasRole(userId, "<%=functions.lowerCaseFirst(modelClassName)%>-manage", "<%=functions.lowerCaseFirst(modelClassName)%>-" + doc._id));
            },
            remove: function(userId, doc) {
                // can only remove your own documents
                return (doc.ownerId === userId || this.rolesService.userHasRole(userId, "<%=functions.lowerCaseFirst(modelClassName)%>-manage", "<%=functions.lowerCaseFirst(modelClassName)%>-" + doc._id));
            },
            fetch: ['ownerId']
        }
	}
	
	/** 
	 * Only if getCollectionAllowRules return undefined this method will be used. If return value is not undefined, these deny rules will apply.
	 */
	protected getCollectionDenyRules(): Mongo.AllowDenyOptions {
		return undefined;
	}


	protected getSchema(): any {
		return {<% 
		_.forEach(config.model.schema, function(schema) {%>
			"<%=functions.getModelPropertyName(schema, others)%>" : {
				"type" : <%=functions.getSchemaType(schema.type)%><% 
				if (schema.allowedValues !== undefined) {%>,
				"allowedValues" : <%= functions.toArrayString(schema.allowedValues) %><%}%><% 
				if (schema.defaultValue !== undefined) {%>,
				"defaultValue" : <%= JSON.stringify(schema.defaultValue) %><%}%><% 
				if (schema.decimal !== undefined) {%>,
				"decimal" : <%= schema.decimal %><%}%><% 
				if (schema.optional !== undefined) {%>,
				"optional" : <%= schema.optional %><%}%><% 
				if (schema.minCount !== undefined) {%>,
				"minCount" : <%= schema.minCount %><%}%><% 
				if (schema.maxCount !== undefined) {%>,
				"maxCount" : <%= schema.maxCount %><%}%>
			},<%})%>
		};
	}

	public static getMongoCollection(): Mongo.Collection<<%=modelClassName%>> {
		return smallstack.collections["<%=collectionName%>"];
	}

	public getMongoCollection(): Mongo.Collection<<%=modelClassName%>> {
		return smallstack.collections["<%=collectionName%>"];
	}
	
	
	public getForeignCollection(typeName: string) {
		switch(typeName) {
			<% _.forEach(config.model.schema, function(schema) {
				if(schema.type === "foreign" || schema.type === "foreign[]") {%>
			case "<%=functions.getModelPropertyName(schema)%>": 
				return "<%=schema.collection%>";<%
			}
			})%>
		}
		return undefined;
	}
	
	public getForeignGetter(): string {
		return "<%=functions.getByIdsGetter(modelClassName)%>";
	}
	
	public static getForeignGetter(): string {
		return "<%=functions.getByIdsGetter(modelClassName)%>";
	}
}