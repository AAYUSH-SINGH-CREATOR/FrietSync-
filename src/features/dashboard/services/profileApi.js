import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BASE_URL;
const PROFILE_PICTURE_FIELD = import.meta.env.VITE_PROFILE_PICTURE_FIELD_NAME;

const getAuthHeaders = (isMultipart = false) => {
  const rawToken =
    localStorage.getItem('frietSyncToken') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('token') ||
    '';
  const token = rawToken.replace(/^Bearer\s+/i, '').trim();

  return {
    headers: {
      ...(!isMultipart ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
};

const unwrapProfile = (data) => data?.data?.user || data?.data || data?.user || data || null;

const handleProfileError = (error, defaultMessage) => {
  if (error.response) {
    error.status = error.response.status;
    error.data = error.response.data;
    error.message =
      error.response.data?.message || error.response.data?.error || defaultMessage;
  } else {
    error.status = 0;
    error.response = { status: 0, data: null };
    error.data = null;
    error.message = error.message || defaultMessage;
  }
  throw error;
};

export const getProfile = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/users/me`, getAuthHeaders());
    return unwrapProfile(response.data);
  } catch (error) {
    handleProfileError(error, 'Failed to fetch user profile.');
  }
};

export const updateProfile = async (profileData) => {
  const payload = {
    name: profileData.name?.trim() || '',
    bio: profileData.bio?.trim() || '',
    jobTitle: profileData.jobTitle?.trim() || '',
    githubUrl: profileData.githubUrl?.trim() || null,
    linkedinUrl: profileData.linkedinUrl?.trim() || null,
  };

  try {
    const response = await axios.patch(
      `${BASE_URL}/users/me`,
      payload,
      getAuthHeaders()
    );
    return unwrapProfile(response.data);
  } catch (error) {
    handleProfileError(error, 'Failed to update user profile.');
  }
};

export const uploadAvatar = async (file) => {
  if (!file) throw new Error('Select an image to upload.');
  if (!PROFILE_PICTURE_FIELD) {
    throw new Error(
      'Profile picture upload is not configured: the backend multipart field name is not documented.'
    );
  }

  try {
    const formData = new FormData();
    formData.append(PROFILE_PICTURE_FIELD, file);
    const response = await axios.post(
      `${BASE_URL}/users/me/profile-picture`,
      formData,
      getAuthHeaders(true)
    );
    return unwrapProfile(response.data);
  } catch (error) {
    handleProfileError(error, 'Failed to upload profile picture.');
  }
};

export default { getProfile, updateProfile, uploadAvatar };
