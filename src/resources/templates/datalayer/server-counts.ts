/// <reference path="<%=pathFromServerMethodToDefinitionsFile%>" />

/**
 * THIS FILE IS AUTO-GENERATED AND WILL BE REPLACED ON ANY RE-GENERATION
 */


Meteor.methods({
    "server-counts": function(queryName: string, parameters:any) {
        Utils.check(queryName, String, "queryName");

        switch (queryName) {
            <%
            _.forEach(configuration, function(conf) {
                if (conf.config.service && conf.config.service.queries) {
                    _.forEach(conf.config.service.queries, function(query) {
                        var evaluatedQuery = functions.evaluateQuery(query, "this.userId");
                        %>case "<%=query.name%>":
                return smallstack.collections["<%=conf.config.collection.name%>"].find(<%=evaluatedQuery.parsedSelector%>).count();
                        
            <%
                    });
                }
            });           
            %>
        }
    }
});
