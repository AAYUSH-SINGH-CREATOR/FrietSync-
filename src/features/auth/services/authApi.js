const BASE_URL = import.meta.env.VITE_BASE_URL;
import axios from 'axios';
import { getFriendlyErrorMessage } from '../../../utils/errorHandler';

export { getFriendlyErrorMessage };

const cleanupLegacyLocalStorage = () => {
  if (typeof window === 'undefined') return;
  try {
    let storedUser = {};
    try {
      const parsedUser = JSON.parse(localStorage.getItem('frietSyncUser') || '{}');
      if (parsedUser && typeof parsedUser === 'object' && !Array.isArray(parsedUser)) storedUser = parsedUser;
    } catch {
      // Rebuild the consolidated user record from legacy scalar keys below.
    }
    const legacyFields = {
      name: localStorage.getItem('frietSyncName'),
      role: localStorage.getItem('frietSyncRole'),
      email: localStorage.getItem('frietSyncEmail'),
      userId: localStorage.getItem('frietSyncUserId'),
    };
    const migratedUser = { ...storedUser };
    Object.entries(legacyFields).forEach(([field, value]) => {
      if (!migratedUser[field] && value) migratedUser[field] = value;
    });
    if (Object.keys(migratedUser).length) localStorage.setItem('frietSyncUser', JSON.stringify(migratedUser));

    if (!localStorage.getItem('frietSyncToken')) {
      const legacyToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (legacyToken) localStorage.setItem('frietSyncToken', legacyToken.replace(/^Bearer\s+/i, '').trim());
    }

    [
      'accessToken', 'token', 'frietSyncName', 'frietSyncRole', 'frietSyncEmail', 'frietSyncUserId',
      'frietSync_issues_view', 'frietSync_sprints_view', 'frietsync_chat_state_v1', 'frietsync_user_profile',
    ].forEach((key) => localStorage.removeItem(key));
  } catch {
    // Keep existing browser data intact if storage is unavailable or malformed.
  }
};

cleanupLegacyLocalStorage();

const ACCESS_TOKEN_REFRESH_INTERVAL_MS = 14 * 60_000;
const ACCESS_TOKEN_REFRESH_RETRY_MS = 30_000;
let refreshRequestPromise = null;
let scheduledRefreshTimeout = null;
let expirationHandled = false;
let refreshScheduleActive = false;


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
  const rawToken = localStorage.getItem('frietSyncToken') || '';
  return rawToken ? rawToken.replace(/^Bearer\s+/i, '').trim() : '';
};

const getTokenExpiry = (token) => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
    return Number.isFinite(Number(claims.exp)) ? Number(claims.exp) * 1000 : null;
  } catch {
    return null;
  }
};

const clearScheduledRefreshTimeout = () => {
  if (scheduledRefreshTimeout && typeof window !== 'undefined') {
    window.clearTimeout(scheduledRefreshTimeout);
  }
  scheduledRefreshTimeout = null;
};

export const stopAccessTokenRefreshSchedule = () => {
  refreshScheduleActive = false;
  clearScheduledRefreshTimeout();
};

export const expireAuthSession = () => {
  if (expirationHandled) return;
  expirationHandled = true;
  clearAuthStorage();
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
};

export const scheduleAccessTokenRefresh = (token = getAccessToken()) => {
  clearScheduledRefreshTimeout();
  if (!refreshScheduleActive || !token || typeof window === 'undefined') return;

  const now = Date.now();
  const storedIssueTime = Number(localStorage.getItem('frietSyncTokenIssuedAt'));
  const refreshAt = storedIssueTime
    ? storedIssueTime + ACCESS_TOKEN_REFRESH_INTERVAL_MS
    : getTokenExpiry(token)
      ? getTokenExpiry(token) - 60_000
      : now + ACCESS_TOKEN_REFRESH_INTERVAL_MS;

  scheduledRefreshTimeout = window.setTimeout(async () => {
    scheduledRefreshTimeout = null;
    if (!getAccessToken()) return;

    try {
      await refreshAccessToken();
    } catch (error) {
      const status = error?.response?.status || error?.status;
      if ([400, 401, 403].includes(status)) {
        expireAuthSession();
      } else if (getAccessToken()) {
        scheduleRefreshRetry();
      }
    }
  }, Math.max(0, refreshAt - now));
};

const scheduleRefreshRetry = () => {
  clearScheduledRefreshTimeout();
  if (!refreshScheduleActive || !getAccessToken() || typeof window === 'undefined') return;

  scheduledRefreshTimeout = window.setTimeout(async () => {
    scheduledRefreshTimeout = null;
    if (!refreshScheduleActive || !getAccessToken()) return;

    try {
      await refreshAccessToken();
    } catch (error) {
      const status = error?.response?.status || error?.status;
      if ([400, 401, 403].includes(status)) {
        expireAuthSession();
      } else if (getAccessToken()) {
        scheduleRefreshRetry();
      }
    }
  }, ACCESS_TOKEN_REFRESH_RETRY_MS);
};

