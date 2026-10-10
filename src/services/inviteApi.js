import { apiRequest, getAuthHeaders, getStoredToken } from './apiClient';
import { getFriendlyErrorMessage } from '../utils/errorHandler';

const inviteAuthHeaders = () => {
  const token = getStoredToken('frietSyncToken');
  return getAuthHeaders(token);
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
  void expiresAt;
  const response = await apiRequest('/admin/invites', {
    method: 'post',
    data: { email, role },
    ...inviteAuthHeaders(),
  }, 'Failed to send invitation. Please try again.', true);
  return response.data;
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
  const response = await apiRequest('/invites/me', {
    method: 'get',
    ...inviteAuthHeaders(),
  }, 'Failed to fetch invitations.', true);
  const data = response.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.invites)) return data.invites;
  if (Array.isArray(data?.data)) return data.data;
  return data || [];
};

export const getMyInvitesCount = async () => {
  const invites = await getMyInvites();
  return Array.isArray(invites) ? invites.length : null;
};

export const acceptInvite = async (inviteId) => {
  const response = await apiRequest('/invites/accept', {
    method: 'post',
    data: { inviteId, id: inviteId },
    ...inviteAuthHeaders(),
  }, 'Failed to accept invitation.', true);
  return response.data;
};

export const rejectInvite = async (inviteId) => {
  const response = await apiRequest('/invites/reject', {
    method: 'post',
    data: { inviteId, id: inviteId },
    ...inviteAuthHeaders(),
  }, 'Failed to reject invitation.', true);
  return response.data;
};

export { getFriendlyErrorMessage };

