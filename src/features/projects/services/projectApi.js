import axios from 'axios';
import { getFriendlyErrorMessage } from '../utils/errorHandler';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const getAuthHeaders = () => {
  const rawToken =
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

export const getMyProjects = async () => {
  try {
    const response = await axios.get(
      `${BASE_URL}/projects/me`,
      getAuthHeaders()
    );
    const data = response.data;

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.projects)) return data.projects;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.data?.projects)) return data.data.projects;

    return data || [];
  } catch (error) {
    handleProjectError(error, 'Failed to load projects.');
  }
};

const handleProjectError = (error, defaultMessage) => {
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

export const getStoredWorkspaceId = () => {
  return (
    localStorage.getItem('frietSyncWorkspaceId') ||
    localStorage.getItem('workspaceId') ||
    localStorage.getItem('currentWorkspaceId') ||
    'c56a4180-65aa-42ec-a945-5fd21dec0538'
  );
};

export const createProject = async (projectData) => {
  try {
    const payload = {
      name: projectData.name?.trim(),
      description: projectData.description?.trim() || '',
      workspaceId: projectData.workspaceId?.trim() || getStoredWorkspaceId(),
      status: projectData.status || 'ACTIVE',
      startDate: projectData.startDate || new Date().toISOString().slice(0, 10),
      deadline: projectData.deadline || '',
      projectManagerEmail: projectData.projectManagerEmail?.trim() || '',
      teamLeadEmail: projectData.teamLeadEmail?.trim() || '',
    };

    const response = await axios.post(
      `${BASE_URL}/projects`,
      payload,
      getAuthHeaders()
    );
    const created = response.data?.project || response.data?.data || response.data;
    if (created?.workspaceId) {
      localStorage.setItem('frietSyncWorkspaceId', created.workspaceId);
    }

    return response.data;
  } catch (error) {
    handleProjectError(error, 'Failed to create project. Please try again.');
  }
};

export { getFriendlyErrorMessage };

