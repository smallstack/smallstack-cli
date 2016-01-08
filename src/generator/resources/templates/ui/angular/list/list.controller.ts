/// <reference path="<%=paths.pathToGeneratedDefinitionFile%>" />

smallstack.ioc.get<NavigationService>("navigationService").addNavigationEntry(NavigationEntry.create()
	.controller("<%=f.capitalize(type.collection.name)%>Controller")
	.route("/<%=type.collection.name.toLowerCase()%>")
	.index(1)
	.label("navigation.<%=type.collection.name%>")
	.requiresAuthentication(true)
	.templateUrl("<%=paths.workingDirectory%>/<%=type.collection.name.toLowerCase()%>/list/<%=type.collection.name.toLowerCase()%>.list.view.ng.html")
	.visible(true)
	.stateName("<%=type.collection.name%>")
);

interface <%=f.capitalize(type.collection.name)%>Scope extends ng.IScope {
	
}


class <%=f.capitalize(type.collection.name)%>Controller {

	static $inject = ["$scope", "<%=f.lowerCaseFirst(f.getServiceName(type))%>", "notificationService"];
	constructor(private $scope: <%=f.capitalize(type.collection.name)%>Scope, private <%=f.lowerCaseFirst(f.getServiceName(type))%>: <%=f.getServiceName(type)%>, private notificationService: NotificationService) {
		
	}
}

smallstack.angular.app.controller("<%=f.capitalize(type.collection.name)%>Controller", <%=f.capitalize(type.collection.name)%>Controller);
