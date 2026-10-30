import axios from 'axios';
import { getFriendlyErrorMessage } from '../../../utils/errorHandler';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const getAuthHeaders = () => {
  const rawToken = localStorage.getItem('frietSyncToken') || '';
  const token = rawToken.replace(/^Bearer\s+/i, '').trim();

  return {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
};

const handleProjectError = (error, defaultMessage) => {
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

export const getMyProjects = async () => {
  try {
    const response = await axios.get(
      `${BASE_URL}/projects/me`,
      getAuthHeaders()
    );
    const data = response.data;

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.projects)) return data.projects;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.data?.projects)) return data.data.projects;

    return data || [];
  } catch (error) {
    handleProjectError(error, 'Failed to load projects.');
  }
};

export const getProjectById = async (projectId) => {
  if (!projectId) {
    throw new Error('Project ID is required.');
  }
  try {
    const response = await axios.get(
      `${BASE_URL}/projects/${projectId}`,
      getAuthHeaders()
    );
    const data = response.data;
    return data?.project || data?.data?.project || data?.data || data;
  } catch (error) {
    handleProjectError(error, 'Failed to load project details.');
  }
};

export const createProject = async (projectData) => {
  try {
    const payload = {
      name: projectData.name?.trim(),
      description: projectData.description?.trim() || '',
      status: projectData.status || 'ACTIVE',
      startDate: projectData.startDate || new Date().toISOString().slice(0, 10),
      deadline: projectData.deadline || '',
      projectManagerEmail: projectData.projectManagerEmail?.trim() || '',
      teamLeadEmail: projectData.teamLeadEmail?.trim() || '',
    };
    const workspaceId = projectData.workspaceId || localStorage.getItem('frietSyncWorkspaceId');
    if (workspaceId) payload.workspaceId = workspaceId;

    const response = await axios.post(
      `${BASE_URL}/projects`,
      payload,
      getAuthHeaders()
    );
    const created = response.data?.project || response.data?.data || response.data;
    if (created?.workspaceId) {
      localStorage.setItem('frietSyncWorkspaceId', created.workspaceId);
    }

    return response.data;
  } catch (error) {
    handleProjectError(error, 'Failed to create project. Please try again.');
  }
};

export const updateProject = async (projectId, projectData) => {
  if (!projectId) {
    throw new Error('Project ID is required.');
  }
  try {
    const payload = {
      name: projectData.name?.trim(),
      description: projectData.description !== undefined ? projectData.description.trim() : '',
      status: projectData.status || 'ACTIVE',
      startDate: projectData.startDate || '',
      deadline: projectData.deadline || '',
      projectManagerEmail: projectData.projectManagerEmail ? projectData.projectManagerEmail.trim() : '',
      teamLeadEmail: projectData.teamLeadEmail ? projectData.teamLeadEmail.trim() : '',
    };

    if (projectData.workspaceId) {
      payload.workspaceId = projectData.workspaceId;
    }

    const response = await axios.put(
      `${BASE_URL}/projects/${projectId}`,
      payload,
      getAuthHeaders()
    );
    return response.data?.project || response.data?.data || response.data;
  } catch (error) {
    handleProjectError(error, 'Failed to update project.');
  }
};

