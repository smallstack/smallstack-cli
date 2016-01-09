/// <reference path="SmallstackCollection.ts" />

interface CollectionService {
    getCollectionByName(name: string): any;
    subscribeForeignKeys(baseCollection: SmallstackCollection<any>, cursor: Mongo.Cursor<any>, expands: string[], callback?: () => void);
}

