import axios from 'axios';
import { expireAuthSession, getAccessToken, refreshAccessToken } from './authApi';

// Ensure credentials (cookies) are included on requests so refresh cookies work reliably
axios.defaults.withCredentials = true;

const isAuthEndpoint = (url = '') =>
  [
    '/auth/login',
    '/auth/signup',
    '/auth/verify-otp',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/refresh',
    '/auth/logout',
  ].some((path) => url.includes(path));

const readBearerToken = (authorization = '') =>
  String(authorization || '').replace(/^Bearer\s+/i, '').trim();

const isDefinitiveRefreshFailure = (error) =>
  [400, 401, 403].includes(error?.response?.status || error?.status);

axios.interceptors.request.use((config) => {
  if (isAuthEndpoint(config.url)) return config;

  const token = getAccessToken();
  if (token) {
    config.headers = config.headers || {};
    if (typeof config.headers.set === 'function') {
      config.headers.set('Authorization', `Bearer ${token}`);
    } else {
      config.headers.Authorization = `Bearer ${token}`;
      config.headers.authorization = `Bearer ${token}`;
    }
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    if (
      error.response?.status !== 401 ||
      !request ||
      request.__authRefreshRetried ||
      isAuthEndpoint(request.url)
    ) {
      return Promise.reject(error);
    }

    const currentToken = getAccessToken();
    const sentAuth =
      request.headers?.Authorization ||
      request.headers?.authorization ||
      (typeof request.headers?.get === 'function' ? request.headers.get('Authorization') : '');
    const sentToken = readBearerToken(sentAuth);

    // Another request may already have refreshed the token while this 401 was in flight.
    if (currentToken && sentToken && currentToken !== sentToken) {
      request.__authRefreshRetried = true;
      if (typeof request.headers?.set === 'function') {
        request.headers.set('Authorization', `Bearer ${currentToken}`);
      } else {
        request.headers = request.headers || {};
        request.headers.Authorization = `Bearer ${currentToken}`;
        request.headers.authorization = `Bearer ${currentToken}`;
      }
      return axios.request(request);
    }

    request.__authRefreshRetried = true;
    try {
      await refreshAccessToken();
      const refreshedToken = getAccessToken();
      if (!refreshedToken) {
        const tokenError = new Error('Access token was not available after refresh.');
        tokenError.status = 502;
        return Promise.reject(tokenError);
      }

      if (typeof request.headers?.set === 'function') {
        request.headers.set('Authorization', `Bearer ${refreshedToken}`);
      } else {
        request.headers = request.headers || {};
        request.headers.Authorization = `Bearer ${refreshedToken}`;
        request.headers.authorization = `Bearer ${refreshedToken}`;
      }
      return axios.request(request);
    } catch (refreshError) {
      if (isDefinitiveRefreshFailure(refreshError)) {
        expireAuthSession();
      }
      return Promise.reject(refreshError);
    }
  }
);
