import axios from 'axios';
import { getFriendlyErrorMessage } from '../../../utils/errorHandler';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const getAuthHeaders = (isMultipart = false) => {
  const rawToken =
    localStorage.getItem('frietSyncToken') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('token') ||
    '';
  const token = rawToken.replace(/^Bearer\s+/i, '').trim();

  return {
    headers: {
      ...(isMultipart ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
};

const handleProfileError = (error, defaultMessage) => {
  if (error.response) {
    error.status = error.response.status;
    error.data = error.response.data;
    const serverMsg =
      error.response.data?.message ||
      error.response.data?.error ||
      error.response.data?.msg ||
      (typeof error.response.data === 'string' ? error.response.data : null);
    error.message = serverMsg || defaultMessage;
  } else {
    error.status = 0;
    error.response = { status: 0, data: null };
    error.data = null;
    error.message = error.message || defaultMessage;
  }
  throw error;
};

export const getCurrentUserProfile = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/users/me`, getAuthHeaders());
    const data = response.data;
    return data?.data || data?.user || data || null;
  } catch (error) {
    handleProfileError(error, 'Failed to fetch user profile.');
  }
};

export const updateUserProfile = async (profileData) => {
  try {
    const payload = {
      name: profileData.name,
      bio: profileData.bio,
      jobTitle: profileData.jobTitle,
      githubUrl: profileData.githubUrl,
      linkedinUrl: profileData.linkedinUrl,
    };

    const response = await axios.patch(
      `${BASE_URL}/users/me`,
      payload,
      getAuthHeaders()
    );
    const data = response.data;
    return data?.data || data?.user || data || null;
  } catch (error) {
    handleProfileError(error, 'Failed to update user profile.');
  }
};

export const uploadProfilePicture = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('profilePicture', file);

    const response = await axios.post(
      `${BASE_URL}/users/me/profile-picture`,
      formData,
      getAuthHeaders(true)
    );
    const data = response.data;
    return data?.data || data?.user || data || null;
  } catch (error) {
    handleProfileError(error, 'Failed to upload profile picture.');
  }
};

export { getFriendlyErrorMessage };




import defaultAvatar from '../../../assets/oggy-img.png';

const STORAGE_KEY = 'frietsync_user_profile';

const DEFAULT_PROFILE = {
  fullName: 'Arjun Mehta',
  email: 'arjunmehta255012@company.ac.in',
  jobTitle: 'Backend Developer',
  role: 'Contributor',
  skills: ['HTML', 'CSS', 'Rust', 'C++', 'Dart', 'Go', 'Node.js', 'Python'],
  about:
    'Backend Developer specializing in API development, database management, and building secure, scalable, and high-performance systems.\nPassionate about solving complex problems, optimizing server-side performance, and creating reliable digital experiences.',
  avatarUrl: defaultAvatar,
};

export const getProfile = async () => {
  await new Promise((resolve) => setTimeout(resolve, 80));

  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      return {
        ...DEFAULT_PROFILE,
        ...parsed,
        avatarUrl: parsed.avatarUrl || defaultAvatar,
      };
    }
  } catch {
  }

  return { ...DEFAULT_PROFILE };
};

export const updateProfile = async (profileData) => {
  await new Promise((resolve) => setTimeout(resolve, 150));

  try {
    const existing = await getProfile();
    const updated = {
      ...existing,
      ...profileData,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (error) {
    throw new Error(error?.message || 'Failed to update profile.', { cause: error });
  }
};

export const uploadAvatar = async (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file selected'));
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const avatarUrl = reader.result;
        const updated = await updateProfile({ avatarUrl });
        resolve(updated);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
};

export default {
  getProfile,
  updateProfile,
  uploadAvatar,
};
