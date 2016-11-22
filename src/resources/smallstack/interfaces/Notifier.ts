

export interface Notifier {
    info(message: string): void;
    success(message: string): void;
    debug(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    confirmation(message: string, callback: (answer: boolean) => void): void;
}
