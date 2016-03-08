<%_.forEach(services, function(service){%>
/// <reference path="services/<%=service%>.ts" />
<% }); %>



<%
_.forEach(services, function(service){%>
smallstack.ioc.register("<%=functions.lowerCaseFirst(service)%>", new <%=functions.capitalize(service)%>());
<% }); %>
