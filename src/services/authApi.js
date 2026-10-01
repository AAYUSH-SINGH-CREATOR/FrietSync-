const BASE_URL = import.meta.env.VITE_BASE_URL;

export const registerUser = async (userData) => {
  const apiData = { ...userData };
  delete apiData.confirmPassword;

  const response = await fetch(`${BASE_URL}/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(apiData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to create account. Please try again.');
  }

  return data;
};

export const loginUser = async (userData) => {
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Invalid email or password.');
  }

  // Extract access token and refresh token
  const token = data.token || data.accessToken || data.data?.token || data.data?.accessToken;
  const refreshToken = data.refreshToken || data.data?.refreshToken;

  if (token) {
    localStorage.setItem('frietSyncToken', token);
  }
  if (refreshToken) {
    localStorage.setItem('frietSyncRefreshToken', refreshToken);
  }

  return data;
};

export const verifyOtp = async (email, otp) => {
  const response = await fetch(`${BASE_URL}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email, code: otp }), 
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Invalid or expired OTP.');
  }

  const token = data.token || data.accessToken || data.data?.token || data.data?.accessToken;
  const refreshToken = data.refreshToken || data.data?.refreshToken;

  if (token) {
    localStorage.setItem('frietSyncToken', token);
  }
  if (refreshToken) {
    localStorage.setItem('frietSyncRefreshToken', refreshToken);
  }
  
  return data;
};

export const sendForgotPasswordOtp = async (email) => {
  const response = await fetch(`${BASE_URL}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }), 
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to send OTP.');
  return data;
};

export const resetPassword = async (email, otp, newPassword) => {
  const response = await fetch(`${BASE_URL}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      email: email, 
      code: otp, 
      newPassword: newPassword 
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Failed to reset password.');
  return data;
};

export const verifyPasswordResetOtp = async (email, otp) => {
  const response = await fetch(`${BASE_URL}/verify-otp`, { 
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email, code: otp }), 
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Invalid OTP.');
  return data;
};

export const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('frietSyncRefreshToken');

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${BASE_URL}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await response.json();

  if (!response.ok) {
    localStorage.removeItem('frietSyncToken');
    localStorage.removeItem('frietSyncRefreshToken');
    throw new Error(data.message || 'Session expired. Please log in again.');
  }

  const newToken = data.token || data.accessToken || data.data?.token || data.data?.accessToken;
  const newRefreshToken = data.refreshToken || data.data?.refreshToken;

  if (newToken) {
    localStorage.setItem('frietSyncToken', newToken);
  }
  if (newRefreshToken) {
    localStorage.setItem('frietSyncRefreshToken', newRefreshToken);
  }

  return data;
};

export const logoutUser = async () => {
  const refreshToken = localStorage.getItem('frietSyncRefreshToken');

  try {
    if (refreshToken) {
      await fetch(`${BASE_URL}/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
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
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  let response = await fetch(url, { ...options, headers });

  if (response.status === 401 && localStorage.getItem('frietSyncRefreshToken')) {
    try {
      await refreshAccessToken();
      token = localStorage.getItem('frietSyncToken');
      headers.Authorization = `Bearer ${token}`;
      response = await fetch(url, { ...options, headers });
    } catch {
      await logoutUser();
      window.location.href = '/login';
    }
  }

  return response;
};