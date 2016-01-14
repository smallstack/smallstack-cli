/**
 * THIS FILE IS AUTO-GENERATED AND WILL BE REPLACED ON ANY RE-COMPILE
 */

/// <reference path="<%= relativePathToTypeDefinitionsGen %>/underscore/underscore.d.ts" />
/// <reference path="<%= relativePathToTypeDefinitionsGen %>/meteor/meteor.d.ts" />
/// <reference path="<%= functions.relativePath(servicesGeneratedDirectory, general.smallstackDirectory) %>/interfaces/QueryOptions.ts" />
/// <reference path="<%= functions.relativePath(servicesGeneratedDirectory, general.smallstackDirectory) %>/interfaces/QueryObject.ts" />
/// <reference path="<%= functions.relativePath(servicesGeneratedDirectory, general.smallstackDirectory) %>/interfaces/CollectionService.ts" />
/// <reference path="<%= functions.relativePath(servicesGeneratedDirectory, general.smallstackDirectory) %>/interfaces/DataBridge.ts" />

/// <reference path="<%= functions.relativePath(servicesGeneratedDirectory, modelsGeneratedDirectory) %>/<%=generatedModelClassName%>.ts" />


<%  var genericTypeName = modelClassName.toUpperCase(); %>

class <%= generatedServiceClassName %><<%=genericTypeName%> extends <%=generatedModelClassName%>> {
    
	constructor() {        

	}
    
    public getCollection(): any {
        return smallstack.ioc.get<CollectionService>("collectionService").getCollectionByName("<%= collectionName %>");
    }
    
    static instance(): <%= serviceClassName %> {
        return smallstack.ioc.get<<%= serviceClassName %>>("<%= functions.lowerCaseFirst(serviceClassName) %>");
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
	public get<%= _.capitalize(query.name) %>(parameters: {<%=parameters%>}, options?: QueryOptions): QueryObject<<%=genericTypeName%>> {      
        var selectorOptions:any = {sort : <%=sorting%>, reactive: true};        
        if (options && options.currentPage && options.entriesPerPage) selectorOptions.skip = ((options.currentPage - 1) * options.entriesPerPage);
        if (options && options.entriesPerPage) selectorOptions.limit = options.entriesPerPage;
        
        var queryObject:QueryObject<<%=genericTypeName%>> = new smallstack.dataBridge.QueryObject();
        queryObject.setSelector(<%=parsedSelector%>);
        queryObject.setOptions(selectorOptions);
        
        return queryObject;
	}		
    
    public get<%= _.capitalize(query.name) %>Count(parameters : {<%=parameters%>}): number {
        return smallstack.dataBridge.getCountForQuery("<%=query.name%>", parameters);
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
    public save<%=modelClassName%>(model:<%=genericTypeName%>, callback?: (error: Error, savedId:string) => void): string {
        return this.getCollection().insert(model.toDocument(), callback);
	}

	public update<%=modelClassName%>(model:<%=genericTypeName%>, callback?: (error: Error, numberOfUpdatedDocuments:number) => void):number {
        return this.getCollection().update(model.id, <%=functions.getMongoUpdateJson(others[collectionName].config.model.schema) %>, callback);
	}
	
	public delete<%=modelClassName%>(model:<%=genericTypeName%>, callback?: (error: Error, numberOfRemovedDocuments:number) => void):number {
		return this.getCollection().remove(model.id, callback);
	}
}