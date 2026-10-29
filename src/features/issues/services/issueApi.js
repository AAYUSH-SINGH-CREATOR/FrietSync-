import axios from 'axios';
import { getAccessToken } from '../../auth/services/authApi';
import { getFriendlyErrorMessage } from '../../../utils/errorHandler';

const BASE_URL = import.meta.env.VITE_BASE_URL;
const V2_BASE_URL =
  BASE_URL && BASE_URL.includes('/api/v1')
    ? BASE_URL.replace(/\/api\/v1\/?$/, '/api/v2')
    : 'https://frietsync.live/api/v2';

const getAuthHeaders = (params = {}) => {
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

export const normalizeIssuePage = (data, fallback = {}) => {
  const body = data?.data && !Array.isArray(data.data) ? data.data : data;
  const items = normalizeIssueList(body);
  const page = Number(body?.number ?? body?.page ?? fallback.page ?? 0);
  const size = Number(body?.size ?? body?.pageSize ?? fallback.size ?? items.length);
  const totalElements = Number(body?.totalElements ?? body?.totalCount ?? body?.total ?? items.length);
  const totalPages = Number(body?.totalPages ?? (size > 0 ? Math.ceil(totalElements / size) : 1));
  return { items, page, size, totalElements, totalPages, first: body?.first ?? page === 0, last: body?.last ?? page + 1 >= totalPages };
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
      githubAction: issueData.githubAction || 'LOCAL',
    };

    if (
      payload.githubAction === 'LINK_EXISTING' &&
      issueData.githubIssueNumber !== undefined &&
      issueData.githubIssueNumber !== ''
    ) {
      payload.githubIssueNumber = Number(issueData.githubIssueNumber);
    }

    if (issueData.dueDate) {
      payload.dueDate = issueData.dueDate;
    }

    if (issueData.estimatedHours !== undefined && issueData.estimatedHours !== '') {
      payload.estimatedHours = Number(issueData.estimatedHours);
    }

    if (issueData.assigneeId) {
      payload.assigneeId = issueData.assigneeId;
    }

    const response = await axios.post(
      `${V2_BASE_URL}/projects/${projectId}/issues`,
      payload,
      getAuthHeaders()
    );

    return normalizeIssueDetails(response.data) || response.data;
  } catch (error) {
    handleIssueError(error, 'Failed to create issue. Please check your input and try again.');
  }
};

