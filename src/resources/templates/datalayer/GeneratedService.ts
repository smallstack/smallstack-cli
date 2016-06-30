/**
 * THIS FILE IS AUTO-GENERATED AND WILL BE REPLACED ON ANY RE-COMPILE
 */

/// <reference path="<%= relativePathToTypeDefinitionsGen %>/smallstack.d.ts" />
/// <reference path="<%= relativePathFromGeneratedServiceToPackages %>/smallstack-roles/RolesService.ts" />
/// <reference path="<%= relativePathFromGeneratedServiceToPackages %>/smallstack-collections/QueryOptions.ts" />
/// <reference path="<%= relativePathFromServiceToModel %>" />

declare var SubsCache: any;


class <%= generatedServiceClassName %> {
	
    public subscriptionManager: any;
    protected rolesService: RolesService;
    protected collectionService: CollectionService;
    
	constructor() {
        this.subscriptionManager = new SubsCache({
            expireAter: 5,
            cacheLimit: this.getSubscriptionCacheLimit()
        });;
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

    public getSubscriptionCacheLimit():number {
        return 10;
    }
    
    // generated service methods for queries
	<% 
		_.forEach(config.service.queries, function(query){ 
			// scan selector for possible variables
            var evaluatedQuery = functions.evaluateQuery(query);
            
            // one or many?
            var sorting = query.sorting !== undefined ? JSON.stringify(query.sorting) : "{}";
            var mongoQuery = "smallstack.collections[\"" + collectionName + "\"].find(" + evaluatedQuery.parsedSelector + ", selectorOptions)";
            // if (query.returnOne === true)
            //     mongoQuery = "smallstack.collections[\"" + collectionName + "\"].findOne(" + parsedSelector + ")";
            
    
	%>
	public get<%= functions.capitalize(query.name) %>(parameters: {<%=evaluatedQuery.parameters%>}, options?: QueryOptions): QueryObject<<%=modelClassName%>> {
        var self = this;
        var selectorOptions:any = {sort : <%=sorting%>, reactive: true};        
        if (options && options.currentPage && options.entriesPerPage) selectorOptions.skip = ((options.currentPage - 1) * options.entriesPerPage);
        if (options && options.entriesPerPage) selectorOptions.limit = options.entriesPerPage;
        var cursor = <%= mongoQuery %>;
        return {
            cursor: cursor,
            subscribe: (onReady?: () => void): void => {
                self.subscriptionManager.subscribe("<%=query.name%>", parameters, selectorOptions).onReady(onReady);
            }, 
            val: (index) => {
                if (index === undefined)<% if (config.customTransformMethod) {%>
                    return self["<%=config.customTransformMethod%>"](cursor.fetch());<%
                    } else {%>                 
                    return cursor.fetch();<%}%>
                else <% if (config.customTransformMethod) {%>
                    return self["<%=config.customTransformMethod%>"]([cursor.fetch()[index]])[0];<%
                    } else {%>
                    return cursor.fetch()[index];<%}%>
            },
            expand: (foreignKeys:string[], callback?: () => void) => {
                self.collectionService.subscribeForeignKeys(self.getCollection()["smallstackCollection"], cursor, foreignKeys, callback);
            }
        }
	}		
    
    public get<%= functions.capitalize(query.name) %>Count(parameters : {<%=evaluatedQuery.parameters%>}): number {
        return (<any>Counts).get("count-<%=query.name%>");
	}	
	<% }) %>

	<% 
	_.forEach(config.service.securedmethods, function(method){
        var params = [];
        if (method.modelAware === true) {
            params.push("modelId:string");
        }
        if (method.parameters)
            params = _.union(params, _.clone(method.parameters))
        %>
        
	public <%=method.name%>(<%=functions.convertMethodParametersToTypescriptMethodParameters(params, true)%>callback?: (error: Meteor.Error, result: <%=method.returns%>) => void): void {
        Meteor.call("<%=collectionName%>-<%=method.name%>", <%=functions.convertMethodParametersToObject(params)%>, callback);
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