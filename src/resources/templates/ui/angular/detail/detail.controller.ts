/// <reference path="<%=paths.pathToGeneratedDefinitionFile%>" />
<%
var stateParam = f.lowerCaseFirst(type.model.name) + "Id";
var controllerName = type.model.name + "Controller";
var serviceName = f.getServiceName(type);

var expand = [];
_.forEach(type.model.schema, function(schema) {
	if (schema.collection !== undefined)
		expand.push(f.getModelPropertyName(schema));	
	
});
	
%>

smallstack.ioc.get<NavigationService>("navigationService").addNavigationEntry(NavigationEntry.create()
	.controller("<%=controllerName%>")
	.route("/<%=f.singularize(type.collection.name).toLowerCase()%>/:<%=stateParam%>")
	.requiresAuthentication(true)
	.templateUrl("<%=paths.workingDirectory%>/<%=type.collection.name.toLowerCase()%>/detail/<%=f.singularize(type.collection.name.toLowerCase())%>.detail.view.ng.html")
	.visible(false)
	.stateName("<%=f.singularize(type.collection.name)%>")
);

interface <%=f.capitalize(f.singularize(type.collection.name))%>Scope extends ng.IScope {
	<%=f.lowerCaseFirst(type.model.name)%>: <%=type.model.name%>;
	vm: <%=controllerName%>;
}


class <%=controllerName%> {

	static $inject = ["$scope", "<%=f.lowerCaseFirst(serviceName)%>", "notificationService", "$stateParams", "utils"];
	constructor(private $scope: <%=f.capitalize(f.singularize(type.collection.name))%>Scope, private <%=f.lowerCaseFirst(serviceName)%>: <%=serviceName%>, private notificationService: NotificationService, private $stateParams: ng.ui.IStateParamsService, private utils:Utils) {
		$scope.vm = this;
		
		if (!utils.isNonEmptyString($stateParams["<%=stateParam%>"])) {
			notificationService.popup.error("No <%=stateParam%> found in URL!");
		}
		else {
			this.load($stateParams["<%=stateParam%>"]);
		}
	}
	
	public load(id: string) {
		var self = this;
		var query:QueryObject<<%=type.model.name%>> = this.<%=f.lowerCaseFirst(serviceName)%>.get<%=type.model.name%>ById({ id: id });
		query.subscribe(self.$scope).then(function(subscriptionHandle:any){
			self.$scope.<%=f.lowerCaseFirst(type.model.name)%> = query.val(0);
		});
	}
}

smallstack.angular.app.controller("<%=controllerName%>", <%=controllerName%>);