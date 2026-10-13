import axios from 'axios';
import { getFriendlyErrorMessage } from '../../../utils/errorHandler';

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

export const getProjectById = async (projectId) => {
  if (!projectId) {
    throw new Error('Project ID is required.');
  }
  try {
    const response = await axios.get(
      `${BASE_URL}/projects/${projectId}`,
      getAuthHeaders()
    );
    const data = response.data;
    return data?.project || data?.data?.project || data?.data || data;
  } catch (error) {
    handleProjectError(error, 'Failed to load project details.');
  }
};

export const createProject = async (projectData) => {
  try {
    const payload = {
      name: projectData.name?.trim(),
      description: projectData.description?.trim() || '',
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

export const updateProject = async (projectId, projectData) => {
  if (!projectId) {
    throw new Error('Project ID is required.');
  }
  try {
    const payload = {
      name: projectData.name?.trim(),
      description: projectData.description !== undefined ? projectData.description.trim() : '',
      status: projectData.status || 'ACTIVE',
      startDate: projectData.startDate || '',
      deadline: projectData.deadline || '',
      projectManagerEmail: projectData.projectManagerEmail ? projectData.projectManagerEmail.trim() : '',
      teamLeadEmail: projectData.teamLeadEmail ? projectData.teamLeadEmail.trim() : '',
    };

    if (projectData.workspaceId) {
      payload.workspaceId = projectData.workspaceId;
    }

    const response = await axios.put(
      `${BASE_URL}/projects/${projectId}`,
      payload,
      getAuthHeaders()
    );
    return response.data?.project || response.data?.data || response.data;
  } catch (error) {
    handleProjectError(error, 'Failed to update project.');
  }
};

export const deleteProject = async (projectId) => {
  if (!projectId) {
    throw new Error('Project ID is required.');
  }
  try {
    const response = await axios.delete(
      `${BASE_URL}/projects/${projectId}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    handleProjectError(error, 'Failed to delete project.');
  }
};

export const getProjectMembers = async (projectId) => {
  if (!projectId) return [];
  try {
    const response = await axios.get(
      `${BASE_URL}/projects/${projectId}/members`,
      getAuthHeaders()
    );
    const data = response.data;

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.members)) return data.members;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.data?.members)) return data.data.members;

    return [];
  } catch (error) {
    handleProjectError(error, 'Failed to load project members.');
  }
};

export const addProjectMember = async (projectId, { email, role }) => {
  if (!projectId) {
    throw new Error('Project ID is required.');
  }
  try {
    const payload = {
      email: email?.trim(),
      role: role || 'CONTRIBUTOR',
    };

    const response = await axios.post(
      `${BASE_URL}/projects/${projectId}/members`,
      payload,
      getAuthHeaders()
    );
    return response.data?.member || response.data?.data || response.data;
  } catch (error) {
    handleProjectError(error, 'Failed to add project member.');
  }
};

export const removeProjectMember = async (projectId, memberUserId) => {
  if (!projectId) {
    throw new Error('Project ID is required.');
  }
  if (!memberUserId) {
    throw new Error('Member user ID is required.');
  }
  try {
    const response = await axios.delete(
      `${BASE_URL}/projects/${projectId}/members/${memberUserId}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    handleProjectError(error, 'Failed to remove project member.');
  }
};

export { getFriendlyErrorMessage };
