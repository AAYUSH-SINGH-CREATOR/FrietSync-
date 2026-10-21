import axios from 'axios';
import { getFriendlyErrorMessage } from '../../../utils/errorHandler';
import { getSharedStompClient } from '../../chat/services/stompClient';

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

export const parseUnreadCount = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'object') {
    const candidate = value.unreadCount ?? value.count ?? value.total ?? value.data?.unreadCount ?? value.data?.count ?? value.data;
    if (typeof candidate === 'number' && Number.isFinite(candidate)) return candidate;
    if (typeof candidate === 'string') {
      const parsed = parseInt(candidate, 10);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

export const parseNotificationPage = (value) => {
  if (!value) return { items: [], last: true, total: 0 };
  if (Array.isArray(value)) {
    return { items: value, last: true, total: value.length };
  }
  const content = value.content || value.notifications || value.items || value.data?.content || value.data || [];
  const items = Array.isArray(content) ? content : [];
  const total = value.totalElements ?? value.total ?? items.length;
  const last = value.last ?? (value.totalPages !== undefined && value.number !== undefined ? value.number >= value.totalPages - 1 : true);
  return { items, last, total };
};

export const formatNotificationTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export const subscribeToNotifications = (callback) => {
  if (typeof callback !== 'function') return () => {};
  const client = getSharedStompClient();
  if (!client.connected && (!client.ws || client.ws.readyState > WebSocket.OPEN)) {
    client.connect();
  }
  return client.subscribe('/user/queue/notifications', callback);
};

export { getFriendlyErrorMessage };

