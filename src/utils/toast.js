import { toast } from 'react-toastify';

export const notifySuccess = (message, options) => toast.success(message, options);
export const notifyError = (message, options) => toast.error(message, options);
export const notifyInfo = (message, options) => toast.info(message, options);
export const notifyWarning = (message, options) => toast.warning(message, options);

const notifications = { success: notifySuccess, error: notifyError, info: notifyInfo, warning: notifyWarning };

export const notify = (type, message, options) => (notifications[type] || notifyInfo)(message, options);

export default notify;
