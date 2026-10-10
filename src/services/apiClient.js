import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BASE_URL;

export const getApiUrl = (path) => {
  if (/^https?:\/\//i.test(path)) return path;
  return `${BASE_URL}${path}`;
};

export const getStoredToken = (storageKey = 'accessToken') =>
  localStorage.getItem(storageKey) || '';

export const getAuthHeaders = (token) => ({
  headers: {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  },
});

export const normalizeApiError = (
  error,
  defaultMessage = 'Request failed',
  includeServerErrorFields = false
) => {
  if (error.response) {
    error.status = error.response.status;
    error.data = error.response.data;

    const responseData = error.response.data;
    const serverMessage = includeServerErrorFields
      ? responseData?.message ||
        responseData?.error ||
        responseData?.msg ||
        (typeof responseData === 'string' ? responseData : null)
      : responseData?.message;

    error.message = serverMessage || defaultMessage;
  } else {
    error.status = 0;
    error.response = { status: 0, data: null };
    error.data = null;
    error.message = error.message || defaultMessage;
  }

  return error;
};

export const apiRequest = async (
  path,
  config = {},
  defaultMessage = 'Request failed',
  includeServerErrorFields = false
) => {
  try {
    return await axios({ url: getApiUrl(path), ...config });
  } catch (error) {
    throw normalizeApiError(error, defaultMessage, includeServerErrorFields);
  }
};
