/// <reference path="<%=pathFromSharedMethodToDefinitionsFile%>" />

/**
 * This method is getting executed on the server as well as on the client. On the client the simulation happens only. See http://docs.meteor.com/#/full/meteor_methods
 */

Meteor.methods({
	"<%=methodName%>" : function(params: {<%=methodParameters%>}){
<%=methodParameterChecks%>
		
		throw new Meteor.Error("501", "This method is not implemented yet!");
        
        // Please either return a value of type <%=methodReturnType%> or thow a new Meteor.Error in this method!
	}
});