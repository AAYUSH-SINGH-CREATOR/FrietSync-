const BASE_URL = import.meta.env.VITE_BASE_URL;
import axios from 'axios';
import { getFriendlyErrorMessage } from '../utils/errorHandler';

export { getFriendlyErrorMessage };


const handleAxiosError = (error, defaultMessage) => {
  if (error.response) {
    error.status = error.response.status;
    error.data = error.response.data;
    error.message = error.response.data?.message || defaultMessage;
  } else {
    error.status = 0;
    error.response = { status: 0, data: null };
    error.data = null;
    error.message = error.message || defaultMessage;
  }
  throw error;
};

export const getAccessToken = () => {
  const rawToken =
    localStorage.getItem('accessToken')||'';
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
  try {
    const apiData = { ...userData };
    delete apiData.confirmPassword;

    const response = await axios.post(`${BASE_URL}/auth/signup`, apiData);
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
  } catch (error) {
    handleAxiosError(error, 'Failed to create account. Please try again.');
  }
};

export const loginUser = async (userData) => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, userData);
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
  } catch (error) {
    handleAxiosError(error, 'Invalid email or password.');
  }
};

export const verifyOtp = async (email, otp) => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/verify-otp`, { email, code: otp });
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
  } catch (err) {
    handleAxiosError(err, 'Invalid or expired OTP.');
  }
};

export const sendForgotPasswordOtp = async (email) => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/forgot-password`, { email });
    return response.data;
  } catch (error) {
    handleAxiosError(error, 'Failed to send OTP.');
  }
};

export const resetPassword = async (email, otp, newPassword) => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/reset-password`, {
      email,
      code: otp,
      newPassword,
    });
    return response.data;
  } catch (error) {
    handleAxiosError(error, 'Failed to reset password.');
  }
};

export const verifyPasswordResetOtp = async (email, otp) => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/verify-otp`, { email, code: otp });
    return response.data;
  } catch (error) {
    handleAxiosError(error, 'Invalid OTP.');
  }
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
    const response = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
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
    handleAxiosError(error, 'Session expired. Please log in again.');
  }
};

export const logoutUser = async () => {
  const refreshToken = localStorage.getItem('frietSyncRefreshToken');

  try {
    if (refreshToken) {
      await axios.post(`${BASE_URL}/auth/logout`, { refreshToken });
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
    const response = await axios({ url, ...options, headers });
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
        return await axios({ url, ...options, headers: retryHeaders });
      } catch {
        await logoutUser();
        window.location.href = '/login';
        throw error;
      }
    }
    handleAxiosError(error, 'Request failed');
  }
};

export const invitemem = async (fromdata) => {
    const token = getAccessToken();
  try {
    const response = await axios.post(`${BASE_URL}/admin/invites`, fromdata, {
         headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return response.data;
  } catch (err) {
    handleAxiosError(err, 'Invitation failed.');
  }
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
