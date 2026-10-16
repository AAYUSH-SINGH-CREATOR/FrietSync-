import axios from 'axios';
import { getFriendlyErrorMessage } from '../../../utils/errorHandler';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const getAuthHeaders = () => {
  const rawToken =
    localStorage.getItem('frietSyncToken') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('token') ||
    '';
  const token = rawToken.replace(/^Bearer\s+/i, '').trim();

  return {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
};

const handleApiError = (error, defaultMessage) => {
  if (error.response) {
    error.status = error.response.status;
    error.data = error.response.data;
    const serverMsg =
      error.response.data?.message ||
      error.response.data?.error ||
      error.response.data?.msg ||
      (typeof error.response.data === 'string' ? error.response.data : null);
    error.message = serverMsg || defaultMessage;
  } else {
    error.status = 0;
    error.response = { status: 0, data: null };
    error.data = null;
    error.message = error.message || defaultMessage;
  }
  throw error;
};

export const getNotificationPreferences = async () => {
  try {
    const response = await axios.get(
      `${BASE_URL}/notifications/preferences`,
      getAuthHeaders()
    );
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.preferences)) return data.preferences;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  } catch (error) {
    handleApiError(error, 'Failed to load notification preferences.');
  }
};

export const updateNotificationPreferences = async (preferencesList) => {
  try {
    const payload = Array.isArray(preferencesList)
      ? { preferences: preferencesList }
      : preferencesList?.preferences
      ? preferencesList
      : { preferences: [] };

    const response = await axios.put(
      `${BASE_URL}/notifications/preferences`,
      payload,
      getAuthHeaders()
    );
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.preferences)) return data.preferences;
    if (Array.isArray(data?.data)) return data.data;
    return data || [];
  } catch (error) {
    handleApiError(error, 'Failed to update notification preferences.');
  }
};

export const getUnreadNotificationCount = async () => {
  try {
    const response = await axios.get(
      `${BASE_URL}/notifications/unread-count`,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to fetch unread notification count.');
  }
};

export const getNotifications = async ({ unread = false, page = 0, size = 20 } = {}) => {
  try {
    const response = await axios.get(`${BASE_URL}/notifications`, {
      params: { unread, page, size },
      ...getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to load notifications.');
  }
};

export const markNotificationRead = async (id) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/notifications/${id}/read`,
      {},
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to mark notification as read.');
  }
};

export const markAllNotificationsRead = async () => {
  try {
    const response = await axios.post(
      `${BASE_URL}/notifications/read-all`,
      {},
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    handleApiError(error, 'Failed to mark all notifications as read.');
  }
};

export { getFriendlyErrorMessage };