export const getProjectIssues = async (projectId, { page = 0, size = 20 } = {}) => {
  if (!projectId) return normalizeIssuePage(null, { page, size });

  try {
    const response = await axios.get(
      `${BASE_URL}/projects/${projectId}/issues`,
      getAuthHeaders({ page, size })
    );

    return normalizeIssuePage(response.data, { page, size });
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

const issueRequest = async (method, path, payload, config = {}, fallback = 'Issue request failed.') => {
  try {
    const response = await axios({ method, url: `${BASE_URL}${path}`, data: payload, ...getAuthHeaders(), ...config });
    return response.data === undefined ? null : response.data;
  } catch (error) {
    handleIssueError(error, fallback);
  }
};

export const updateIssue = (id, fields) => issueRequest('patch', `/issues/${id}`, fields, {}, 'Failed to update issue.');
export const updateIssueStatus = (id, status) => issueRequest('patch', `/issues/${id}/status`, { status }, {}, 'Failed to update issue status.');
export const deleteIssue = (id) => issueRequest('delete', `/issues/${id}`, undefined, {}, 'Failed to delete issue.');
export const assignIssue = (id, userIds) => issueRequest('post', `/issues/${id}/assign`, { userIds }, {}, 'Failed to assign issue.');
export const resolveIssue = (id) => issueRequest('post', `/issues/${id}/resolve`, {}, {}, 'Failed to resolve issue.');
export const reviewIssue = (id, decision, comment = '') => issueRequest('post', `/issues/${id}/review/${decision}`, comment.trim() ? { comment: comment.trim() } : {}, {}, `Failed to ${decision} issue review.`);
export const getIssueHistory = (id, { page = 0, size = 20 } = {}) => issueRequest('get', `/issues/${id}/history`, undefined, { params: { page, size } }, 'Failed to load issue history.');
export const getIssueLabels = (id) => issueRequest('get', `/issues/${id}/labels`, undefined, {}, 'Failed to load issue labels.');
export const attachIssueLabel = (id, name) => issueRequest('post', `/issues/${id}/labels`, { name }, {}, 'Failed to add label.');
export const removeIssueLabel = (id, labelId) => issueRequest('delete', `/issues/${id}/labels/${labelId}`, undefined, {}, 'Failed to remove label.');
export const getIssueLinks = (id) => issueRequest('get', `/issues/${id}/links`, undefined, {}, 'Failed to load issue links.');
export const createIssueLink = (id, targetIssueId) => issueRequest('post', `/issues/${id}/links`, { targetIssueId }, {}, 'Failed to create issue link.');
export const deleteIssueLink = (linkId) => issueRequest('delete', `/issue-links/${linkId}`, undefined, {}, 'Failed to remove issue link.');
export const getIssueDependencies = (id) => issueRequest('get', `/issues/${id}/dependencies`, undefined, {}, 'Failed to load issue dependencies.');
export const getIssueImpact = (id) => issueRequest('get', `/issues/${id}/impact`, undefined, {}, 'Failed to load issue impact.');
export const getProjectDependencyGraph = (id) => issueRequest('get', `/projects/${id}/dependency-graph`, undefined, {}, 'Failed to load dependency graph.');
export const getIssueAttachments = (id) => issueRequest('get', `/issues/${id}/attachments`, undefined, {}, 'Failed to load attachments.');
export const uploadIssueAttachment = async (id, file) => {
  const form = new FormData();
  form.append('file', file);
  try {
    const token = getAccessToken();
    const response = await axios.post(`${BASE_URL}/issues/${id}/attachments`, form, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    return response.data;
  } catch (error) { handleIssueError(error, 'Failed to upload attachment.'); }
};
export const downloadIssueAttachment = async (id) => {
  try {
    const response = await axios.get(`${BASE_URL}/attachments/${id}/download`, { ...getAuthHeaders(), responseType: 'blob' });
    return response.data;
  } catch (error) { handleIssueError(error, 'Failed to download attachment.'); }
};
export const deleteIssueAttachment = (id) => issueRequest('delete', `/attachments/${id}`, undefined, {}, 'Failed to delete attachment.');
export const requestIssueAssignment = (id, message = '') => issueRequest('post', `/issues/${id}/request`, message.trim() ? { message: message.trim() } : {}, {}, 'Failed to request issue assignment.');
export const getMyIssueAssignmentRequest = (id) => issueRequest('get', `/issues/${id}/request`, undefined, {}, 'Failed to load assignment request.');
export const cancelIssueAssignmentRequest = (id) => issueRequest('delete', `/issues/${id}/request`, undefined, {}, 'Failed to cancel assignment request.');
export const getProjectIssueRequests = (id, status) => issueRequest('get', `/projects/${id}/issue-requests`, undefined, { params: status ? { status } : {} }, 'Failed to load assignment requests.');
export const createProjectIssueRequest = (id, payload) => issueRequest('post', `/issues/${id}/issue-requests`, payload, {}, 'Failed to create assignment request.');
export const manageProjectIssueRequest = (issueId, requestId, approve) => issueRequest('post', `/issues/${issueId}/issue-requests`, { requestId, approve }, {}, 'Failed to update assignment request.');
export const deleteProjectIssueRequest = (projectId, requestId) => issueRequest('delete', `/projects/${projectId}/issue-requests`, undefined, { params: { requestId } }, 'Failed to remove assignment request.');

export const getIssueComments = (issueId) => {
  if (!issueId) throw new Error('Issue ID is required.');
  return issueRequest('get', `/issues/${issueId}/comments`, undefined, {}, 'Failed to load issue comments.');
};
export const createIssueComment = (issueId, content) => {
  if (!issueId) throw new Error('Issue ID is required.');
  return issueRequest('post', `/issues/${issueId}/comments`, { content }, {}, 'Failed to add comment.');
};
export const updateIssueComment = (issueId, commentId, content) => {
  if (!issueId) throw new Error('Issue ID is required.');
  if (!commentId) throw new Error('Comment ID is required.');
  return issueRequest('patch', `/issues/${issueId}/comments/${commentId}`, { content }, {}, 'Failed to update comment.');
};
export const deleteIssueComment = (issueId, commentId) => {
  if (!issueId) throw new Error('Issue ID is required.');
  if (!commentId) throw new Error('Comment ID is required.');
  return issueRequest('delete', `/issues/${issueId}/comments/${commentId}`, undefined, {}, 'Failed to delete comment.');
};

export { getFriendlyErrorMessage };

