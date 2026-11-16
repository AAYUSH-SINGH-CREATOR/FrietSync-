import axios from 'axios';
import { getAccessToken } from '../../auth/services/authApi';

const BASE_URL = import.meta.env.VITE_BASE_URL;
const ganttUrl = (projectId, suffix = '') =>
  `${String(BASE_URL || '').replace(/\/+$/, '')}/projects/${encodeURIComponent(String(projectId))}/gantt${suffix}`;

const getAuthHeaders = () => {
  const token = getAccessToken();
  return {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
};

const handleGanttError = (error, defaultMessage) => {
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

export const getGanttData = async (projectId) => {
  if (!projectId) throw new Error('Project ID is required.');
  try {
    const response = await axios.get(ganttUrl(projectId), getAuthHeaders());
    return response.data?.data || response.data;
  } catch (error) {
    handleGanttError(error, 'Failed to load Gantt chart data.');
  }
};

export const getCriticalPath = async (projectId) => {
  if (!projectId) throw new Error('Project ID is required.');
  try {
    const response = await axios.get(ganttUrl(projectId, '/critical-path'), getAuthHeaders());
    return response.data?.data || response.data;
  } catch (error) {
    handleGanttError(error, 'Failed to load critical path.');
  }
};

export const captureBaseline = async (projectId) => {
  if (!projectId) throw new Error('Project ID is required.');
  try {
    const response = await axios.post(ganttUrl(projectId, '/baseline'), {}, getAuthHeaders());
    return response.data?.data || response.data;
  } catch (error) {
    handleGanttError(error, 'Failed to capture baseline.');
  }
};

export const deleteBaseline = async (projectId) => {
  if (!projectId) throw new Error('Project ID is required.');
  try {
    const response = await axios.delete(ganttUrl(projectId, '/baseline'), getAuthHeaders());
    return response.data?.data || response.data;
  } catch (error) {
    handleGanttError(error, 'Failed to delete baseline.');
  }
};

export const updateSprintGanttDates = async (projectId, sprintId, { startDate, endDate }) => {
  if (!projectId || !sprintId) throw new Error('Project ID and Sprint ID are required.');
  try {
    const response = await axios.patch(
      ganttUrl(projectId, `/sprints/${encodeURIComponent(String(sprintId))}`),
      { startDate, endDate },
      getAuthHeaders()
    );
    return response.data?.data || response.data;
  } catch (error) {
    handleGanttError(error, 'Failed to update sprint dates.');
  }
};

export const updateIssueGanttDates = async (projectId, issueId, { startDate, endDate }) => {
  if (!projectId || !issueId) throw new Error('Project ID and Issue ID are required.');
  try {
    const response = await axios.patch(
      ganttUrl(projectId, `/issues/${encodeURIComponent(String(issueId))}`),
      { startDate, endDate },
      getAuthHeaders()
    );
    return response.data?.data || response.data;
  } catch (error) {
    handleGanttError(error, 'Failed to update issue dates.');
  }
};
