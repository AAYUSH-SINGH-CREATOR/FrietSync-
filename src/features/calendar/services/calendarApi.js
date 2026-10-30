import axios from 'axios';
import { getFriendlyErrorMessage } from '../../../utils/errorHandler';

const BASE_URL = import.meta.env.VITE_BASE_URL;

const getAuthHeaders = (extraParams = {}) => {
  const rawToken =
    localStorage.getItem('frietSyncToken') ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('token') ||
    '';
  const token = rawToken.replace(/^Bearer\s+/i, '').trim();

  return {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    params: extraParams,
  };
};

const handleCalendarError = (error, defaultMessage) => {
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





export const getMyMeetings = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/meetings`, getAuthHeaders());
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.meetings)) return data.meetings;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.data?.meetings)) return data.data.meetings;
    return [];
  } catch (error) {
    handleCalendarError(error, 'Failed to load user meetings.');
  }
};

export const getProjectMeetings = async (projectId) => {
  if (!projectId) return [];
  try {
    const response = await axios.get(`${BASE_URL}/projects/${projectId}/meetings`, getAuthHeaders());
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.meetings)) return data.meetings;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.data?.meetings)) return data.data.meetings;
    return [];
  } catch (error) {
    handleCalendarError(error, `Failed to load meetings for project ${projectId}.`);
  }
};

export const createMeeting = async (projectId, payload) => {
  if (!projectId) throw new Error('Project ID is required to schedule a meeting.');
  try {
    const response = await axios.post(
      `${BASE_URL}/projects/${projectId}/meetings`,
      payload,
      getAuthHeaders()
    );
    return response.data?.meeting || response.data?.data || response.data;
  } catch (error) {
    handleCalendarError(error, 'Failed to schedule meeting. Please check required fields.');
  }
};

export const updateMeeting = async (meetingId, payload) => {
  if (!meetingId) throw new Error('Meeting ID is required.');
  try {
    const response = await axios.patch(
      `${BASE_URL}/meetings/${meetingId}`,
      payload,
      getAuthHeaders()
    );
    return response.data?.meeting || response.data?.data || response.data;
  } catch (error) {
    handleCalendarError(error, 'Failed to update meeting details.');
  }
};

export const deleteMeeting = async (meetingId) => {
  if (!meetingId) throw new Error('Meeting ID is required.');
  try {
    const response = await axios.delete(`${BASE_URL}/meetings/${meetingId}`, getAuthHeaders());
    return response.data;
  } catch (error) {
    handleCalendarError(error, 'Failed to cancel/delete meeting.');
  }
};





export const getProjectCalendar = async (projectId) => {
  if (!projectId) return [];
  try {
    const response = await axios.get(`${BASE_URL}/projects/${projectId}/calendar`, getAuthHeaders());
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.events)) return data.events;
    if (Array.isArray(data?.data?.events)) return data.data.events;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  } catch {
    
    return [];
  }
};

export const getProjectTimeline = async (projectId) => {
  if (!projectId) return [];
  try {
    const response = await axios.get(`${BASE_URL}/projects/${projectId}/timeline`, getAuthHeaders());
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.timeline)) return data.timeline;
    if (Array.isArray(data?.events)) return data.events;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  } catch {
    return [];
  }
};





export const getGoogleConnectUrl = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/integrations/google/connect`, getAuthHeaders());
    const data = response.data;
    const url = data?.authorizationUrl || data?.authUrl || data?.url || data?.redirectUrl || (typeof data === 'string' ? data : null);
    return url;
  } catch (error) {
    handleCalendarError(error, 'Failed to initiate Google Calendar connection.');
  }
};

export const disconnectGoogleCalendar = async () => {
  try {
    const response = await axios.delete(`${BASE_URL}/integrations/google/disconnect`, getAuthHeaders());
    return response.data;
  } catch (error) {
    handleCalendarError(error, 'Failed to disconnect Google Calendar.');
  }
};





export const parseLocalDate = (dateInput) => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    const [year, month, day] = dateInput.trim().split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const d = new Date(dateInput);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const isSameDay = (date1, date2) => {
  if (!date1 || !date2) return false;
  const d1 = date1 instanceof Date ? date1 : new Date(date1);
  const d2 = date2 instanceof Date ? date2 : new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

export const isEventInDay = (event, dayDate) => {
  if (!event || !dayDate) return false;
  const targetDay = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0);
  const nextDay = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate() + 1, 0, 0, 0);
  return event.start < nextDay && event.end >= targetDay;
};

export const formatTime = (date) => {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase();
};

