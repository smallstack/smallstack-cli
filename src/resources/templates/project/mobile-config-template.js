// This section sets up some basic app metadata,
// the entire section is optional.
App.info({
    id: '<%=f.urlToJavaPackage(deployment.url)%>',
    name: '<%=_.capitalize(projectName)%><% if (deployment.name !== "prod") print(" " + _.capitalize(deployment.name))%>',
    description: '<%=_.capitalize(projectName)%>',
    website: '<%=deployment.url%>'
});

// Set PhoneGap/Cordova preferences
App.setPreference('BackgroundColor', '0x000000ff');
App.setPreference('HideKeyboardFormAccessoryBar', "true");

App.accessRule('*');