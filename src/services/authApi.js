import {
  apiRequest,
  getAuthHeaders,
  getStoredToken,
  normalizeApiError,
} from './apiClient';
import { getFriendlyErrorMessage } from '../utils/errorHandler';

export { getFriendlyErrorMessage };


export const getAccessToken = () => {
  const rawToken = getStoredToken();
  return rawToken ? rawToken.replace(/^Bearer\s+/i, '').trim() : '';
};
export const saveUserData = (data, fallbackData = {}) => {
  const name =
    data?.name ||
    data?.user?.name ||
    data?.data?.name ||
    data?.data?.user?.name ||
    data?.userName ||
    fallbackData?.name ||
    '';

  const role =
    data?.role ||
    data?.user?.role ||
    data?.data?.role ||
    data?.data?.user?.role ||
    '';

  if (name) {
    localStorage.setItem('frietSyncName', name);
  }
  if (role) {
    localStorage.setItem('frietSyncRole', role);
  }
  if (name || role) {
    let existing = {};
    try {
      const parsed = JSON.parse(localStorage.getItem('frietSyncUser') || '{}');
      if (parsed && typeof parsed === 'object') {
        existing = parsed;
      }
    } catch {
      // ignore JSON parse error
    }
    localStorage.setItem(
      'frietSyncUser',
      JSON.stringify({
        ...existing,
        name: name || existing.name || '',
        role: role || existing.role || '',
      })
    );
  }
};

export const registerUser = async (userData) => {
  const apiData = { ...userData };
  delete apiData.confirmPassword;

  const response = await apiRequest('/auth/signup', {
    method: 'post',
    data: apiData,
  }, 'Failed to create account. Please try again.');
  const data = response.data;

  const token = data.accessToken;
  const refreshToken = data.refreshToken || data.data?.refreshToken;

  if (token) {
    localStorage.setItem('frietSyncToken', token);
    localStorage.setItem('accessToken', token);
  }
  if (refreshToken) {
    localStorage.setItem('frietSyncRefreshToken', refreshToken);
  }
  saveUserData(data, userData);
  return response.data;
};

export const loginUser = async (userData) => {
  const response = await apiRequest('/auth/login', {
    method: 'post',
    data: userData,
  }, 'Invalid email or password.');
  const data = response.data;

  const token = data.token || data.accessToken || data.data?.token || data.data?.accessToken;
  const refreshToken = data.refreshToken || data.data?.refreshToken;

  if (token) {
    localStorage.setItem('frietSyncToken', token);
    localStorage.setItem('accessToken', token);
  }
  if (refreshToken) {
    localStorage.setItem('frietSyncRefreshToken', refreshToken);
  }
  saveUserData(data, userData);
  return response.data;
};

export const verifyOtp = async (email, otp) => {
  const response = await apiRequest('/auth/verify-otp', {
    method: 'post',
    data: { email, code: otp },
  }, 'Invalid or expired OTP.');
  const data = response.data;

  const token = data.token || data.accessToken || data.data?.token || data.data?.accessToken;
  const refreshToken = data.refreshToken || data.data?.refreshToken;

  if (token) {
    localStorage.setItem('frietSyncToken', token);
    localStorage.setItem('accessToken', token);
  }
  if (refreshToken) {
    localStorage.setItem('frietSyncRefreshToken', refreshToken);
  }
  saveUserData(data);
  return response.data;
};

export const sendForgotPasswordOtp = async (email) => {
  const response = await apiRequest('/auth/forgot-password', {
    method: 'post',
    data: { email },
  }, 'Failed to send OTP.');
  return response.data;
};

export const resetPassword = async (email, otp, newPassword) => {
  const response = await apiRequest('/auth/reset-password', {
    method: 'post',
    data: { email, code: otp, newPassword },
  }, 'Failed to reset password.');
  return response.data;
};

export const verifyPasswordResetOtp = async (email, otp) => {
  const response = await apiRequest('/auth/verify-otp', {
    method: 'post',
    data: { email, code: otp },
  }, 'Invalid OTP.');
  return response.data;
};

export const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('frietSyncRefreshToken');

  if (!refreshToken) {
    const error = new Error('No refresh token available');
    error.status = 401;
    error.response = { status: 401, data: null };
    throw error;
  }

  try {
    const response = await apiRequest('/auth/refresh', { method: 'post', data: { refreshToken } }, 'Session expired. Please log in again.');
    const data = response.data;

    const newToken = data.accessToken || data.data?.accessToken;
    const newRefreshToken = data.refreshToken || data.data?.refreshToken;

    if (newToken) {
      localStorage.setItem('frietSyncToken', newToken);
      localStorage.setItem('accessToken', newToken);
    }
    if (newRefreshToken) {
      localStorage.setItem('frietSyncRefreshToken', newRefreshToken);
    }

    return data;
  } catch (error) {
    clearAuthStorage();
    throw error;
  }
};

export const logoutUser = async () => {
  const refreshToken = localStorage.getItem('frietSyncRefreshToken');

  try {
    if (refreshToken) {
      await apiRequest('/auth/logout', { method: 'post', data: { refreshToken } }, 'Logout failed.');
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
 clearAuthStorage();
  }
};

export const fetchWithAuth = async (url, options = {}) => {
  let token = getAccessToken();

  const headers = {
    ...options.headers,
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  try {
    const response = await apiRequest(url, { url, ...options, headers });
    return response;
  } catch (error) {
    if (error.response?.status === 401 && localStorage.getItem('frietSyncRefreshToken')) {
      try {
        await refreshAccessToken();
        token = getAccessToken();
        const retryHeaders = {
          ...options.headers,
          ...(token && { Authorization: `Bearer ${token}` }),
        };
        return await apiRequest(url, { url, ...options, headers: retryHeaders });
      } catch {
        await logoutUser();
        window.location.href = '/login';
        throw error;
      }
    }
    throw normalizeApiError(error, 'Request failed');
  }
};

export const invitemem = async (fromdata) => {
  const token = getAccessToken();
  const response = await apiRequest('/admin/invites', {
    method: 'post',
    data: fromdata,
    ...getAuthHeaders(token),
  }, 'Invitation failed.');
  return response.data;
};

export const getUserProfile = () => {
  try {
    const raw = localStorage.getItem('frietSyncUser');
    if (raw) {
      const parsed = JSON.parse(raw);
      const name = parsed.name || localStorage.getItem('frietSyncName') || '';
      const role = parsed.role || localStorage.getItem('frietSyncRole') || '';
      return { name, role };
    }
  } catch {
  }
  return {
    name: localStorage.getItem('frietSyncName') || '',
    role: localStorage.getItem('frietSyncRole') || '',
  };
};

export const clearAuthStorage = () => {
  localStorage.removeItem('frietSyncToken');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('token');
  localStorage.removeItem('frietSyncRefreshToken');
  localStorage.removeItem('frietSyncUser');
  localStorage.removeItem('frietSyncName');
  localStorage.removeItem('frietSyncRole');
};
