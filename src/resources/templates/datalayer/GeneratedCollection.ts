/**
 * THIS FILE IS AUTO-GENERATED AND WILL BE REPLACED ON ANY RE-COMPILE
 */

/// <reference path="<%= relativePathToTypeDefinitionsGen %>/smallstack.d.ts" />
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
		_.forEach(config.service.queries, function(query, index) {%>
		"<%=query.name%>": {name : "<%=query.name%>", parameters : {<% 
		var parameters = functions.getAllQueryParameters(query);
		for (var p = 0; p < parameters.length; p++) {
			print(parameters[p] + " : \"" + parameters[p] + "\"");
			if (p !== (parameters.length - 1))
				print(", ");	
		}		
		%>}}<% if (index !== (config.service.queries.length - 1)) {%>,<%}		
		});%>
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
        this.createSearchIndex();

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
			var selector = query.selector !== undefined ? query.selector : {};
			var options = {};
			if (query.sorting)
				options.sort = query.sorting; 
			if (query.fields)
				options.fields = query.fields;                       
			%>this.collectionService.addPublisher("<%=config.collection.name%>", "<%=query.name%>", <%=JSON.stringify(selector)%>, <%=JSON.stringify(options)%>);
		<%});%>}
	}
    
    protected createSearchIndex() {
        if (Package["easysearch:core"]) {
			smallstack.logger.debug("EasySearch", "Creating search index for collection '<%=collectionName%>' and fields '<%=functions.getSearchableFieldsArray(config.model.schema)%>'!");
			smallstack.indizes["<%=collectionName%>"] = new EasySearch.Index({
				collection: this._collection,
				fields: <%=JSON.stringify(functions.getSearchableFieldsArray(config.model.schema))%>,
				engine: new EasySearch.MongoDB()
			});
		}
    }
	
	protected createCollection() {
		this._collection = new Mongo.Collection<<%=modelClassName%>>("<%=collectionName%>", { "transform" : function(doc){
			return <%=modelClassName%>.fromDocument(doc);
		}});
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
		var that = this;
		return {
            insert: function(userId, doc) {
                // the user must be logged in, and the document must be owned by the user
                return (userId && doc.ownerId === userId);
            },
            update: function(userId, doc, fields, modifier) {
                // can only change your own documents
                return (doc.ownerId === userId || that.rolesService.userHasRole(userId, "<%=functions.lowerCaseFirst(modelClassName)%>-manage", "<%=functions.lowerCaseFirst(modelClassName)%>-" + doc._id));
            },
            remove: function(userId, doc) {
                // can only remove your own documents
                return (doc.ownerId === userId || that.rolesService.userHasRole(userId, "<%=functions.lowerCaseFirst(modelClassName)%>-manage", "<%=functions.lowerCaseFirst(modelClassName)%>-" + doc._id));
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
				if (schema.blackbox !== undefined) {%>,
				"blackbox" : <%= schema.blackbox %><%}%><% 
				if (schema.index !== undefined) {%>,
				"index" : <%= schema.index %><%}%><% 
				if (schema.unique !== undefined) {%>,
				"unique" : <%= schema.unique %><%}%><% 
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

	public getModelName() {
		return "<%= modelClassName %>";
	}

	public getServiceName(): string {
		return "<%=functions.lowerCaseFirst(serviceClassName)%>";
	}

	public getQueries():{[queryName: string]: any} {
		return <%= generatedCollectionClassName %>.queries;
	}
}