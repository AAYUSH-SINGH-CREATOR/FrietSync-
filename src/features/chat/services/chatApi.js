import axios from 'axios';
import { getUserProfile } from '../../auth/services/authApi';
import { getFriendlyErrorMessage } from '../../../utils/errorHandler';

const BASE_URL = import.meta.env.VITE_BASE_URL;

export const getAuthToken = () => {
  const rawToken =
    localStorage.getItem('frietSyncToken') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('token') ||
    '';
  return rawToken ? rawToken.replace(/^Bearer\s+/i, '').trim() : '';
};

const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
};

export const getCurrentChatUser = () => {
  let profile;
  try {
    profile = getUserProfile() || {};
  } catch {
    profile = {};
  }

  let storedUser;
  try {
    const raw = localStorage.getItem('frietSyncUser');
    storedUser = raw ? JSON.parse(raw) : {};
  } catch {
    storedUser = {};
  }

  let decoded;
  try {
    const token = getAuthToken();
    if (token) {
      const parts = token.split('.');
      if (parts.length >= 2) {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        decoded = JSON.parse(jsonPayload);
      } else {
        decoded = {};
      }
    } else {
      decoded = {};
    }
  } catch {
    decoded = {};
  }

  const userId =
    storedUser.userId ||
    storedUser.id ||
    decoded.userId ||
    decoded.id ||
    decoded.sub ||
    localStorage.getItem('frietSyncUserId') ||
    '';

  const email =
    storedUser.email ||
    decoded.email ||
    (typeof decoded.sub === 'string' && decoded.sub.includes('@') ? decoded.sub : '') ||
    localStorage.getItem('frietSyncEmail') ||
    localStorage.getItem('email') ||
    '';

  const name =
    profile.name ||
    storedUser.name ||
    decoded.name ||
    (email ? email.split('@')[0] : '') ||
    'You';

  const role =
    profile.role ||
    storedUser.role ||
    decoded.role ||
    localStorage.getItem('frietSyncRole') ||
    '';

  return { userId, email, name, role };
};

export const formatMessageTime = (dateStr) => {
  if (!dateStr) return 'Just now';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
    if (isToday) return `Today, ${timeStr}`;

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${timeStr}`;
    }

    return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
  } catch {
    return String(dateStr);
  }
};

export const getProjectChatMessages = async (projectId, limit = 50) => {
  if (!projectId) return [];
  try {
    const response = await axios.get(
      `${BASE_URL}/projects/${projectId}/chat/messages`,
      {
        params: { limit: Math.min(Math.max(limit, 1), 100) },
        ...getAuthHeaders(),
      }
    );

    const data = response.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.messages)) return data.messages;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.data?.messages)) return data.data.messages;

    return [];
  } catch (error) {
    console.error('Failed to load project chat messages:', error);
    const friendly = getFriendlyErrorMessage(error, 'chat');
    const err = new Error(friendly);
    err.raw = error;
    throw err;
  }
};

export { getFriendlyErrorMessage };

