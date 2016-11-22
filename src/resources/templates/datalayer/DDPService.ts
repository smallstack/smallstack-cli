/**
 * THIS FILE IS AUTO-GENERATED AND WILL BE REPLACED ON ANY CODE GENERATION
 */

var _ = require("underscore");

import { IOC } from "../../classes/IOC";
import { DataBridge } from "../../interfaces/DataBridge";
import { QueryOptions } from "../../interfaces/QueryOptions";
import { <%=modelClassName%> } from "../models/<%=modelClassName%>";

export class <%= serviceClassName %> {
	
    private dataBridge: DataBridge;
    
	constructor() {
      this.dataBridge = IOC.instance().get<DataBridge>("dataBridge");
	}
    
    static instance(): <%= serviceClassName %> {
        return new <%= serviceClassName %>();
    }
	
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
                 parsedSelector = parsedSelector.replace(/\"_currentLoggedInUser_\"/g," this.dataBridge.getCurrentUserId()");
			}
            
            // one or many?
            var sorting = query.sorting !== undefined ? JSON.stringify(query.sorting) : "{}";
            // old : var mongoQuery = "this.dataBridge.getCollectionByName(\"" + collectionName + "\").find(" + parsedSelector + ", selectorOptions)";
            var mongoQuery = "this.dataBridge.getCollectionByName(\"" + collectionName + "\")";
            // if (query.returnOne === true)
            //     mongoQuery = "smallstack.collections[\"" + collectionName + "\"].findOne(" + parsedSelector + ")";
            
	%>
	public <%=query.name%>(parameters: {<%=parameters%>}, options: QueryOptions, callback: (error:Error, models:<%=modelClassName%>[]) => void): void {
        var selectorOptions:any = {sort : <%=sorting%>};        
        if (options && options.currentPage && options.entriesPerPage) selectorOptions.skip = ((options.currentPage - 1) * options.entriesPerPage);
        if (options && options.entriesPerPage) selectorOptions.limit = options.entriesPerPage;
        
        this.dataBridge.notificationService.console.debug("Subscribing to : <%=query.name%>");
        this.dataBridge.subscribe("<%=query.name%>", parameters, selectorOptions, (error:Error, subscribed:boolean) => {
            if (subscribed) {
                this.dataBridge.notificationService.console.debug("Successfully subscribed!");
                var results = <%= mongoQuery %>;
                this.dataBridge.notificationService.console.debug("Query Result is : " + JSON.stringify(results, null, 2));
                var convertedObjects:<%=modelClassName%>[] = [];
                _.each(results, (result) => {
                    convertedObjects.push(<%=modelClassName%>.fromDocument(result));
                });
                this.dataBridge.notificationService.console.debug("Converted Result is : " + JSON.stringify(convertedObjects, null, 2));
                callback(undefined, convertedObjects);
            }
            else {
                console.error("Could not subscribe to collection!");
                callback(error, undefined);
            }       
        }); 
    }	
    
    public <%= query.name %>Count(parameters : {<%=parameters%>}, callback:(error: Error, count: number) => void): void {
        return this.dataBridge.getCountForQuery("<%=query.name%>", parameters, callback);
	}	
	<% }) 
    
	_.forEach(config.service.securedmethods, function(method){
        var params = [];
        if (method.modelAware === true) {
            params.push("modelId:string");
        }
        if (method.parameters)
            params = _.union(params, _.clone(method.parameters))
        %>
        
	public <%=method.name%>(<%=functions.convertMethodParametersToTypescriptMethodParameters(params, true)%>callback?: (error: Error, result: <%=method.returns%>) => void): void {
        this.dataBridge.call("<%=collectionName%>-<%=method.name%>", <%=functions.convertMethodParametersToObject(params)%>, callback);
	}					
	<%});%>
	
	// Model Operations
    public save<%=modelClassName%>(model:<%=modelClassName%>, callback: (error: Error, savedId:string) => void): void {
        return this.dataBridge.getCollectionByName("<%=collectionName%>").insert(model.toDocument(), callback);
	}

	public update<%=modelClassName%>(model:<%=modelClassName%>, callback: (error: Error, numberOfUpdatedDocuments:number) => void):void {
        return this.dataBridge.getCollectionByName("<%=collectionName%>").update(model.id, <%=functions.getMongoUpdateJson(others[collectionName].config.model.schema) %>, callback);
	}
	
	public delete<%=modelClassName%>(model:<%=modelClassName%>, callback: (error: Error, numberOfRemovedDocuments:number) => void):void {
		return this.dataBridge.getCollectionByName("<%=collectionName%>").remove(model.id, callback);
	}
}
