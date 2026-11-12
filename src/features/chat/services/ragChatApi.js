import axios from 'axios';
import { getAccessToken } from '../../auth/services/authApi';

const BASE_URL = import.meta.env.VITE_BASE_URL;

export const askRagAssistant = async (projectId, question, { signal, timeout } = {}) => {
  if (!projectId) throw new Error('Choose a project before asking the AI Assistant.');
  const token = getAccessToken();

  try {
    const response = await axios.post(
      `${BASE_URL}/projects/${encodeURIComponent(projectId)}/rag-chat/ask`,
      { question },
      {
        signal,
        timeout,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }
    );
    return response.data?.data || response.data;
  } catch (error) {
    const data = error.response?.data;
    throw new Error(data?.message || data?.error || error.message || 'The AI Assistant could not answer right now.', { cause: error });
  }
};
