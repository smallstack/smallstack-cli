interface DataBridge {
    subscribe(name: string, parameters: any, options: any): { then: ((subscriptionHandle: any) => void) };
    getCountForQuery(queryName: string, parameters: any);
}