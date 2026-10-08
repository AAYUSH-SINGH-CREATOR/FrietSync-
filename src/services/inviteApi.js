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
    error.message = error.response.data?.message || defaultMessage;
  } else {
    error.status = 0;
    error.response = { status: 0, data: null };
    error.data = null;
    error.message = error.message || defaultMessage;
  }
  throw error;
};

export const sendInvite = async ({ email, role }) => {
  try {
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

