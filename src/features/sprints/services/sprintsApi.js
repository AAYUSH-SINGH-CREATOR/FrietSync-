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

export { getFriendlyErrorMessage };