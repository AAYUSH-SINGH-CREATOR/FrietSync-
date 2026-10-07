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

export const registerUser = async (userData) => {
  try {
    const apiData = { ...userData };
    delete apiData.confirmPassword;

    const response = await axios.post(`${BASE_URL}/signup`, apiData);
    return response.data;
  } catch (error) {
    handleAxiosError(error, 'Failed to create account. Please try again.');
  }
};

export const loginUser = async (userData) => {
  try {
    const response = await axios.post(`${BASE_URL}/login`, userData);
    const data = response.data;

    const token = data.token || data.accessToken || data.data?.token || data.data?.accessToken;
    const refreshToken = data.refreshToken || data.data?.refreshToken;

    if (token) {
      localStorage.setItem('frietSyncToken', token);
    }
    if (refreshToken) {
      localStorage.setItem('frietSyncRefreshToken', refreshToken);
    }

    return response.data;
  } catch (error) {
    handleAxiosError(error, 'Invalid email or password.');
  }
};

export const verifyOtp = async (email, otp) => {
  try {
    const response = await axios.post(`${BASE_URL}/verify-otp`, { email, code: otp });
    const data = response.data;

    const token = data.token || data.accessToken || data.data?.token || data.data?.accessToken;
    const refreshToken = data.refreshToken || data.data?.refreshToken;

    if (token) {
      localStorage.setItem('frietSyncToken', token);
    }
    if (refreshToken) {
      localStorage.setItem('frietSyncRefreshToken', refreshToken);
    }

    return response.data;
  } catch (err) {
    handleAxiosError(err, 'Invalid or expired OTP.');
  }
};

export const sendForgotPasswordOtp = async (email) => {
  try {
    const response = await axios.post(`${BASE_URL}/forgot-password`, { email });
    return response.data;
  } catch (error) {
    handleAxiosError(error, 'Failed to send OTP.');
  }
};

export const resetPassword = async (email, otp, newPassword) => {
  try {
    const response = await axios.post(`${BASE_URL}/reset-password`, {
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
    const response = await axios.post(`${BASE_URL}/verify-otp`, { email, code: otp });
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
    const response = await axios.post(`${BASE_URL}/refresh`, { refreshToken });
    const data = response.data;

    const newToken = data.token || data.accessToken || data.data?.token || data.data?.accessToken;
    const newRefreshToken = data.refreshToken || data.data?.refreshToken;

    if (newToken) {
      localStorage.setItem('frietSyncToken', newToken);
    }
    if (newRefreshToken) {
      localStorage.setItem('frietSyncRefreshToken', newRefreshToken);
    }

    return data;
  } catch (error) {
    localStorage.removeItem('frietSyncToken');
    localStorage.removeItem('frietSyncRefreshToken');
    handleAxiosError(error, 'Session expired. Please log in again.');
  }
};

export const logoutUser = async () => {
  const refreshToken = localStorage.getItem('frietSyncRefreshToken');

  try {
    if (refreshToken) {
      await axios.post(`${BASE_URL}/logout`, { refreshToken });
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem('frietSyncToken');
    localStorage.removeItem('frietSyncRefreshToken');
  }
};

export const fetchWithAuth = async (url, options = {}) => {
  let token = localStorage.getItem('frietSyncToken');

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
        token = localStorage.getItem('frietSyncToken');
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
  try {
    const response = await axios.post(`${BASE_URL}/admin/invites`, fromdata);
    return response.data;
  } catch (err) {
    handleAxiosError(err, 'Invitation failed.');
  }
};