import axios from 'axios';
import { getAccessToken } from '../../auth/services/authApi';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const config = () => {
  const token = getAccessToken();
  return {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
};

const unwrap = (data) => data?.document || data?.data?.document || data?.data || data;

export const getProjectDocuments = async (projectId) => {
  const { data } = await axios.get(`${BASE_URL}/projects/${projectId}/documents`, config());
  const result = unwrap(data);
  return Array.isArray(result) ? result : result?.documents || [];
};

export const getDocument = async (documentId) => {
  const { data } = await axios.get(`${BASE_URL}/documents/${documentId}`, config());
  return unwrap(data);
};

export const createDocument = async (projectId, payload) => {
  const { data } = await axios.post(`${BASE_URL}/projects/${projectId}/documents`, payload, config());
  return unwrap(data);
};

export const updateDocument = async (documentId, payload) => {
  const { data } = await axios.patch(`${BASE_URL}/documents/${documentId}`, payload, config());
  return unwrap(data);
};

export const deleteDocument = async (documentId) => {
  const { data } = await axios.delete(`${BASE_URL}/documents/${documentId}`, config());
  return data;
};
