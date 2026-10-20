import axios from 'axios';
import { getAccessToken } from '../../auth/services/authApi';
import { getFriendlyErrorMessage } from '../../../utils/errorHandler';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const getAuthHeaders = () => {
  const token = getAccessToken();
  return {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
};

const handlePollError = (error, defaultMessage) => {
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

export const normalizePollList = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.polls)) return data.polls;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.polls)) return data.data.polls;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.content)) return data.content;
  return [];
};

export const normalizePoll = (data) => {
  if (!data) return null;
  if (data?.poll && typeof data.poll === 'object') return data.poll;
  if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) return data.data;
  if (data?.item && typeof data.item === 'object') return data.item;
  return data;
};

export const createProjectPoll = async (projectId, pollData) => {
  if (!projectId) throw new Error('Project ID is required.');
  try {
    const payload = {
      question: pollData.question?.trim(),
      description: pollData.description?.trim() || '',
      options: (pollData.options || []).map((o) => (typeof o === 'string' ? o.trim() : o.text || o.label || '')).filter(Boolean),
      closesAt: pollData.closesAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      mode: pollData.mode || 'SINGLE',
    };
    const response = await axios.post(`${BASE_URL}/projects/${projectId}/polls`, payload, getAuthHeaders());
    return normalizePoll(response.data) || response.data;
  } catch (error) {
    handlePollError(error, 'Failed to create poll. Please check your input and try again.');
  }
};

export const getProjectPolls = async (projectId) => {
  if (!projectId) return [];
  try {
    const response = await axios.get(`${BASE_URL}/projects/${projectId}/polls`, getAuthHeaders());
    return normalizePollList(response.data);
  } catch (error) {
    handlePollError(error, 'Failed to load project polls.');
  }
};

export const getPollDetails = async (pollId) => {
  if (!pollId) throw new Error('Poll ID is required.');
  try {
    const response = await axios.get(`${BASE_URL}/polls/${pollId}`, getAuthHeaders());
    return normalizePoll(response.data) || response.data;
  } catch (error) {
    handlePollError(error, 'Failed to load poll details.');
  }
};

export const voteInPoll = async (pollId, optionId) => {
  if (!pollId) throw new Error('Poll ID is required.');
  if (!optionId) throw new Error('Option ID is required.');
  try {
    const response = await axios.put(`${BASE_URL}/polls/${pollId}/votes`, { optionId }, getAuthHeaders());
    return normalizePoll(response.data) || response.data;
  } catch (error) {
    handlePollError(error, 'Failed to record vote. You may have already voted or this poll is closed.');
  }
};

export const closePoll = async (pollId) => {
  if (!pollId) throw new Error('Poll ID is required.');
  try {
    const response = await axios.post(`${BASE_URL}/polls/${pollId}/close`, {}, getAuthHeaders());
    return normalizePoll(response.data) || response.data;
  } catch (error) {
    try {
      const patchRes = await axios.patch(`${BASE_URL}/polls/${pollId}/close`, {}, getAuthHeaders());
      return normalizePoll(patchRes.data) || patchRes.data;
    } catch {
      handlePollError(error, 'Failed to close poll.');
    }
  }
};

export { getFriendlyErrorMessage };