export const initializeAccessTokenRefresh = () => {
  refreshScheduleActive = true;
  const token = getAccessToken();
  if (!token) return;

  const expiry = getTokenExpiry(token);
  const now = Date.now();

  
  if (expiry && expiry <= now) {
    refreshAccessToken().catch((error) => {
      const status = error?.response?.status || error?.status;
      if ([400, 401, 403].includes(status)) {
        expireAuthSession();
      } else if (getAccessToken()) {
        scheduleRefreshRetry();
      }
    });
    return;
  }

  scheduleAccessTokenRefresh(token);
};

const saveAccessToken = (token) => {
  const normalizedToken = String(token).replace(/^Bearer\s+/i, '').trim();
  localStorage.setItem('frietSyncToken', normalizedToken);
  localStorage.removeItem('accessToken');
  localStorage.removeItem('token');
  localStorage.setItem('frietSyncTokenIssuedAt', String(Date.now()));
  expirationHandled = false;
  scheduleAccessTokenRefresh(normalizedToken);
};

export const isAccessTokenRefreshInProgress = () => Boolean(refreshRequestPromise);

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

  const responseUser = data?.user || data?.data?.user || data?.data || data || {};
  const userId = responseUser.id || responseUser._id || responseUser.userId || fallbackData?.id || fallbackData?.userId;
  const email = responseUser.email || fallbackData?.email;
  let existing = {};
  try {
    const parsed = JSON.parse(localStorage.getItem('frietSyncUser') || '{}');
    if (parsed && typeof parsed === 'object') existing = parsed;
  } catch {
    // Replace malformed persisted profile data with fields from the current response.
  }
  const nextUser = {
    ...existing,
    ...(name ? { name } : {}),
    ...(role ? { role } : {}),
    ...(userId ? { userId } : {}),
    ...(email ? { email } : {}),
  };
  if (Object.keys(nextUser).length) localStorage.setItem('frietSyncUser', JSON.stringify(nextUser));
  ['frietSyncName', 'frietSyncRole', 'frietSyncEmail', 'frietSyncUserId'].forEach((key) => localStorage.removeItem(key));
};

export const registerUser = async (userData) => {
  try {
    const apiData = { ...userData };
    delete apiData.confirmPassword;

    const response = await axios.post(`${BASE_URL}/auth/signup`, apiData);
    const data = response.data;
    saveUserData(data, userData);
    return response.data;
  } catch (error) {
    handleAxiosError(error, 'Failed to create account. Please try again.');
  }
};

export const loginUser = async (userData) => {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, userData, {
      withCredentials: true,
    });
    const data = response.data;

    const token = data.token || data.accessToken || data.data?.token || data.data?.accessToken;

    if (token) {
      saveAccessToken(token);
      localStorage.removeItem('frietSyncRefreshToken');
      initializeAccessTokenRefresh();
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
    saveUserData(data, { email });
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

export const refreshAccessToken = () => {
  if (refreshRequestPromise) return refreshRequestPromise;

  refreshRequestPromise = (async () => {
    try {
      const response = await axios.post(`${BASE_URL}/auth/refresh`, undefined, {
        withCredentials: true,
      });
      const data = response.data;
      const newToken = typeof data?.accessToken === 'string' ? data.accessToken.trim() : '';

      if (!newToken) {
        const error = new Error('Refresh response did not include an access token.');
        error.status = 502;
        error.response = { status: 502, data };
        throw error;
      }

      
      
      saveAccessToken(newToken);
      return data;
    } catch (error) {
      handleAxiosError(error, 'Session expired. Please log in again.');
    }
  })().finally(() => {
    refreshRequestPromise = null;
  });

  return refreshRequestPromise;
};

export const logoutUser = async () => {
  const token = getAccessToken();


  try {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    await axios.post(
      `${BASE_URL}/auth/logout`,
      null,
      { headers, withCredentials: true }
    );
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    clearAuthStorage();
  }
};

export const fetchWithAuth = async (url, options = {}) => {
  try {
    const token = getAccessToken();
    const headers = {
      ...options.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    };
    const response = await axios({ url, ...options, headers });
    return response;
  } catch (error) {
    handleAxiosError(error, 'Request failed');
  }
};

export const invitemem = async (fromdata) => {
  const token = getAccessToken();
  try {
     const payload = {
      purpose: 'WORKSPACE_INVITE',
      ...fromdata,
    };
    const response = await axios.post(`${BASE_URL}/admin/invites`, payload, {
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
      return parsed && typeof parsed === 'object' ? parsed : {};
    }
  } catch {
    
  }
  return {};
};

export const clearAuthStorage = () => {
  stopAccessTokenRefreshSchedule();
  localStorage.removeItem('frietSyncToken');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('token');
  localStorage.removeItem('frietSyncRefreshToken');
  localStorage.removeItem('frietSyncTokenIssuedAt');
  localStorage.removeItem('frietSyncUser');
  localStorage.removeItem('frietSyncName');
  localStorage.removeItem('frietSyncRole');
  localStorage.removeItem('frietSyncEmail');
  localStorage.removeItem('frietSyncUserId');
  localStorage.removeItem('frietsync_user_profile');
};
