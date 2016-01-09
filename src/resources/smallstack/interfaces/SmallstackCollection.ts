/// <reference path="../typedefinitions/meteor/meteor.d.ts" />

interface SmallstackCollection<T> {
    name: string;
    getForeignCollection: (type: string) => string;
    getForeignGetter: () => string;
    getMongoCollection(): Mongo.Collection<T>;
}