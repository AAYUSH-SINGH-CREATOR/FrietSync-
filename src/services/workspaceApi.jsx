import axios from 'axios';
import { getFriendlyErrorMessage } from '../utils/errorHandler';

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

const handleWorkspaceError = (error, defaultMessage) => {
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

export const createWorkspace = async ({ name }) => {
  try {
    const payload = {
      name: name?.trim(),
    };
    const response = await axios.post(
      `${BASE_URL}/workspaces`,
      payload,
      getAuthHeaders()
    );
    return response.data?.workspace || response.data?.data || response.data;
  } catch (error) {
    handleWorkspaceError(error, 'Failed to create workspace.');
  }
};

export const getMyWorkspace = async () => {
  try {
    const response = await axios.get(
      `${BASE_URL}/workspaces/me`,
      getAuthHeaders()
    );
    const data = response.data;
    return data?.workspace || data?.data || data || null;
  } catch (error) {
    if (error.response?.status === 404) {
      return null;
    }
    handleWorkspaceError(error, 'Failed to fetch current workspace.');
  }
};

export const updateWorkspace = async ({ name, workspaceId }) => {
  try {
    const payload = {
      name: name?.trim(),
    };
    const headers = getAuthHeaders();
    try {
      const response = await axios.patch(
        `${BASE_URL}/workspaces`,
        payload,
        headers
      );
      return response.data?.workspace || response.data?.data || response.data;
    } catch (err) {
      if (err.response?.status === 404 && workspaceId) {
        const response = await axios.patch(
          `${BASE_URL}/workspaces/${workspaceId}`,
          payload,
          headers
        );
        return response.data?.workspace || response.data?.data || response.data;
      }
      throw err;
    }
  } catch (error) {
    handleWorkspaceError(error, 'Failed to update workspace name.');
  }
};

export const leaveWorkspace = async () => {
  try {
    const headers = getAuthHeaders();
    try {
      const response = await axios.post(
        `${BASE_URL}/users/workspace/leave`,
        {},
        headers
      );
      return response.data;
    } catch (err) {
      if (err.response?.status === 405) {
        const response = await axios.delete(
          `${BASE_URL}/users/workspace/leave`,
          headers
        );
        return response.data;
      }
      throw err;
    }
  } catch (error) {
    handleWorkspaceError(error, 'Failed to leave workspace.');
  }
};

export { getFriendlyErrorMessage };

