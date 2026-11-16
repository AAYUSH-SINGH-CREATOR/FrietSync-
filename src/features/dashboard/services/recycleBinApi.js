import axios from 'axios';
import { getAccessToken } from '../../auth/services/authApi';

const BASE_URL = import.meta.env.VITE_BASE_URL;
const config = () => {
  const token = getAccessToken();
  return { headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } };
};

export const normalizeDeletedItems = (data) => {
  const value = data?.data ?? data?.items ?? data?.content ?? data;
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.content)) return value.content;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.projects)) return value.projects;
  if (Array.isArray(value?.issues)) return value.issues;
  if (Array.isArray(value?.sprints)) return value.sprints;
  if (Array.isArray(value?.milestones)) return value.milestones;
  return [];
};

const get = async (path, params) => (await axios.get(`${BASE_URL}${path}`, { ...config(), ...(params ? { params } : {}) })).data;
// Use a request config without `data` so restore requests have no body.
const restore = async (path) => (await axios.request({ method: 'post', url: `${BASE_URL}${path}`, ...config() })).data;

export const getDeletedProjects = () => get('/projects/deleted');
export const getDeletedIssues = (projectId, page = 0, size = 20) => get(`/projects/${projectId}/issues/deleted`, { page, size });
export const getDeletedSprints = (projectId) => get(`/projects/${projectId}/sprints/deleted`);
export const getDeletedMilestones = (projectId) => get(`/projects/${projectId}/milestones/deleted`);

export const restoreDeletedProject = (projectId) => restore(`/projects/${projectId}/restore`);
export const restoreDeletedIssue = (issueId) => restore(`/issues/${issueId}/restore`);
export const restoreDeletedSprint = (sprintId) => restore(`/sprints/${sprintId}/restore`);
export const restoreDeletedMilestone = (milestoneId) => restore(`/milestones/${milestoneId}/restore`);