export const deleteProject = async (projectId) => {
  if (!projectId) {
    throw new Error('Project ID is required.');
  }
  try {
    const response = await axios.delete(
      `${BASE_URL}/projects/${projectId}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    handleProjectError(error, 'Failed to delete project.');
  }
};

export const getProjectMembers = async (projectId) => {
  if (!projectId) return [];
  try {
    const response = await axios.get(
      `${BASE_URL}/projects/${projectId}/members`,
      getAuthHeaders()
    );
    const data = response.data;

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.members)) return data.members;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.data?.members)) return data.data.members;

    return [];
  } catch (error) {
    handleProjectError(error, 'Failed to load project members.');
  }
};

export const addProjectMember = async (projectId, { email, role }) => {
  if (!projectId) {
    throw new Error('Project ID is required.');
  }
  try {
    const payload = {
      email: email?.trim(),
      role: role || 'CONTRIBUTOR',
    };

    const response = await axios.post(
      `${BASE_URL}/projects/${projectId}/members`,
      payload,
      getAuthHeaders()
    );
    return response.data?.member || response.data?.data || response.data;
  } catch (error) {
    handleProjectError(error, 'Failed to add project member.');
  }
};

export const removeProjectMember = async (projectId, memberUserId) => {
  if (!projectId) {
    throw new Error('Project ID is required.');
  }
  if (!memberUserId) {
    throw new Error('Member user ID is required.');
  }
  try {
    const response = await axios.delete(
      `${BASE_URL}/projects/${projectId}/members/${memberUserId}`,
      getAuthHeaders()
    );
    return response.data;
  } catch (error) {
    handleProjectError(error, 'Failed to remove project member.');
  }
};



const projectResourceRequest = async (method, path, payload, config = {}, defaultMessage = 'Project request failed.') => {
  try {
    const response = await axios({ method, url: `${BASE_URL}${path}`, data: payload, ...getAuthHeaders(), ...config });
    return response.data === undefined ? null : response.data;
  } catch (error) { handleProjectError(error, defaultMessage); }
};

export const getProjectMilestones = (projectId) => projectResourceRequest('get', `/projects/${projectId}/milestones`, undefined, {}, 'Failed to load project milestones.');
export const createProjectMilestone = (projectId, payload) => projectResourceRequest('post', `/projects/${projectId}/milestones`, payload, {}, 'Failed to create milestone.');
export const updateProjectMilestone = (milestoneId, payload) => projectResourceRequest('patch', `/milestones/${milestoneId}`, payload, {}, 'Failed to update milestone.');
export const deleteProjectMilestone = (milestoneId) => projectResourceRequest('delete', `/milestones/${milestoneId}`, undefined, {}, 'Failed to delete milestone.');

export const getProjectReleases = (projectId) => projectResourceRequest('get', `/projects/${projectId}/releases`, undefined, {}, 'Failed to load project releases.');
export const createProjectRelease = (projectId, payload) => projectResourceRequest('post', `/projects/${projectId}/releases`, payload, {}, 'Failed to create release.');
export const updateProjectRelease = (releaseId, payload) => projectResourceRequest('patch', `/releases/${releaseId}`, payload, {}, 'Failed to update release.');
export const deleteProjectRelease = (releaseId) => projectResourceRequest('delete', `/releases/${releaseId}`, undefined, {}, 'Failed to delete release.');
export const addIssueToRelease = (releaseId, payload) => projectResourceRequest('post', `/releases/${releaseId}/issues`, payload, {}, 'Failed to add issue to release.');
export const uploadReleaseFile = async (releaseId, file) => {
  const form = new FormData();
  form.append('file', file);
  try {
    const rawToken = localStorage.getItem('frietSyncToken') || '';
    const token = rawToken.startsWith('Bearer ') ? rawToken : (rawToken ? `Bearer ${rawToken}` : '');
    const response = await axios.post(`${BASE_URL}/releases/${releaseId}/file`, form, {
      headers: token ? { Authorization: token } : {},
    });
    return response.data === undefined ? null : response.data;
  } catch (error) {
    handleProjectError(error, 'Failed to upload release file.');
  }
};

export const getProjectSprints = (projectId) => projectResourceRequest('get', `/projects/${projectId}/sprints`, undefined, {}, 'Failed to load project sprints.');
export const createProjectSprint = (projectId, payload) => projectResourceRequest('post', `/projects/${projectId}/sprints`, payload, {}, 'Failed to create sprint.');
export const getSprint = (sprintId) => projectResourceRequest('get', `/sprints/${sprintId}`, undefined, {}, 'Failed to load sprint.');
export const updateSprint = (sprintId, payload) => projectResourceRequest('patch', `/sprints/${sprintId}`, payload, {}, 'Failed to update sprint.');
export const startSprint = (sprintId) => projectResourceRequest('post', `/sprints/${sprintId}/start`, undefined, {}, 'Failed to start sprint.');
export const completeSprint = (sprintId) => projectResourceRequest('post', `/sprints/${sprintId}/complete`, undefined, {}, 'Failed to complete sprint.');
export const deleteSprint = (sprintId) => projectResourceRequest('delete', `/sprints/${sprintId}`, undefined, {}, 'Failed to delete sprint.');
export const assignSprint = (sprintId, payload) => projectResourceRequest('post', `/sprints/${sprintId}/assign`, payload, {}, 'Failed to assign sprint work.');
export const requestSprint = (sprintId, payload) => projectResourceRequest('post', `/sprints/${sprintId}/request`, payload, {}, 'Failed to request sprint work.');
export const getProjectSprintRequests = (projectId) => projectResourceRequest('get', `/projects/${projectId}/sprints-requests`, undefined, {}, 'Failed to load sprint requests.');
export const createSprintRequest = (sprintId, payload) => projectResourceRequest('post', `/sprints/${sprintId}/sprints-requests`, payload, {}, 'Failed to create sprint request.');
export const getProjectSummary = (projectId) => projectResourceRequest('get', `/projects/${projectId}/summary`, undefined, {}, 'Failed to load project summary.');
export const getProjectSummaryPdf = async (projectId) => {
  try {
    const response = await axios.get(`${BASE_URL}/projects/${projectId}/summary/pdf`, {
      ...getAuthHeaders(),
      responseType: 'blob',
    });
    return response.data;
  } catch (error) {
    handleProjectError(error, 'Failed to download project summary PDF.');
  }
};
export const downloadProjectSummaryPdf = getProjectSummaryPdf;
export const getProjectTimeline = (projectId) => projectResourceRequest('get', `/projects/${projectId}/timeline`, undefined, {}, 'Failed to load project timeline.');


export const getGithubConnectUrl = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/integrations/github/connect`, getAuthHeaders());
    const data = response.data;
    const url = data?.authorizationUrl || data?.authUrl || data?.url || data?.redirectUrl || (typeof data === 'string' ? data : null);
    return url;
  } catch (error) {
    handleProjectError(error, 'Failed to initiate GitHub connection.');
  }
};

export const disconnectGithub = async () => {
  try {
    const response = await axios.delete(`${BASE_URL}/integrations/github/disconnect`, getAuthHeaders());
    return response.data;
  } catch (error) {
    handleProjectError(error, 'Failed to disconnect GitHub account.');
  }
};

export const linkProjectRepository = async (projectId, { owner, repository }) => {
  if (!projectId) throw new Error('Project ID is required.');
  if (!owner?.trim() || !repository?.trim()) throw new Error('Both owner and repository are required.');
  return projectResourceRequest(
    'put',
    `/integrations/github/projects/${projectId}/repository`,
    { owner: owner.trim(), repository: repository.trim() },
    {},
    'Failed to link GitHub repository.'
  );
};

export const unlinkProjectRepository = async (projectId) => {
  if (!projectId) throw new Error('Project ID is required.');
  return projectResourceRequest(
    'delete',
    `/integrations/github/projects/${projectId}/repository`,
    undefined,
    {},
    'Failed to unlink GitHub repository.'
  );
};

export const getProjectContributions = async (projectId) => {
  if (!projectId) throw new Error('Project ID is required.');
  return projectResourceRequest(
    'get',
    `/integrations/github/projects/${projectId}/contributions`,
    undefined,
    {},
    'Failed to load GitHub contributions.'
  );
};

export { getFriendlyErrorMessage };
