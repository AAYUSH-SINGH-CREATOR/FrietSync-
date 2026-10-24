import axios from 'axios';
import { getAccessToken, getUserProfile } from '../../auth/services/authApi';
import { getFriendlyErrorMessage } from '../../../utils/errorHandler';

const BASE_URL = import.meta.env.VITE_BASE_URL;

export const getAuthToken = () => {
  return getAccessToken();
};

export const uploadChatAttachment = async (projectId, file) => {
  if (!projectId) throw new Error('Project ID is required to upload a chat attachment.');
  if (!file) throw new Error('Choose a file to upload.');

  const formData = new FormData();
  formData.append('file', file);
  const token = getAuthToken();

  try {
    const response = await axios.post(
      `${BASE_URL}/projects/${projectId}/chat/attachments`,
      formData,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    return response.data?.attachment || response.data?.data || response.data;
  } catch (error) {
    throw new Error(getFriendlyErrorMessage(error, 'chat') || 'Attachment upload failed.');
  }
};

export const downloadChatAttachment = async (projectId, attachment) => {
  if (!projectId || !attachment?.downloadUrl) {
    throw new Error('Chat attachment download information is missing.');
  }

  const apiOrigin = BASE_URL.replace(/\/api\/v1\/?$/, '');
  const downloadUrl = /^https?:\/\//i.test(attachment.downloadUrl)
    ? attachment.downloadUrl
    : `${apiOrigin}${attachment.downloadUrl.startsWith('/') ? '' : '/'}${attachment.downloadUrl}`;
  const token = getAuthToken();

  try {
    const response = await axios.get(downloadUrl, {
      responseType: 'blob',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return response.data;
  } catch (error) {
    throw new Error(getFriendlyErrorMessage(error, 'chat') || 'Attachment download failed.');
  }
};

export const getInitials = (name = '') => {
  const trimmed = name?.trim() || '';
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return trimmed.slice(0, 2).toUpperCase();
};

export const getAvatarColor = (name = '') => {
  const colors = [
    'bg-[#8A56E2]',
    'bg-[#3B6BDC]',
    'bg-[#C8523A]',
    'bg-[#D95295]',
    'bg-[#0EA5E9]',
    'bg-[#10B981]',
    'bg-[#F59E0B]',
    'bg-[#6366F1]',
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
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

export const getProjectChatMessages = async (projectId, page = 0, size = 50) => {
  if (!projectId) return [];
  try {
    const response = await axios.get(
      `${BASE_URL}/projects/${projectId}/chat/messages`,
      {
        params: { page: Math.max(0, page), size: Math.min(Math.max(size, 1), 100) },
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

export const formatFileSize = (bytes) => {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i] || 'B'}`;
};

export const getFileExtension = (filename = '') => {
  const parts = String(filename).split('.');
  return parts.length > 1 ? parts.pop().toUpperCase() : 'FILE';
};

export const parseAttachmentFromText = (text = '') => {
  if (!text) return { cleanText: '', attachment: null };
  const match = String(text).match(/\[ATTACHMENT:(\{.*?\})\]/s);
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      const cleanText = String(text).replace(match[0], '').trim();
      return { cleanText, attachment: parsed };
    } catch {
      // ignore
    }
  }
  return { cleanText: text, attachment: null };
};

const POLL_METADATA_PATTERN = /\s*\[FRIETSYNC_POLL:([^\]]+)\]/i;

export const getMessagePollId = (message) => {
  const metadata = message?.metadata || message?.data;
  const pollId = message?.pollId || message?.poll?.id || message?.poll?._id || message?.poll?.pollId ||
    metadata?.pollId || metadata?.poll?.id || metadata?.poll?._id || metadata?.poll?.pollId;
  if (pollId !== undefined && pollId !== null && String(pollId).trim()) return String(pollId).trim();
  const text = message?.text || message?.content || message?.message || '';
  return String(text).match(POLL_METADATA_PATTERN)?.[1]?.trim() || null;
};

export const stripPollMetadata = (text = '') => String(text).replace(POLL_METADATA_PATTERN, '').trim();

export const formatMessagePreview = (text) => {
  if (!text) return '';
  const { cleanText: parsedText, attachment } = parseAttachmentFromText(text);
  const cleanText = stripPollMetadata(parsedText);
  if (attachment) {
    const isImg = attachment.isImage || (attachment.type && attachment.type.startsWith('image/'));
    const prefix = isImg ? '📷 ' : '📎 ';
    const label = attachment.name || (isImg ? 'Photo' : 'Document');
    return cleanText ? `${cleanText} ${prefix}${label}` : `${prefix}${label}`;
  }
  return text;
};

export const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.75) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      resolve(null);
      return;
    }
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export { getFriendlyErrorMessage };


