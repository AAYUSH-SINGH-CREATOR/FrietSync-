const BASE_URL = import.meta.env.VITE_BASE_URL;
import axios from 'axios' 

export const registerUser = async (userData) => {
try{
    const apiData = { ...userData };
  delete apiData.confirmPassword;

  const response = await axios.post(`${BASE_URL}/signup`, apiData);
  return response.data;
}
catch(error){
  throw new Error(error.response?.data?.message || 'failed to create account. please try again') 
}
};

export const loginUser = async (userData) => {
  try{
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

  }
   catch (error) {
    throw new Error(
      error.response?.data?.message ||
      'Invalid email or password.'
    );
  }
};

export const verifyOtp = async (email, otp) => {

  try{
     const response = await axios.post(`${BASE_URL}/verify-otp`, {email:email, code:otp});
 
  const token = data.token || data.accessToken || data.data?.token || data.data?.accessToken;
  const refreshToken = data.refreshToken || data.data?.refreshToken;
  const data = response.data;

  if (token) {
    localStorage.setItem('frietSyncToken', token);
  }
  if (refreshToken) {
    localStorage.setItem('frietSyncRefreshToken', refreshToken);
  }
  
  return response.data;
  }
  catch(err){
    throw new Error(err.response?.data?.message || 'invalide or expired OTP');
  }

};

export const sendForgotPasswordOtp = async (email) => {
  
try{
  const response = await axios.post(`${BASE_URL}/forgot-password`, {email})
}
catch(error){
  throw new Error(error.response?.data?.message || 'failed to send OTP')
}
};

export const resetPassword = async (email, otp, newPassword) => {
    const response = await axios(`${BASE_URL}/reset-password`, {email, code:otp, newPassword})
      if (!response.ok) {
    throw new Error(data.message || 'Failed to create account. Please try again.');
  }return response.data;

};

export const verifyPasswordResetOtp = async (email, otp) => {
  const response = await axios.post(`${BASE_URL}/verify-otp`, {email, code:otp})
  if (!response.ok) throw new Error(data.message || 'Invalid OTP.');
  return response.data;
};

export const refreshAccessToken = async () => {
  const refreshToken = localStorage.getItem('frietSyncRefreshToken');

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await axios.post(`${BASE_URL}/refresh`, {refreshToken});

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
      await axios.post(`${BASE_URL}/logout`, {refreshToken})
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

  let response = await axios({url, ...options, headers});

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