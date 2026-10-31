const STORAGE_KEY = 'frietSyncDashboardProjectId';
const CHANGE_EVENT = 'frietSync:dashboard-project-change';

export const getDashboardProjectId = () => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(STORAGE_KEY) || '';
};

export const setDashboardProjectId = (projectId) => {
  if (typeof window === 'undefined' || !projectId || projectId === 'all') return;
  window.localStorage.setItem(STORAGE_KEY, String(projectId));
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { projectId: String(projectId) } }));
};

export const subscribeToDashboardProjectId = (callback) => {
  if (typeof window === 'undefined') return () => {};
  const handleChange = (event) => callback(event.detail?.projectId || '');
  window.addEventListener(CHANGE_EVENT, handleChange);
  return () => window.removeEventListener(CHANGE_EVENT, handleChange);
};
