import axios from 'axios';
import { getAccessToken } from '../../auth/services/authApi';
import { getFriendlyErrorMessage } from '../../../utils/errorHandler';

const BASE_URL = import.meta.env.VITE_BASE_URL;
etAuthHeaders = (params = {}) => {
  const token = getAccessToken();
  return {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(params && Object.keys(params).length > 0 ? { params } : {}),
  };
};

const handleIssueError = (error, defaultMessage) => {
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

export const normalizeIssueList = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.issues)) return data.issues;
  if (Array.isArray(data?.data?.issues)) return data.data.issues;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.issues)) return data.data.issues;
  if (Array.isArray(data?.content)) return data.content;
  return [];
};

/**
 * Safely extracts an issue detail object from various API response shapes.
 */
export const normalizeIssueDetails = (data) => {
  if (!data) return null;
  if (data.item && typeof data.item === 'object') return data.item;
  if (data.issue && typeof data.issue === 'object') return data.issue;
  if (data.data?.issue && typeof data.data.issue === 'object') return data.data.issue;
  if (data.data?.item && typeof data.data.item === 'object') return data.data.item;
  if (Array.isArray(data.items) && data.items.length > 0) return data.items[0];
  if (data.data && typeof data.data === 'object' && !Array.isArray(data.data)) return data.data;
  return data;
};

export const createIssue = async (projectId, issueData) => {
  if (!projectId) {
    throw new Error('Project ID is required to create an issue.');
  }

  try {
    const payload = {
      title: issueData.title?.trim(),
      description: issueData.description?.trim() || '',
      priority: (issueData.priority || 'HIGH').toUpperCase(),
      dueDate: issueData.dueDate || '',
      estimatedHours:
        issueData.estimatedHours !== undefined && issueData.estimatedHours !== ''
          ? Number(issueData.estimatedHours)
          : 0,
    };

    const response = await axios.post(
      `${BASE_URL}/projects/${projectId}/issues`,
      payload,
      getAuthHeaders({ projectId })
    );

    return normalizeIssueDetails(response.data) || response.data;
  } catch (error) {
    handleIssueError(error, 'Failed to create issue. Please check your input and try again.');
  }
};

export const getProjectIssues = async (projectId) => {
  if (!projectId) return [];

  try {
    const response = await axios.get(
      `${BASE_URL}/projects/${projectId}/issues`,
      getAuthHeaders({ projectId })
    );

    return normalizeIssueList(response.data);
  } catch (error) {
    handleIssueError(error, `Failed to fetch issues for project ${projectId}.`);
  }
};

export const getIssueDetails = async (issueId) => {
  if (!issueId) {
    throw new Error('Issue ID is required.');
  }

  try {
    const response = await axios.get(
      `${BASE_URL}/issues/${issueId}`,
      getAuthHeaders()
    );

    return normalizeIssueDetails(response.data);
  } catch (error) {
    handleIssueError(error, 'Failed to load issue details.');
  }
};

export { getFriendlyErrorMessage };

