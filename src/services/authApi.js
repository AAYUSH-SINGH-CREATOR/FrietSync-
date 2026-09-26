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