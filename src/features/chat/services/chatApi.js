import axios from 'axios';
import { getAccessToken } from '../../auth/services/authApi';
import { getFriendlyErrorMessage } from '../../../utils/errorHandler';

const BASE_URL = import.meta.env.VITE_BASE_URL

const getAuthHeaders = () => {
  const token = getAccessToken();
  return {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
};


export const getCurrentChatUser = () => {
  const user = getCurrentUser();
  return {
    userId: user.userId,
    name: user.name || (user.email ? user.email.split('@')[0] : 'You'),
    email: user.email,
    role: user.role,
  };
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

