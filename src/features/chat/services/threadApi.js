import axios from 'axios';
import { getAccessToken } from '../../auth/services/authApi';

const BASE_URL = import.meta.env.VITE_BASE_URL;
const config = () => {
  const token = getAccessToken();
  return { headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } };
};
const unwrap = (data) => data?.thread || data?.data?.thread || data?.data || data;

export const getProjectThreads = async (projectId, page = 0, size = 10) => {
  const { data } = await axios.get(`${BASE_URL}/projects/${projectId}/threads`, { ...config(), params: { page, size } });
  const result = unwrap(data);
  return Array.isArray(result) ? { items: result, totalPages: 1 } : {
    items: Array.isArray(result?.content) ? result.content : [],
    totalPages: Number(result?.totalPages) || 0,
  };
};
export const createProjectThread = async (projectId, payload) => {
  const { data } = await axios.post(`${BASE_URL}/projects/${projectId}/threads`, payload, config());
  return unwrap(data);
};
export const getProjectThread = async (projectId, threadId) => {
  const { data } = await axios.get(`${BASE_URL}/projects/${projectId}/threads/${threadId}`, config());
  return unwrap(data);
};
export const upvoteProjectThread = async (projectId, threadId) => {
  const { data } = await axios.post(`${BASE_URL}/projects/${projectId}/threads/${threadId}/upvote`, {}, config());
  return unwrap(data);
};
export const addProjectThreadComment = async (projectId, threadId, content, parentCommentId) => {
  const { data } = await axios.post(`${BASE_URL}/projects/${projectId}/threads/${threadId}/comments`, { content, parentCommentId: parentCommentId || null }, config());
  return data?.comment || data?.data?.comment || data?.data || data;
};
export const deleteProjectThread = async (projectId, threadId) => {
  const { data } = await axios.delete(`${BASE_URL}/projects/${projectId}/threads/${threadId}`, config());
  return data;
};
