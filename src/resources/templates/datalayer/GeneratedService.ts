/**
 * THIS FILE IS AUTO-GENERATED AND WILL BE REPLACED ON ANY RE-COMPILE
 */

/// <reference path="<%= relativePathToTypeDefinitionsGen %>/underscore/underscore.d.ts" />
/// <reference path="<%= relativePathToTypeDefinitionsGen %>/meteor/meteor.d.ts" />
/// <reference path="<%= functions.relativePath(modelsGeneratedDirectory, general.smallstackDirectory) %>/interfaces/QueryOptions.ts" />
/// <reference path="<%= functions.relativePath(modelsGeneratedDirectory, general.smallstackDirectory) %>/interfaces/CollectionService.ts" />
/// <reference path="<%= functions.relativePath(modelsGeneratedDirectory, general.smallstackDirectory) %>/interfaces/RolesService.ts" />
/// <reference path="<%= functions.relativePath(modelsGeneratedDirectory, general.smallstackDirectory) %>/interfaces/DataBridge.ts" />
/// <reference path="<%= relativePathFromServiceToModel %>" />


class <%= generatedServiceClassName %> {
	
    private rolesService: any;
    private collectionService: CollectionService;
    private dataBridge:DataBridge;
    
	constructor() {
        this.rolesService = smallstack.ioc.get<RolesService>("rolesService");
        this.collectionService = smallstack.ioc.get<CollectionService>("collectionService");
        this.dataBridge = smallstack.ioc.get<DataBridge>("dataBridge");
        this.getCollection()["smallstackService"] = this;
        
        // create default roles
        this.rolesService.createRole("<%=functions.lowerCaseFirst(modelClassName)%>-manage");
        this.rolesService.createRole("<%=functions.lowerCaseFirst(modelClassName)%>-write");
        this.rolesService.createRole("<%=functions.lowerCaseFirst(modelClassName)%>-read");
	}
    
    static instance(): <%= serviceClassName %> {
        return smallstack.ioc.get<<%= serviceClassName %>>("<%= functions.lowerCaseFirst(serviceClassName) %>");
    }
	
		
	public getCollection(): Mongo.Collection<<%=modelClassName%>> {
        return this.collectionService.getCollectionByName("<%= collectionName %>");
	}
    
    // generated service methods for queries
	<% 
		_.forEach(config.service.queries, function(query){ 
			// scan selector for possible variables
			var parameters = "";
            var firstParameter = undefined;
            var secondParameter = undefined;
            var parameterArray = [];
            var subscriptionOptions = "";
			var parsedSelector = JSON.stringify(query.selector) || "{}";
			if (query.selector !== undefined) {
				var stringified = JSON.stringify(query.selector);
				var match = stringified.match(/\"\:([a-zA-Z\[\]\:]{2,})\"/g);
				if (match !== null)	{
                    subscriptionOptions += "{";
                    for (var p = 0; p < match.length; p++) {
						var param = _.trim(match[p],'":');
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
						parsedSelector = parsedSelector.replace(match[p]," parameters." + paramName + " ");
                        subscriptionOptions += "\"" + paramName + "\": parameters." + paramName + ", ";
					};
                    subscriptionOptions += "},";
				}
                 parsedSelector = parsedSelector.replace(/\"$currentUserId\"/g,"UserService.getCurrentUserId()");
			}
            
            // one or many?
            var sorting = query.sorting !== undefined ? JSON.stringify(query.sorting) : "{}";
            var mongoQuery = "self.getCollection().find(" + parsedSelector + ", selectorOptions)";
            // if (query.returnOne === true)
            //     mongoQuery = "smallstack.collections[\"" + collectionName + "\"].findOne(" + parsedSelector + ")";
            
	%>
	public get<%= _.capitalize(query.name) %>(parameters: {<%=parameters%>}, options?: QueryOptions): QueryObject<<%=modelClassName%>> {
        var self = this;
        var selectorOptions:any = {sort : <%=sorting%>, reactive: true};        
        if (options && options.currentPage && options.entriesPerPage) selectorOptions.skip = ((options.currentPage - 1) * options.entriesPerPage);
        if (options && options.entriesPerPage) selectorOptions.limit = options.entriesPerPage;
        var cursor = <%= mongoQuery %>;
        return {
            cursor : cursor,
            subscribe : function() {
                return self.dataBridge.subscribe("<%=query.name%>", parameters, selectorOptions);
            },
            expand: function(foreignKeys:string[], callback?: () => void) {
                self.collectionService.subscribeForeignKeys(self.getCollection()["smallstackCollection"], cursor, foreignKeys, callback);
            }
        }
	}		
    
    public get<%= _.capitalize(query.name) %>Count(parameters : {<%=parameters%>}): number {
        return this.dataBridge.getCountForQuery("<%=query.name%>", parameters);
	}	
	<% }) %>

	<% 
	_.forEach(config.service.securedmethods, function(method){%>
	public <%=method.name%>(<%=functions.convertMethodParametersToTypescriptMethodParameters(method.parameters, true)%>callback?: (error: Error, result: any) => void) {
<%=functions.getChecksForParameters(method.parameters, others)%>    
        Meteor.call("<%=collectionName%>-<%=method.name%>", <%=functions.arrayToCommaSeparatedString(method.parameters, false, true, true)%>callback);
	}					
	<%});%>
	
	// Model Operations
    public save<%=modelClassName%>(model:<%=modelClassName%>, callback?: (error: Error, savedId:string) => void): string {
        return this.getCollection().insert(model.toDocument(), callback);
	}

	public update<%=modelClassName%>(model:<%=modelClassName%>, callback?: (error: Error, numberOfUpdatedDocuments:number) => void):number {
        return this.getCollection().update(model.id, <%=functions.getMongoUpdateJson(others[collectionName].config.model.schema) %>, callback);
	}
	
	public delete<%=modelClassName%>(model:<%=modelClassName%>, callback?: (error: Error, numberOfRemovedDocuments:number) => void):number {
		return this.getCollection().remove(model.id, callback);
	}
}