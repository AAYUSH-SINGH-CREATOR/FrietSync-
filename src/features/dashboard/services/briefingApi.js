import axios from 'axios';
import { getAccessToken } from '../../auth/services/authApi';

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

const unwrap = (data) => data?.data?.briefing || data?.data?.preferences || data?.data || data?.briefing || data?.preferences || data;

const handleError = (error, message) => {
  if (error.response) {
    error.status = error.response.status;
    error.data = error.response.data;
    error.message = error.response.data?.message || error.response.data?.error || message;
  } else {
    error.status = 0;
    error.message = error.message || message;
  }
  throw error;
};

export const getBriefing = async (today = false) => {
  try {
    const response = await axios.get(`${BASE_URL}/briefing${today ? '/today' : ''}`, getAuthHeaders());
    return unwrap(response.data);
  } catch (error) {
    handleError(error, 'Failed to load your daily briefing.');
  }
};

export const getBriefingPreferences = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/briefing/preferences`, getAuthHeaders());
    return unwrap(response.data);
  } catch (error) {
    handleError(error, 'Failed to load briefing preferences.');
  }
};

export const updateBriefingPreferences = async (preferences) => {
  try {
    const response = await axios.put(`${BASE_URL}/briefing/preferences`, preferences, getAuthHeaders());
    return unwrap(response.data);
  } catch (error) {
    handleError(error, 'Failed to save briefing preferences.');
  }
};
