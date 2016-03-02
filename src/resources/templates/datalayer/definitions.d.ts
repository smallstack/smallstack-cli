// THIRD PARTY

/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-core/typedefinitions/meteor/meteor.d.ts" />



// SMALLSTACK COMPONENTS (manually included)

/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-core/typedefinitions/smallstack.d.ts" />

/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-analytics/AnalyticsService.ts" />
/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-collections/CollectionService.ts" />
/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-cookies/CookieService.ts" />
/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-ioc/ioc.ts" />
/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-navigation/NavigationEntry.ts" />
/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-navigation/NavigationService.ts" />
/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-media/types/services/MediaService.ts" />
/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-migration/MigrationService.ts" />
/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-notifications/NotificationService.ts" />
/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-roles/RolesService.ts" />
/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-location/LocationService.ts" />
/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-user/AvatarService.ts" />
/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-user/types/services/UserService.ts" />
/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-social/FacebookService.ts" />
/// <reference path="<%=relativePathFromDefToPackages%>/smallstack-testdata/TestDataGenerator.ts" />



// SERVICES

<% 
_.forEach(_.keys(roots), function(root){
    _.forEach(roots[root].services, function(service){
%>/// <reference path="<%=functions.relativePath(pathToGeneratedDefinitions, root + "/services") + "/" + _.capitalize(service)%>.ts" />
<% });}); %>


// COLLECTIONS

<% 
_.forEach(_.keys(roots), function(root){
    _.forEach(roots[root].collections, function(collection){
    %>/// <reference path="<%=functions.relativePath(pathToGeneratedDefinitions, root + "/collections") + "/" + _.capitalize(collection)%>.ts" />
<% }); }); %>


// OTHERS

/// <reference path="<%=functions.relativePath(pathToGeneratedDefinitions, config.meteorDirectory + "/shared/versions.ts")%>" />
