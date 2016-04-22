/// <reference path="Notifier.ts" />



interface NotificationService {

	console: Notifier;
	popup: Notifier;
	notification: Notifier;
    
    showLoading(additionalText?:string);
    
    hideLoading();
}