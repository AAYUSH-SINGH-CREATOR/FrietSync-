import axios from 'axios';
import { getFriendlyErrorMessage } from '../utils/errorHandler';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem('frietSyncToken');
  return {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
};

const handleInviteError = (error, defaultMessage) => {
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

export const formatExpiryToUtc = (dateStr) => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 7);
    return `${d.toISOString().slice(0, 10)}T00:00:00Z`;
  }
  return `${dateStr}T00:00:00Z`;
};


export const sendInvite = async ({ email, role, expiresAt }) => {
  try {
    const payload = {
      email,
      role,
      // purpose: purpose || 'WORKSPACE_INVITE',
      ...(expiresAt ? { expiresAt } : {}),
    };
    const response = await axios.post(
      `${BASE_URL}/admin/invites`,
      { email, role },
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    handleInviteError(error, 'Failed to send invitation. Please try again.');
  }
};

export const sendSequentialInvites = async (invitesList, onProgress) => {
  const successful = [];
  let failed = null;

  for (let i = 0; i < invitesList.length; i++) {
    const item = invitesList[i];
    if (onProgress) {
      onProgress({ current: i + 1, total: invitesList.length, email: item.email });
    }

    try {
      const data = await sendInvite({
        email: item.email.trim(),
        role: item.role,
        purpose: item.purpose || 'WORKSPACE_INVITE',
        expiresAt: formatExpiryToUtc(item.expiresDate || item.expiresAt),
      });
      successful.push({ item, data });
    } catch (error) {
      failed = {
        item,
        error: error.message || 'Failed to send invitation',
        rawError: error,
      };
      break;
    }
  }

  return { successful, failed };
};

export const getMyInvites = async () => {
  try {
    const response = await axios.get(
      `${BASE_URL}/invites/me`,
      getAuthHeaders()
    );
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.invites)) return data.invites;
    if (Array.isArray(data?.data)) return data.data;
    return data || [];
  } catch (error) {
    handleInviteError(error, 'Failed to fetch invitations.');
  }
};

export const acceptInvite = async (inviteId) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/invites/accept`,
      { inviteId, id: inviteId },
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    handleInviteError(error, 'Failed to accept invitation.');
  }
};

export const rejectInvite = async (inviteId) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/invites/reject`,
      { inviteId, id: inviteId },
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    handleInviteError(error, 'Failed to reject invitation.');
  }
};

export { getFriendlyErrorMessage };

