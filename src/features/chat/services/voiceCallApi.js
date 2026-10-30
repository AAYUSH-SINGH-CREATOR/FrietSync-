import axios from 'axios';
import { getAuthToken } from './chatApi';
import { getFriendlyErrorMessage } from '../../../utils/errorHandler';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const getAuthHeaders = () => {
  const token = getAuthToken();
  return {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
};

export const voiceCallApi = {
  joinCall: async (projectId, callId) => {
    if (!projectId || !callId) {
      throw new Error('Project ID and Call ID are required.');
    }
    try {
      const response = await axios.post(
        `${BASE_URL}/projects/${projectId}/calls/${callId}/join`,
        null,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      throw new Error(getFriendlyErrorMessage(error, 'voice-call') || 'Failed to join voice call.', { cause: error });
    }
  },

  leaveCall: async (projectId, callId) => {
    if (!projectId || !callId) {
      throw new Error('Project ID and Call ID are required.');
    }
    try {
      const response = await axios.post(
        `${BASE_URL}/projects/${projectId}/calls/${callId}/leave`,
        null,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      throw new Error(getFriendlyErrorMessage(error, 'voice-call') || 'Failed to leave voice call.', { cause: error });
    }
  },

  endCall: async (projectId, callId) => {
    if (!projectId || !callId) {
      throw new Error('Project ID and Call ID are required.');
    }
    try {
      const response = await axios.post(
        `${BASE_URL}/projects/${projectId}/calls/${callId}/end`,
        null,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      throw new Error(getFriendlyErrorMessage(error, 'voice-call') || 'Failed to end voice call.', { cause: error });
    }
  },

  findActiveCall: async (projectId) => {
    if (!projectId) {
      throw new Error('Project ID is required.');
    }
    try {
      const response = await axios.get(
        `${BASE_URL}/projects/${projectId}/calls/active`,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      throw new Error(getFriendlyErrorMessage(error, 'voice-call') || 'Failed to find active call.', { cause: error });
    }
  },

  startCall: async (projectId) => {
    if (!projectId) {
      throw new Error('Project ID is required.');
    }
    try {
      const response = await axios.post(
        `${BASE_URL}/projects/${projectId}/calls`,
        null,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      throw new Error(getFriendlyErrorMessage(error, 'voice-call') || 'Failed to start call.', { cause: error });
    }
  },
};

export const { joinCall, leaveCall, endCall, findActiveCall, startCall } = voiceCallApi;
