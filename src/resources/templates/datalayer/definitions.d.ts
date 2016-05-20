// SMALLSTACK COMPONENTS

/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-core/typedefinitions/smallstack.d.ts" />

/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-analytics/AnalyticsService.ts" />
/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-collections/CollectionService.ts" />
/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-cookies/CookieService.ts" />
/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-ioc/ioc.ts" />
/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-navigation/types/models/NavigationEntry.ts" />
/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-navigation/types/services/NavigationService.ts" />
/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-media/types/services/MediaService.ts" />
/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-migration/MigrationService.ts" />
/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-notifications/NotificationService.ts" />
/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-roles/RolesService.ts" />
/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-location/services/GeocoderService.ts" />
/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-location/services/RoutingService.ts" />
/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-user/AvatarService.ts" />
/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-user/types/services/UserService.ts" />
/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-social/FacebookService.ts" />
/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-testdata/TestDataGenerator.ts" />



// SERVICES

<% 
_.forEach(_.keys(roots), function(root){
    _.forEach(roots[root].services, function(service){
%>/// <reference path="<%=functions.relativePath(pathToGeneratedDefinitions, root + "/services") + "/" + functions.capitalize(service)%>.ts" />
<% });}); %>


// COLLECTIONS

<% 
_.forEach(_.keys(roots), function(root){
    _.forEach(roots[root].collections, function(collection){
    %>/// <reference path="<%=functions.relativePath(pathToGeneratedDefinitions, root + "/collections") + "/" + functions.capitalize(collection)%>.ts" />
<% }); }); %>


// OTHERS

/// <reference path="<%=functions.relativePath(pathToGeneratedDefinitions, config.meteorDirectory + "/shared/versions.ts")%>" />
