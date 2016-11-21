/// <reference path="typings/index.d.ts" />




<% 
_.forEach(_.keys(roots), function(root){
    _.forEach(roots[root].services, function(service){
%>/// <reference path="ddp-connector/services/<%=functions.capitalize(service)%>.ts" />
<% });}); %>

<% 
_.forEach(_.keys(roots), function(root){
    _.forEach(roots[root].models, function(model){
%>/// <reference path="ddp-connector/models/<%=functions.capitalize(model)%>.ts" />
<% });}); %>
