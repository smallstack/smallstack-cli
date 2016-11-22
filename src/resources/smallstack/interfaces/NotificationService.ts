
import { Notifier } from "./Notifier";

export interface NotificationService {

	console: Notifier;
	popup: Notifier;
	notification: Notifier;
    
    showLoading(additionalText?:string);
    
    hideLoading();
}
