export declare class UpdateCheck {
    private static newVersion;
    private static url;
    private static currentPromise;
    static check(): Promise<boolean>;
}
