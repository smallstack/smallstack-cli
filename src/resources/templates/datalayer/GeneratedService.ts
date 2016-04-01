/**
 * THIS FILE IS AUTO-GENERATED AND WILL BE REPLACED ON ANY RE-COMPILE
 */

/// <reference path="<%= relativePathFromGeneratedServiceToGeneratedDefinitionsFile %>" />
/// <reference path="<%= relativePathToTypeDefinitionsGen %>/underscore/underscore.d.ts" />
/// <reference path="<%= relativePathFromGeneratedServiceToPackages %>/smallstack-collections/QueryOptions.ts" />
/// <reference path="<%= relativePathFromServiceToModel %>" />


class <%= generatedServiceClassName %> {
	
    private subscriptionManager: any;
    private rolesService: any;
    private collectionService: any;
    
	constructor() {
        this.subscriptionManager = smallstack.ioc.get("subscriptionManager");
        this.rolesService = smallstack.ioc.get<RolesService>("rolesService");
        this.collectionService = smallstack.ioc.get<CollectionService>("collectionService");
        this.getCollection()["smallstackService"] = this;
        
        // create default roles
        if (Meteor.isServer) {
            this.rolesService.createRole("<%=functions.lowerCaseFirst(modelClassName)%>-manage");
            this.rolesService.createRole("<%=functions.lowerCaseFirst(modelClassName)%>-write");
            this.rolesService.createRole("<%=functions.lowerCaseFirst(modelClassName)%>-read");
        }
	}
    
    static instance(): <%= serviceClassName %> {
        return smallstack.ioc.get<<%= serviceClassName %>>("<%= functions.lowerCaseFirst(serviceClassName) %>");
    }
	
		
	public getCollection(): Mongo.Collection<<%=modelClassName%>> {
		return smallstack.collections["<%= collectionName %>"];
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
						var param = functions.trim(match[p],'":');
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
                 parsedSelector = parsedSelector.replace(/\"_currentLoggedInUser_\"/g,"Meteor.userId()");
			}
            
            // one or many?
            var sorting = query.sorting !== undefined ? JSON.stringify(query.sorting) : "{}";
            var mongoQuery = "smallstack.collections[\"" + collectionName + "\"].find(" + parsedSelector + ", selectorOptions)";
            // if (query.returnOne === true)
            //     mongoQuery = "smallstack.collections[\"" + collectionName + "\"].findOne(" + parsedSelector + ")";
            
    
	%>
	public get<%= functions.capitalize(query.name) %>(parameters: {<%=parameters%>}, options?: QueryOptions): QueryObject<<%=modelClassName%>> {
        var self = this;
        var selectorOptions:any = {sort : <%=sorting%>, reactive: true};        
        if (options && options.currentPage && options.entriesPerPage) selectorOptions.skip = ((options.currentPage - 1) * options.entriesPerPage);
        if (options && options.entriesPerPage) selectorOptions.limit = options.entriesPerPage;
        var cursor = <%= mongoQuery %>;
        return {
            cursor : cursor,
            subscribe : function($scope: any) {
                return $scope.$meteorSubscribe("<%=query.name%>", parameters, selectorOptions);
            },
            val : function(index) {
                if (index === undefined)
                    return cursor.fetch();
                else 
                    return cursor.fetch()[index];
            },
            expand: function($scope: any, foreignKeys:string[], callback?: () => void) {
                self.collectionService.subscribeForeignKeys($scope, self.getCollection()["smallstackCollection"], cursor, foreignKeys, callback);
            }
        }
	}		
    
    public get<%= functions.capitalize(query.name) %>Count(parameters : {<%=parameters%>}): number {
        return (<any>Counts).get("count-<%=query.name%>");
	}	
	<% }) %>

	<% 
	_.forEach(config.service.securedmethods, function(method){%>
        
	public <%=method.name%>(<%=functions.convertMethodParametersToTypescriptMethodParameters(method.parameters, true)%>callback?: (error: Meteor.Error, result: any) => void): void {
        Meteor.call("<%=collectionName%>-<%=method.name%>", <%=functions.convertMethodParametersToObject(method.parameters)%>, callback);
	}					
	<%});%>
    
	// Model Operations
    public save<%=modelClassName%>(model:<%=modelClassName%>, callback?: (error: Meteor.Error, savedId:string) => void): string {
		//check(model, smallstack.schemas["<%=collectionName%>"]);
        return smallstack.collections["<%=collectionName%>"].insert(model.toDocument(), callback);
	}

	public update<%=modelClassName%>(model:<%=modelClassName%>, callback?: (error: Meteor.Error, numberOfUpdatedDocuments:number) => void):number {
		//check(model, smallstack.schemas["<%=collectionName%>"]);
        return smallstack.collections["<%=collectionName%>"].update(model.id, <%=functions.getMongoUpdateJson(others[collectionName].config.model.schema) %>, callback);
	}
	
	public delete<%=modelClassName%>(model:<%=modelClassName%>, callback?: (error: Meteor.Error, numberOfRemovedDocuments:number) => void):number {
		//check(model, smallstack.schemas["<%=collectionName%>"]);
		return smallstack.collections["<%=collectionName%>"].remove(model.id, callback);
	}
}