/// <reference path="<%=pathFromServerMethodToDefinitionsFile%>" />

/**
 * This method is getting executed on the server only. See http://docs.meteor.com/#/full/meteor_methods
 */

Meteor.methods({
	"<%=methodName%>" : function(params: {<%=methodParameters%>}){
<%=methodParameterChecks%>
		
		throw new Meteor.Error("501", "This method is not implemented yet!");
        
        // Please either return a value of type <%=returns%> or thow a new Meteor.Error in this method!
	}
});