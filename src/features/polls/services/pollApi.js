import axios from 'axios';
import { getAccessToken } from '../../auth/services/authApi';
import { getFriendlyErrorMessage } from '../../../utils/errorHandler';
import { getSharedStompClient } from '../../chat/services/stompClient';

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

export const voteInPoll = async (pollId, optionInput) => {
  if (!pollId) throw new Error('Poll ID is required.');
  if (!optionInput) throw new Error('Option ID is required.');
  try {
    const payload = Array.isArray(optionInput)
      ? { optionIds: optionInput }
      : typeof optionInput === 'object' && (optionInput.optionIds || optionInput.optionId)
      ? optionInput
      : { optionId: optionInput };
    const response = await axios.put(`${BASE_URL}/polls/${pollId}/votes`, payload, getAuthHeaders());
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

export const mergePollUpdateEvent = (currentPoll, event) => {
  if (!currentPoll) return normalizePoll(event) || event;
  if (!event) return currentPoll;

  const raw = normalizePoll(event) || event;
  const currentPollId = currentPoll?.id || currentPoll?._id || currentPoll?.pollId;
  const eventPollId = raw?.id || raw?.pollId || raw?._id;

  if (currentPollId && eventPollId && String(currentPollId) !== String(eventPollId)) {
    return currentPoll;
  }

  const isClosed =
    raw.status === 'CLOSED' ||
    raw.closed === true ||
    (raw.closesAt && new Date(raw.closesAt) < new Date()) ||
    currentPoll.status === 'CLOSED' ||
    currentPoll.closed === true;

  const newStatus = raw.status || (isClosed ? 'CLOSED' : currentPoll.status || 'ACTIVE');

  let updatedOptions = [...(currentPoll.options || [])];

  if (Array.isArray(raw.options) && raw.options.length > 0) {
    updatedOptions = updatedOptions.map((opt, idx) => {
      const optId = opt.id || opt.optionId || opt._id || String(idx);
      const incoming = raw.options.find(
        (o, i) => (o.id || o.optionId || o._id || String(i)) === optId
      );
      if (!incoming) return opt;
      const voteCount =
        incoming.voteCount ??
        incoming.votes ??
        incoming.count ??
        opt.voteCount ??
        opt.votes ??
        0;
      return {
        ...opt,
        ...incoming,
        id: optId,
        text: incoming.text || incoming.label || incoming.title || opt.text,
        voteCount,
      };
    });
  } else if (raw.optionVotes && typeof raw.optionVotes === 'object') {
    updatedOptions = updatedOptions.map((opt, idx) => {
      const optId = opt.id || opt.optionId || opt._id || String(idx);
      const voteCount = raw.optionVotes[optId] ?? opt.voteCount ?? opt.votes ?? 0;
      return { ...opt, voteCount };
    });
  } else if (raw.votes && typeof raw.votes === 'object' && !Array.isArray(raw.votes)) {
    updatedOptions = updatedOptions.map((opt, idx) => {
      const optId = opt.id || opt.optionId || opt._id || String(idx);
      const voteCount = raw.votes[optId] ?? opt.voteCount ?? opt.votes ?? 0;
      return { ...opt, voteCount };
    });
  }

  const totalVotes =
    typeof raw.totalVotes === 'number'
      ? raw.totalVotes
      : typeof raw.totalCount === 'number'
      ? raw.totalCount
      : updatedOptions.reduce((acc, o) => acc + (o.voteCount || o.votes || o.count || 0), 0);

  updatedOptions = updatedOptions.map((opt) => ({
    ...opt,
    percentage: totalVotes > 0 ? Math.round(((opt.voteCount || 0) / totalVotes) * 100) : 0,
  }));

  return {
    ...currentPoll,
    ...raw,
    id: currentPollId,
    status: newStatus,
    closed: isClosed,
    totalVotes,
    options: updatedOptions,
    userVotedOptionId: raw.userVotedOptionId || raw.votedOptionId || currentPoll.userVotedOptionId || currentPoll.votedOptionId,
  };
};

export const subscribeToPollResults = (pollId, callback) => {
  if (!pollId || typeof callback !== 'function') return () => {};
  const client = getSharedStompClient();
  if (!client.connected && (!client.ws || client.ws.readyState > WebSocket.OPEN)) {
    client.connect();
  }
  return client.subscribe(`/topic/polls/${pollId}/results`, callback);
};

export { getFriendlyErrorMessage };

