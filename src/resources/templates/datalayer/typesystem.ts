/// <reference path="./Typesystem.ts" />
/// <reference path="./Type.ts" />

/**
 * THIS FILE IS AUTO-GENERATED AND WILL BE REPLACED ON ANY RE-GENERATION
 */

(() => {
    var typesystem: SmallstackTypesystem = smallstack.ioc.get<SmallstackTypesystem>("typesystem");
    
    <% 
_.forEach(configuration, function(config){
    print('typesystem.addType(SmallstackType.fromDocument('+JSON.stringify(config.config)+'));\n\n\t');
}); %>

})();