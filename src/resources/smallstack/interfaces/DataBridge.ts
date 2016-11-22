
import { NotificationService } from "./NotificationService";

export interface DataBridge {
    // connection related
    onConnectionReady(fn: () => void);

    // collections
    subscribe(name: string, parameters: any, options: any, callback: (error: Error, subscribed: boolean) => void): void;
    getCountForQuery(queryName: string, parameters: any, callback: (error: Error, count: number) => void): void;
    getCollectionByName(name: string): any;
    search(collectionName: string, queryString: string, callback: (error: Error, models: any[]) => void): void;

    // methods
    call(methodName: string, parameters: any, callback: (error: Error, response: any) => void): void;

    // user related
    getCurrentUserId(): string;
    loginWithPassword(username: string, password: string, callbackFn: (error: Error, success?: boolean) => void): void;
    loginWithFacebook(callbackFn: (error: Error, success?: boolean) => void): void;
    loginWithGoogle(callbackFn: (error: Error, success?: boolean) => void): void;
    loginWithTwitter(callbackFn: (error: Error, success?: boolean) => void): void;
    registerWithPassword(email: string, password: string, callbackFn: (error: Error, success?: boolean) => void): void;
    afterLogin(callbackFn: () => void): void;
    logout(callbackFn: (error: Error, success?: boolean) => void): void;
    getAvatarUrlForUser(user: any, mediaFormatName: string): string;

    // baseUrl
    setBaseUrl(url: string): void;
    getAbsoluteUrl(path: string): string;

    // AWS S3 / Media related
    getMediaUrl(mediaId: string, mediaFormatName: string);
    setS3BucketName(s3BucketName: string): void;
    setS3Region(s3Region: string): void;

    // other stuff
    notificationService: NotificationService;
}
