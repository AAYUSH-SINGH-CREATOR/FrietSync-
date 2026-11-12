import axios from 'axios';
import { getFriendlyErrorMessage } from '../../../utils/errorHandler';
import { getAccessToken } from '../../auth/services/authApi';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const getAuthHeaders = () => {
  const token = getAccessToken();
  return {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
};
const handleCanvasError = (error, defaultMessage) => {
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

export const listCanvases = async (projectId) => {
  if (!projectId) throw new Error('Project ID is required.');
  try {
    const response = await axios.get(
      `${BASE_URL}/projects/${projectId}/canvases`,
      getAuthHeaders()
    );
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.canvases)) return data.canvases;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  } catch (error) {
    handleCanvasError(error, 'Failed to load project canvases.');
  }
};

export const createCanvas = async (projectId, name) => {
  if (!projectId) throw new Error('Project ID is required.');
  try {
    const response = await axios.post(
      `${BASE_URL}/projects/${projectId}/canvases`,
      { name },
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    handleCanvasError(error, 'Failed to create canvas.');
  }
};

export const renameCanvas = async (canvasId, name) => {
  if (!canvasId) throw new Error('Canvas ID is required.');
  try {
    const response = await axios.patch(
      `${BASE_URL}/canvases/${canvasId}`,
      { name },
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    handleCanvasError(error, 'Failed to rename canvas.');
  }
};

export const deleteCanvas = async (canvasId) => {
  if (!canvasId) throw new Error('Canvas ID is required.');
  try {
    await axios.delete(`${BASE_URL}/canvases/${canvasId}`, getAuthHeaders());
  } catch (error) {
    handleCanvasError(error, 'Failed to delete canvas.');
  }
};

export const getCanvas = async (canvasId) => {
  if (!canvasId) throw new Error('Canvas ID is required.');
  try {
    const response = await axios.get(
      `${BASE_URL}/canvases/${canvasId}`,
      getAuthHeaders()
    );
    const data = response.data;
    const canvas = data?.canvas || data?.data?.canvas || data;
    const elements = Array.isArray(data?.elements)
      ? data.elements
      : Array.isArray(data?.data?.elements)
      ? data.data.elements
      : [];
    return { canvas, elements };
  } catch (error) {
    handleCanvasError(error, 'Failed to load canvas details.');
  }
};
