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

const request = async (call, message) => {
  try {
    const response = await call();
    return response.status === 204 ? null : response.data;
  } catch (error) {
    if (error.response) {
      error.status = error.response.status;
      error.data = error.response.data;
      error.message =
        error.response.data?.message ||
        error.response.data?.error ||
        error.response.data?.msg ||
        (typeof error.response.data === 'string' ? error.response.data : message);
    } else {
      error.status = 0;
      error.response = { status: 0, data: null };
      error.data = null;
      error.message = error.message || message;
    }
    throw error;
  }
};

export const getProjectSprints = (projectId) => {
  if (!projectId) throw new Error('Project ID is required.');
  return request(
    () => axios.get(`${BASE_URL}/projects/${projectId}/sprints`, getAuthHeaders()),
    'Failed to load project sprints.'
  );
};

export const getSprintById = (sprintId) => {
  if (!sprintId) throw new Error('Sprint ID is required.');
  return request(
    () => axios.get(`${BASE_URL}/sprints/${sprintId}`, getAuthHeaders()),
    'Failed to load sprint details.'
  );
};

export const createSprint = (projectId, sprintData) => {
  if (!projectId) throw new Error('Project ID is required.');
  return request(
    () => axios.post(`${BASE_URL}/projects/${projectId}/sprints`, sprintData, getAuthHeaders()),
    'Failed to create sprint.'
  );
};

export const updateSprint = (sprintId, sprintData) => {
  if (!sprintId) throw new Error('Sprint ID is required.');
  return request(
    () => axios.patch(`${BASE_URL}/sprints/${sprintId}`, sprintData, getAuthHeaders()),
    'Failed to update sprint.'
  );
};

export const updateSprintStatus = (sprintId, status) => {
  if (!sprintId) throw new Error('Sprint ID is required.');
  return request(
    () => axios.patch(`${BASE_URL}/sprints/${sprintId}/status`, { status }, getAuthHeaders()),
    'Failed to update sprint status.'
  );
};

export const startSprint = (sprintId) => {
  if (!sprintId) throw new Error('Sprint ID is required.');
  return request(
    () => axios.post(`${BASE_URL}/sprints/${sprintId}/start`, null, getAuthHeaders()),
    'Failed to start sprint.'
  );
};

export const completeSprint = (sprintId) => {
  if (!sprintId) throw new Error('Sprint ID is required.');
  return request(
    () => axios.post(`${BASE_URL}/sprints/${sprintId}/complete`, null, getAuthHeaders()),
    'Failed to complete sprint.'
  );
};

export const deleteSprint = (sprintId) => {
  if (!sprintId) throw new Error('Sprint ID is required.');
  return request(
    () => axios.delete(`${BASE_URL}/sprints/${sprintId}`, getAuthHeaders()),
    'Failed to delete sprint.'
  );
};

export const getSprintIssues = (sprintId) => {
  if (!sprintId) throw new Error('Sprint ID is required.');
  return request(
    () => axios.get(`${BASE_URL}/sprints/${sprintId}/issues`, getAuthHeaders()),
    'Failed to load sprint issues.'
  );
};

export const getSprintMilestones = (sprintId) => {
  if (!sprintId) throw new Error('Sprint ID is required.');
  return request(
    () => axios.get(`${BASE_URL}/sprints/${sprintId}/milestones`, getAuthHeaders()),
    'Failed to load sprint milestones.'
  );
};

export const assignSprint = (sprintId, contributorId) => {
  if (!sprintId) throw new Error('Sprint ID is required.');
  return request(
    () => axios.post(`${BASE_URL}/sprints/${sprintId}/assign`, { contributorId }, getAuthHeaders()),
    'Failed to assign sprint contributor.'
  );
};

export const requestSprintAssignment = (sprintId) => {
  if (!sprintId) throw new Error('Sprint ID is required.');
  return request(
    () => axios.post(`${BASE_URL}/sprints/${sprintId}/request`, null, getAuthHeaders()),
    'Failed to request sprint assignment.'
  );
};

export const getProjectSprintRequests = (projectId) => {
  if (!projectId) throw new Error('Project ID is required.');
  return request(
    () => axios.get(`${BASE_URL}/projects/${projectId}/sprints-requests`, getAuthHeaders()),
    'Failed to load sprint assignment requests.'
  );
};

export const approveSprintRequest = (sprintId, requestId) => {
  if (!sprintId) throw new Error('Sprint ID is required.');
  return request(
    () => axios.post(`${BASE_URL}/sprints/${sprintId}/sprints-requests`, { requestId }, getAuthHeaders()),
    'Failed to approve sprint assignment request.'
  );
};

export const getSprintComments = (sprintId) => {
  if (!sprintId) throw new Error('Sprint ID is required.');
  return request(
    () => axios.get(`${BASE_URL}/sprints/${sprintId}/comments`, getAuthHeaders()),
    'Failed to load sprint comments.'
  );
};

export const createSprintComment = (sprintId, content) => {
  if (!sprintId) throw new Error('Sprint ID is required.');
  return request(
    () => axios.post(`${BASE_URL}/sprints/${sprintId}/comments`, { content }, getAuthHeaders()),
    'Failed to create sprint comment.'
  );
};

export const updateSprintComment = (sprintId, commentId, content) => {
  if (!sprintId) throw new Error('Sprint ID is required.');
  if (!commentId) throw new Error('Comment ID is required.');
  return request(
    () => axios.patch(`${BASE_URL}/sprints/${sprintId}/comments/${commentId}`, { content }, getAuthHeaders()),
    'Failed to update sprint comment.'
  );
};

export const deleteSprintComment = (sprintId, commentId) => {
  if (!sprintId) throw new Error('Sprint ID is required.');
  if (!commentId) throw new Error('Comment ID is required.');
  return request(
    () => axios.delete(`${BASE_URL}/sprints/${sprintId}/comments/${commentId}`, getAuthHeaders()),
    'Failed to delete sprint comment.'
  );
};

export { getFriendlyErrorMessage };
