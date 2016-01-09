
/// <reference path="<%= relativePathFromCollectionToGeneratedCollection %>" />

class <%= collectionClassName %> extends <%= generatedCollectionClassName %> {

	/**
	 * If you want to you can implement your own collection methods here. This file only gets generated once and will not get overwritten!
	 */

        constructor() {
                super();
        }
}

// delete the following line if you want to instanciate this collection somewhere else
new <%= collectionClassName %>();