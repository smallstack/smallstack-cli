<%

var controllerName = "Create" + type.model.name + "Controller";
var serviceName = f.getServiceName(type);
var scopeName = "Create" + type.model.name + "Scope";

%>/// <reference path="<%=paths.pathToGeneratedDefinitionFile%>" />

smallstack.ioc.get<NavigationService>("navigationService").addNavigationEntry(NavigationEntry.create()
	.controller("<%=controllerName%>")
	.route("/<%=type.collection.name.toLowerCase()%>/new")	
	.index(9)
	.label("navigation.new<%=f.singularize(type.collection.name)%>")
	.requiresAuthentication(true)
	.templateUrl("<%=paths.workingDirectory%>/<%=type.collection.name.toLowerCase()%>/create/<%=f.singularize(type.collection.name.toLowerCase())%>.create.view.ng.html")
	.visible(true)
);

interface <%=scopeName%> extends ng.IScope {
	new<%=type.model.name%>: <%=type.model.name%>;
	vm: <%=controllerName%>;
}

class <%=controllerName%> {

	static $inject = ["$scope", "<%=f.lowerCaseFirst(serviceName)%>", "$location", "notificationService"];

	constructor(private $scope: <%=scopeName%>, private <%=f.lowerCaseFirst(serviceName)%>: <%=serviceName%>, private $location: ng.ILocationService, private notificationService: NotificationService) {
		$scope.vm = this;
		$scope.new<%=type.model.name%> = new <%=type.model.name%>();
		$scope.new<%=type.model.name%>.ownerId = Meteor.userId();
	}

	public create<%=type.model.name%>() {
		var self = this;
		self.<%=f.lowerCaseFirst(serviceName)%>.save<%=type.model.name%>(this.$scope.new<%=type.model.name%>, function(error: Meteor.Error, savedId: string) {
			if (error) self.notificationService.getStandardErrorPopup(error, "Could not create new <%=f.lowerCaseFirst(type.model.name)%>!");
			else {
				self.$location.path("/<%=f.singularize(type.collection.name).toLowerCase()%>/" + savedId);
				self.$scope.$apply();
			}
		});
	}
}
smallstack.angular.app.controller("<%=controllerName%>", <%=controllerName%>);