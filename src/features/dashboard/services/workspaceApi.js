import axios from 'axios';
import { getFriendlyErrorMessage } from '../../../utils/errorHandler';

const BASE_URL = import.meta.env.VITE_BASE_URL;
const V2_BASE_URL = BASE_URL ? BASE_URL.replace(/\/api\/v1\/?$/, '/api/v2') : '';

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
    const workspace = response.data?.workspace || response.data?.data || response.data;
    const workspaceId = workspace?.id || workspace?._id || workspace?.workspaceId;
    if (workspaceId) localStorage.setItem('frietSyncWorkspaceId', workspaceId);
    return workspace;
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
    const workspace = data?.workspace || data?.data || data || null;
    if (workspace && (workspace.name || workspace.id || workspace._id || workspace.workspaceId)) {
      const workspaceId = workspace?.id || workspace?._id || workspace?.workspaceId;
      if (workspaceId) localStorage.setItem('frietSyncWorkspaceId', workspaceId);
      return workspace;
    }
    return null;
  } catch (error) {
    const status = error.response?.status;
    const msg = (error.response?.data?.message || error.response?.data?.error || error.message || '').toLowerCase();
    if (
      status === 404 ||
      status === 400 ||
      msg.includes('no workspace') ||
      msg.includes('workspace not found') ||
      msg.includes('not a member') ||
      msg.includes('not found')
    ) {
      return null;
    }
    handleWorkspaceError(error, 'Failed to fetch current workspace.');
  }
};

export const getWorkspaceById = async (workspaceId) => {
  if (!workspaceId) throw new Error('Workspace ID is required.');
  try {
    const response = await axios.get(`${BASE_URL}/workspaces/${workspaceId}`, getAuthHeaders());
    return response.data?.workspace || response.data?.data || response.data;
  } catch (error) { handleWorkspaceError(error, 'Failed to load workspace.'); }
};

export const getWorkspaceMembers = async (workspaceId) => {
  try {
    const id = workspaceId || localStorage.getItem('frietSyncWorkspaceId');
    const url = id ? `${BASE_URL}/workspaces/${id}/members` : `${V2_BASE_URL}/workspaces/me/members`;
    const response = await axios.get(url, getAuthHeaders());
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.members)) return data.members;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.data?.members)) return data.data.members;
    return [];
  } catch (error) { handleWorkspaceError(error, 'Failed to load workspace members.'); }
};

export const getActiveWorkspaceMembers = async () => {
  try {
    const response = await axios.get(`${V2_BASE_URL}/workspaces/me/members`, getAuthHeaders());
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.members)) return data.members;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.data?.members)) return data.data.members;
    return [];
  } catch (error) { handleWorkspaceError(error, 'Failed to load active workspace members.'); }
};

export const updateWorkspace = async ({ name, workspaceId }) => {
  try {
    const payload = {
      name: name?.trim(),
    };
    const id = workspaceId || localStorage.getItem('frietSyncWorkspaceId');
    if (!id) {
      return await renameWorkspaceMe({ name });
    }
    const response = await axios.patch(`${BASE_URL}/workspaces/${id}`, payload, getAuthHeaders());
    return response.data?.workspace || response.data?.data || response.data;
  } catch (error) {
    handleWorkspaceError(error, 'Failed to update workspace name.');
  }
};

export const renameWorkspaceMe = async ({ name }) => {
  try {
    const response = await axios.patch(`${V2_BASE_URL}/workspaces/me`, { name: name?.trim() }, getAuthHeaders());
    return response.data?.workspace || response.data?.data || response.data;
  } catch (error) {
    handleWorkspaceError(error, 'Failed to rename workspace.');
  }
};

export const deleteWorkspace = async (workspaceId) => {
  try {
    const id = workspaceId || localStorage.getItem('frietSyncWorkspaceId');
    const url = id ? `${BASE_URL}/workspaces/${id}` : `${V2_BASE_URL}/workspaces/me`;
    const response = await axios.delete(url, getAuthHeaders());
    return response.data?.workspace || response.data?.data || response.data;
  } catch (error) {
    handleWorkspaceError(error, 'Failed to delete workspace.');
  }
};

export const deleteWorkspaceMe = async () => {
  try {
    const response = await axios.delete(`${V2_BASE_URL}/workspaces/me`, getAuthHeaders());
    return response.data?.workspace || response.data?.data || response.data;
  } catch (error) {
    handleWorkspaceError(error, 'Failed to delete workspace.');
  }
};

export const restoreWorkspace = async (workspaceId) => {
  const id = workspaceId || localStorage.getItem('frietSyncWorkspaceId');
  if (!id) throw new Error('Workspace ID is required to restore workspace.');
  try {
    const response = await axios.post(`${BASE_URL}/workspaces/${id}/restore`, null, getAuthHeaders());
    return response.data?.workspace || response.data?.data || response.data;
  } catch (error) {
    handleWorkspaceError(error, 'Failed to restore workspace.');
  }
};

export const leaveWorkspace = async () => {
  try {
    const response = await axios.delete(`${BASE_URL}/users/workspace/leave`, getAuthHeaders());
    return response.data;
  } catch (error) {
    handleWorkspaceError(error, 'Failed to leave workspace.');
  }
};

export { getFriendlyErrorMessage };

