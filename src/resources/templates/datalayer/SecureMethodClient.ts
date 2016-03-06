/// <reference path="<%=pathFromClientMethodToDefinitionsFile%>" />

/**
 * This method is getting executed on the client only, meaning it is simulation what could happen. See http://docs.meteor.com/#/full/meteor_methods
 */

Meteor.methods({
	"<%=methodName%>" : function(params: {<%=methodParameters%>}){
<%=methodParameterChecks%>
		
		throw new Meteor.Error("501", "This method is not implemented yet!");
        
        // Please either return a value of type <%=methodReturnType%> or thow a new Meteor.Error in this method!
	}
});