
interface DataBridge {
    // collections
    subscribe(name: string, parameters: any, options: any, callback: (error: Error, subscribed: boolean) => void): void;
    getCountForQuery(queryName: string, parameters: any, callback: (error: Error, count: number) => void): void;
    getCollectionByName(name: string): any;
    
    // methods
    call(methodName: string, parameters: string[], callback: (error: Error, response: any) => void): void;

    // user related
    getCurrentUserId(): string;
    loginWithPassword(username: string, password: string, callbackFn: (error: Error, success?: boolean) => void): void;
    registerWithPassword(email: string, password: string, callbackFn: (error: Error, success?: boolean) => void): void;
    
    // baseUrl
    setBaseUrl(url: string): void;
    getAbsoluteUrl(path: string): string;
}