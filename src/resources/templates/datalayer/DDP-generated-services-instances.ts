import { IOC } from "../classes/IOC";
<%
var services = [];
_.each(_.keys(roots), function (root) {
    _.forEach(roots[root].services, function(service){
        services.push(service);
    });
})

_.forEach(services, function(service){%>
import { <%=service%> } from "../ddp-connector/services/<%=service%>";<% }); %>

export class DDPServiceRegistrations {
    constructor() {<%
_.forEach(services, function(service){%>
        IOC.instance().register("<%=functions.lowerCaseFirst(service)%>", new <%=functions.capitalize(service)%>());<% }); %>
    }
}