export const normalizeMeetingEvent = (m, projectName = '') => {
  if (!m) return null;
  const id = m.id || m._id || m.meetingId;
  const startAt = m.startAt || m.startDate || m.startTime || m.start;
  const endAt = m.endAt || m.endDate || m.endTime || m.end;
  if (!startAt) return null;

  const startDate = new Date(startAt);
  if (Number.isNaN(startDate.getTime())) return null;
  let endDate = endAt ? new Date(endAt) : null;
  if (!endDate || Number.isNaN(endDate.getTime())) {
    endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  }

  return {
    id: `meeting-${id}`,
    rawId: id,
    title: m.title || 'Team Meeting',
    description: m.agenda || m.description || '',
    sourceType: 'meeting',
    projectId: m.projectId || m.project?.id || m.project?._id || '',
    projectName: m.projectName || m.project?.name || projectName,
    start: startDate,
    end: endDate,
    isAllDay: Boolean(m.isAllDay),
    status: m.status || 'SCHEDULED',
    attendees: Array.isArray(m.attendees) ? m.attendees : (Array.isArray(m.attendeeIds) ? m.attendeeIds : []),
    rawItem: m,
  };
};

export const normalizeIssueEvent = (issue, projectName = '') => {
  if (!issue) return null;
  const id = issue.id || issue._id || issue.issueId;
  const dateStr = issue.dueDate || issue.deadline || issue.targetDate;
  if (!dateStr) return null;

  const date = parseLocalDate(dateStr);
  if (!date) return null;

  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

  return {
    id: `issue-${id}`,
    rawId: id,
    title: issue.title || `Issue #${id}`,
    description: issue.description || '',
    sourceType: 'issue',
    projectId: issue.projectId || issue.project?.id || issue.project?._id || '',
    projectName: issue.projectName || issue.project?.name || projectName,
    start,
    end,
    isAllDay: true,
    status: issue.status || 'TODO',
    priority: issue.priority || 'MEDIUM',
    rawItem: issue,
  };
};

export const normalizeSprintEvent = (sprint, projectName = '') => {
  if (!sprint) return null;
  const id = sprint.id || sprint._id || sprint.sprintId;
  const startStr = sprint.startDate || sprint.startAt;
  const endStr = sprint.endDate || sprint.endAt;
  if (!startStr && !endStr) return null;

  const startDate = parseLocalDate(startStr) || parseLocalDate(endStr);
  const endDate = parseLocalDate(endStr) || parseLocalDate(startStr);
  if (!startDate || !endDate) return null;

  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0);
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59);

  return {
    id: `sprint-${id}`,
    rawId: id,
    title: sprint.name || 'Sprint',
    description: sprint.goal || '',
    sourceType: 'sprint',
    projectId: sprint.projectId || sprint.project?.id || sprint.project?._id || '',
    projectName: sprint.projectName || sprint.project?.name || projectName,
    start,
    end,
    isAllDay: true,
    status: sprint.status || 'ACTIVE',
    rawItem: sprint,
  };
};

export const normalizeMilestoneEvent = (milestone, projectName = '') => {
  if (!milestone) return null;
  const id = milestone.id || milestone._id || milestone.milestoneId;
  const dateStr = milestone.dueDate || milestone.targetDate || milestone.deadline || milestone.date;
  if (!dateStr) return null;

  const date = parseLocalDate(dateStr);
  if (!date) return null;

  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

  return {
    id: `milestone-${id}`,
    rawId: id,
    title: milestone.name || milestone.title || 'Milestone',
    description: milestone.description || '',
    sourceType: 'milestone',
    projectId: milestone.projectId || milestone.project?.id || milestone.project?._id || '',
    projectName: milestone.projectName || milestone.project?.name || projectName,
    start,
    end,
    isAllDay: true,
    status: milestone.status || 'PLANNED',
    rawItem: milestone,
  };
};

export const normalizeGenericCalendarEvent = (item, projectName = '') => {
  if (!item) return null;
  const id = item.id || item._id;
  const type = String(item.type || item.eventType || 'event').toLowerCase();
  const startStr = item.startAt || item.startDate || item.start || item.dueDate;
  const endStr = item.endAt || item.endDate || item.end || startStr;
  if (!startStr) return null;

  const start = parseLocalDate(startStr);
  const end = parseLocalDate(endStr) || start;
  if (!start) return null;

  const isSprint = type.includes('sprint');
  const isMilestone = type.includes('milestone');
  const isIssue = type.includes('issue') || type.includes('task');

  let sourceType = 'meeting';
  if (isSprint) sourceType = 'sprint';
  else if (isMilestone) sourceType = 'milestone';
  else if (isIssue) sourceType = 'issue';

  return {
    id: `${sourceType}-${id}`,
    rawId: id,
    title: item.title || item.name || 'Event',
    description: item.description || item.agenda || '',
    sourceType,
    projectId: item.projectId || item.project?.id || '',
    projectName: item.projectName || item.project?.name || projectName,
    start,
    end,
    isAllDay: isSprint || isMilestone || isIssue || Boolean(item.isAllDay),
    status: item.status || 'ACTIVE',
    rawItem: item,
  };
};

export { getFriendlyErrorMessage };
