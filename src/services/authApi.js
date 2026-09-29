const BASE_URL = import.meta.env.VITE_BASE_URL;
export const registerUser = async (userData) => {
  const { confirmPassword, ...apiData } = userData;

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
  if (data.token || data.accessToken) {
    localStorage.setItem('frietSyncToken', data.token || data.accessToken);
  }

  return data;
};

export const verifyOtp = async (email, otp) => {
  const requestBody = { 
    email: email, 
    code: otp 
  };
  console.log(requestBody);
  const response = await fetch(`${BASE_URL}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email, code: otp }), 
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Invalid or expired OTP.');
  }
  
  return data;
}


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