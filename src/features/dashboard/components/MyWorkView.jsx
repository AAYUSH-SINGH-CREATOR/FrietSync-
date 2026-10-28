import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  FiActivity,
  FiAlertCircle,
  FiCheckSquare,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiFolder,
  FiInbox,
  FiPlus,
  FiRefreshCw,
  FiSearch,
} from 'react-icons/fi';
import { getProjectMembers, getMyProjects } from '../../projects/services/projectApi';
import { getProjectIssues, requestIssueAssignment } from '../../issues/services/issueApi';
import { getProjectSprints, requestSprintAssignment } from '../../sprints/services/sprintsApi';
import SprintDetailsView from '../../sprints/components/SprintDetailsView';
import IssueDetailsModal from '../../issues/components/IssueDetailsModal';
import CreateIssueModal from '../../issues/components/CreateIssueModal';
import CreateEditSprintModal from '../../sprints/components/CreateEditSprintModal';
import { getFriendlyErrorMessage } from '../../../utils/errorHandler';
import EmptyState from '../../../components/ui/EmptyState';
import esmywork from '../../../assets/esmywork.png';
import LoadingScreen from '../../../components/ui/LoadingScreen';

const PAGE_SIZE = 10;
const normalize = (value) => String(value || '').toUpperCase().replace(/[\s-]+/g, '_');
const getId = (item) => item?.id || item?._id || item?.issueId || item?.sprintId || item?.projectId;

const getList = (value, keys = []) => {
  const candidates = [value, value?.data, value?.result];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    if (!candidate || typeof candidate !== 'object') continue;
    for (const key of keys) {
      if (Array.isArray(candidate[key])) return candidate[key];
    }
  }
  return [];
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getInitials = (name = '') => {
  const parts = name.trim().split(/[\s@._-]+/).filter(Boolean);
  if (!parts.length) return 'U';
  return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const avatarColors = [
  'bg-pink-600', 'bg-blue-600', 'bg-purple-600', 'bg-emerald-600',
  'bg-sky-600', 'bg-amber-600', 'bg-rose-600', 'bg-teal-600',
];

const getAvatarColor = (name = '', index = 0) => {
  const hash = [...(name || 'User')].reduce((total, char) => total + char.charCodeAt(0), index);
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

const getStatusPresentation = (status, type) => {
  const value = normalize(status) || (type === 'sprint' ? 'PLANNED' : 'OPEN');
  const presentations = {
    OPEN: { label: 'Open', className: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-[#3a3a3a] dark:bg-[#242424] dark:text-[#e0e0e0]' },
    PLANNED: { label: 'Planned', className: 'border-purple-500/30 bg-purple-500/15 text-purple-700 dark:text-purple-300' },
    IN_PROGRESS: { label: type === 'sprint' ? 'Active' : 'In progress', className: 'border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-300' },
    ACTIVE: { label: 'Active', className: 'border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-300' },
    RESOLVED: { label: 'Resolved', className: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
    CLOSED: { label: 'Closed', className: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
    COMPLETED: { label: 'Completed', className: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
    REOPENED: { label: 'Reopened', className: 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  };
  return presentations[value] || presentations[type === 'sprint' ? 'PLANNED' : 'OPEN'];
};

const readProgress = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const progress = Number(value);
  return Number.isFinite(progress) && progress >= 0 && progress <= 100 ? progress : null;
};

const isCompleted = (status) => ['RESOLVED', 'CLOSED', 'COMPLETED'].includes(normalize(status));
const isActive = (status) => ['IN_PROGRESS', 'ACTIVE'].includes(normalize(status));

const isOverdue = (item) => {
  if (isCompleted(item.status)) return false;
  const dueDate = item.endDate || item.dueDate;
  if (!dueDate) return false;
  const date = new Date(dueDate);
  const today = new Date();
  if (Number.isNaN(date.getTime())) return false;
  date.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return date < today;
};

const getUserIds = (person) => [person?.id, person?._id, person?.userId].filter(Boolean).map(String);

const isIssueAssignedToUser = (issue, userId, email) => {
  const assignees = [
    ...(Array.isArray(issue?.assigneeIds) ? issue.assigneeIds : []),
    ...(Array.isArray(issue?.assignedUserIds) ? issue.assignedUserIds : []),
    ...(Array.isArray(issue?.assignees) ? issue.assignees : []),
    ...(Array.isArray(issue?.assignedTo) ? issue.assignedTo : []),
    issue?.assignee,
    issue?.assignedTo,
    { id: issue?.assigneeId },
    { id: issue?.assignedToId },
  ].filter(Boolean);
  if (userId && assignees.some((person) => getUserIds(typeof person === 'object' ? person : { id: person }).includes(userId))) return true;
  return Boolean(email && assignees.some((person) => String(person?.email || '').toLowerCase().trim() === email)) ||
    Boolean(email && [issue?.assigneeEmail].some((value) => String(value || '').toLowerCase().trim() === email));
};

const isSprintAssignedToUser = (sprint, userId, email, assignedIssueIds) => {
  const assignees = [
    sprint?.contributor,
    sprint?.assignedTo,
    ...(Array.isArray(sprint?.assignees) ? sprint.assignees : []),
    { id: sprint?.contributorId },
    { id: sprint?.assigneeId },
    { id: sprint?.assignedContributorId },
    { id: sprint?.userId },
    { id: sprint?.createdById },
  ].filter(Boolean);
  if (userId && assignees.some((person) => getUserIds(person).includes(userId))) return true;
  if (email && assignees.some((person) => String(person?.email || '').toLowerCase().trim() === email)) return true;
  if (email && [sprint?.contributorEmail, sprint?.assigneeEmail].some((value) => String(value || '').toLowerCase().trim() === email)) return true;

  const sprintIssues = Array.isArray(sprint?.issues) ? sprint.issues : [];
  return sprintIssues.some((issue) => isIssueAssignedToUser(issue, userId, email)) ||
    (Array.isArray(sprint?.issueIds) && sprint.issueIds.some((id) => assignedIssueIds.has(String(id))));
};

const FilterSelect = ({ label, value, options, onChange }) => (
  <label className="relative min-w-[120px] flex-1 sm:flex-none">
    <span className="sr-only">Filter by {label.toLowerCase()}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white pl-3.5 pr-8 text-xs font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-sky-400 dark:border-[#303035] dark:bg-[#1a1a1d] dark:text-white dark:hover:border-[#555] shadow-2xs"
    >
      <option value="all">{label}</option>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    <FiChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#888]" />
  </label>
);

const SummaryCard = ({ icon: Icon, label, value, hint, color }) => (
  <div className="flex items-center gap-4 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-slate-300 dark:border-[#2d2d34] dark:bg-[#171717] dark:hover:border-[#3b3b44]">
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${color}`}><Icon size={20} /></div>
    <div className="min-w-0">
      <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 text-2xl font-bold leading-tight text-slate-900 dark:text-white">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>
    </div>
  </div>
);

const WorkTable = ({
  tasks, loading, page, totalPages, total, onChangePage, onOpenTask, emptyContent,
}) => {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs dark:border-[#2b2b30] dark:bg-[#1f1f1f]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[950px] border-collapse text-left text-xs">
          <thead>
            <tr className="h-11 border-b border-slate-200 bg-slate-100/70 text-[11px] font-semibold text-slate-700 dark:border-[#2b2b30] dark:bg-[#1b1b1b] dark:text-[#aaa]">
              {['Task', 'Issue', 'Start date', 'End date', 'Status', 'Progress', 'Assignee', 'Velocity'].map((heading) => (
                <th key={heading} className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-500 dark:text-[#888]">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#26262b]">
            {loading ? Array.from({ length: 6 }, (_, index) => (
              <tr key={index} className="h-14 animate-pulse"><td colSpan="8" className="px-4"><div className="h-4 rounded bg-slate-100 dark:bg-[#25252a]" /></td></tr>
            )) : tasks.length === 0 ? (
              <tr><td colSpan="8" className="py-16 text-center text-slate-400 dark:text-[#777]">
                <FiInbox size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                {emptyContent || (
                  <>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No work items found</p>
                    <p className="mt-1 text-xs">Try adjusting your filters, or check back when work is assigned to you.</p>
                  </>
                )}
              </td></tr>
            ) : tasks.map((task, index) => (
              <tr key={task.id} onClick={() => onOpenTask(task)} className="group h-14 cursor-pointer transition hover:bg-slate-50/80 dark:hover:bg-[#27272c]">
                <td className="px-4 py-2.5">
                  <span className="block font-mono text-xs font-bold text-sky-600 dark:text-sky-400">{task.key}</span>
                  <span className="block max-w-[180px] truncate text-xs font-medium text-slate-800 dark:text-[#eee]">{task.taskName}</span>
                </td>
                <td className="max-w-[220px] truncate px-4 py-2.5 text-slate-700 dark:text-[#bbb]" title={task.issueName}>{task.issueName}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-600 dark:text-[#aaa]">{formatDate(task.startDate)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-600 dark:text-[#aaa]">{formatDate(task.endDate)}</td>
                <td className="px-4 py-2.5"><span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${task.statusPresentation.className}`}>{task.statusPresentation.label}</span></td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    {task.progress === null ? (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">—</span>
                    ) : (
                      <>
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-[#303035] sm:w-20">
                          <div className={`h-full rounded-full transition-all ${task.progress >= 100 ? 'bg-emerald-500' : task.progress > 0 ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-700'}`} style={{ width: `${task.progress}%` }} />
                        </div>
                        <span className="w-8 text-[11px] font-bold text-slate-700 dark:text-[#ccc]">{task.progress}%</span>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span title={task.assigneeName} className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-2xs ${getAvatarColor(task.assigneeName, index)}`}>{task.assigneeInitials}</span>
                    {task.otherAssigneesCount > 0 && <span className="text-[10px] font-bold text-slate-400 dark:text-[#888]">+{task.otherAssigneesCount}</span>}
                  </div>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs font-semibold text-slate-700 dark:text-[#ddd]">{task.velocity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-[#2b2b30] dark:text-[#999]">
        <span>Showing {total ? page * PAGE_SIZE + 1 : 0}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total} tasks</span>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => onChangePage(page - 1)} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#333] dark:text-slate-300 dark:hover:bg-[#26262a]"><FiChevronLeft size={14} /></button>
          <span className="px-2 font-semibold text-slate-700 dark:text-slate-300">{page + 1} / {totalPages}</span>
          <button type="button" aria-label="Next page" disabled={page >= totalPages - 1} onClick={() => onChangePage(page + 1)} className="rounded-lg border border-slate-200 p-1.5 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#333] dark:text-slate-300 dark:hover:bg-[#26262a]"><FiChevronRight size={14} /></button>
        </div>
      </footer>
    </div>
  );
};

const MyWorkView = () => {
  const { currentUserProfile } = useOutletContext() || {};
  const [projects, setProjects] = useState([]);
  const [projectMembers, setProjectMembers] = useState({});
  const [sprints, setSprints] = useState([]);
  const [issues, setIssues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [isCreateIssueOpen, setIsCreateIssueOpen] = useState(false);
  const [isCreateSprintOpen, setIsCreateSprintOpen] = useState(false);
  const [requestChoice, setRequestChoice] = useState('');
  const [assignmentRequestStates, setAssignmentRequestStates] = useState({});
  const [assignmentRequestFeedback, setAssignmentRequestFeedback] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('due-asc');
  const [page, setPage] = useState(0);

  const userId = String(currentUserProfile?.id || currentUserProfile?._id || currentUserProfile?.userId || currentUserProfile?.user?.id || currentUserProfile?.user?._id || '');
  const userEmail = String(currentUserProfile?.email || currentUserProfile?.user?.email || '').toLowerCase().trim();
  const globalRole = normalize(currentUserProfile?.role || currentUserProfile?.user?.role);
  const globalManager = ['ADMIN', 'WORKSPACE_ADMIN', 'OWNER', 'PROJECT_MANAGER', 'TEAM_LEAD', 'LEAD'].includes(globalRole);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setError('');
    setRefreshKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let isCurrent = true;

    const loadWork = async () => {
      try {
        const projectResponse = await getMyProjects();
        if (!isCurrent) return;
        const projectList = getList(projectResponse, ['projects', 'items', 'content']);
        setProjects(projectList);

        if (!projectList.length) {
          setProjectMembers({});
          setSprints([]);
          setIssues([]);
          setIsLoading(false);
          return;
        }

        const projectResults = await Promise.allSettled(projectList.map(async (project) => {
          const projectId = String(getId(project) || '');
          const [memberResult, sprintResult, issueResult] = await Promise.allSettled([
            getProjectMembers(projectId),
            getProjectSprints(projectId),
            getProjectIssues(projectId, { page: 0, size: 100 }),
          ]);
          const members = memberResult.status === 'fulfilled' ? getList(memberResult.value, ['members', 'items', 'content']) : [];
          const projectSprints = sprintResult.status === 'fulfilled' ? getList(sprintResult.value, ['sprints', 'items', 'content']) : [];
          const projectIssues = issueResult.status === 'fulfilled' ? getList(issueResult.value, ['issues', 'items', 'content']) : [];
          return {
            id: projectId,
            members,
            sprints: projectSprints.map((sprint) => ({ ...sprint, projectId, projectName: project.name || 'Project' })),
            issues: projectIssues.map((issue) => ({ ...issue, projectId, projectName: project.name || 'Project' })),
          };
        }));

        if (!isCurrent) return;
        const memberMap = {};
        const allSprints = [];
        const allIssues = [];
        projectResults.forEach((result) => {
          if (result.status !== 'fulfilled') return;
          memberMap[result.value.id] = result.value.members;
          allSprints.push(...result.value.sprints);
          allIssues.push(...result.value.issues);
        });
        setProjectMembers(memberMap);
        setSprints(allSprints);
        setIssues(allIssues);
      } catch (loadError) {
        if (isCurrent) setError(getFriendlyErrorMessage(loadError, 'project'));
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    loadWork();
    return () => { isCurrent = false; };
  }, [refreshKey]);

  const getProjectRole = useCallback((projectId) => {
    const project = projects.find((item) => String(getId(item)) === String(projectId));
    const managerId = String(project?.projectManagerId || project?.projectManager?.id || project?.projectManager?._id || '');
    const leadId = String(project?.teamLeadId || project?.teamLead?.id || project?.teamLead?._id || '');
    if (userId && managerId === userId) return 'PROJECT_MANAGER';
    if (userId && leadId === userId) return 'TEAM_LEAD';
    const membership = (projectMembers[String(projectId)] || []).find((member) => {
      const memberIds = [member?.userId, member?.id, member?._id, member?.user?.id, member?.user?._id].filter(Boolean).map(String);
      const memberEmail = String(member?.email || member?.user?.email || '').toLowerCase();
      return (userId && memberIds.includes(userId)) || (userEmail && memberEmail === userEmail);
    });
    return normalize(membership?.role || membership?.projectRole || membership?.user?.role);
  }, [projects, projectMembers, userId, userEmail]);

  const canManageProject = useCallback((projectId) => {
    if (globalManager) return true;
    return ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'LEAD'].includes(getProjectRole(projectId));
  }, [globalManager, getProjectRole]);
  const emptyActionProjectId = projectFilter !== 'all'
    ? projectFilter
    : String(getId(projects[0]) || '');
  const selectedProjectRole = emptyActionProjectId ? getProjectRole(emptyActionProjectId) : '';
  const canManageSelectedProject = Boolean(emptyActionProjectId) && canManageProject(emptyActionProjectId);
  const canCreateIssueInSelectedProject = projectFilter !== 'all' && (
    canManageSelectedProject || selectedProjectRole === 'REPORTER'
  ) || (projectFilter === 'all' && canManageSelectedProject);
  const canCreateSprintInSelectedProject = canManageSelectedProject;
  const isContributor = globalRole === 'CONTRIBUTOR';
  const requestProjectIds = new Set(projectFilter === 'all'
    ? projects
      .filter((project) => !isContributor || getProjectRole(getId(project)) === 'CONTRIBUTOR')
      .map((project) => String(getId(project) || '')).filter(Boolean)
    : [projectFilter]);
  const requestableIssues = issues.filter((issue) => (
    requestProjectIds.has(String(issue.projectId)) &&
    !['RESOLVED', 'CLOSED'].includes(normalize(issue.status)) &&
    getId(issue)
  ));
  const requestableSprints = sprints.filter((sprint) => (
    requestProjectIds.has(String(sprint.projectId)) &&
    normalize(sprint.status || sprint.state) !== 'COMPLETED' &&
    getId(sprint)
  ));

  const handleAssignmentRequest = async (type, item) => {
    const id = String(getId(item) || '');
    if (!id) return;
    const requestKey = `${type}:${id}`;
    if (assignmentRequestStates[requestKey] === 'pending' || assignmentRequestStates[requestKey] === 'sent') return;
    setAssignmentRequestStates((current) => ({ ...current, [requestKey]: 'pending' }));
    setAssignmentRequestFeedback(null);
    try {
      if (type === 'issue') await requestIssueAssignment(id);
      else await requestSprintAssignment(id);
      setAssignmentRequestStates((current) => ({ ...current, [requestKey]: 'sent' }));
      setAssignmentRequestFeedback({ type: 'success', message: 'Assignment request sent.' });
    } catch (requestError) {
      setAssignmentRequestStates((current) => ({ ...current, [requestKey]: 'idle' }));
      setAssignmentRequestFeedback({
        type: 'error',
        message: getFriendlyErrorMessage(
          requestError,
          type === 'sprint' ? 'sprint-assignment' : 'issue-assignment'
        ),
      });
    }
  };

  const assignedIssueIds = useMemo(() => new Set(
    issues.filter((issue) => isIssueAssignedToUser(issue, userId, userEmail)).map((issue) => String(getId(issue)))
  ), [issues, userId, userEmail]);

  const visibleSprints = useMemo(() => sprints.filter((sprint) => (
    canManageProject(sprint.projectId) || isSprintAssignedToUser(sprint, userId, userEmail, assignedIssueIds)
  )), [sprints, canManageProject, userId, userEmail, assignedIssueIds]);

  const visibleIssues = useMemo(() => issues.filter((issue) => (
    canManageProject(issue.projectId) || isIssueAssignedToUser(issue, userId, userEmail)
  )), [issues, canManageProject, userId, userEmail]);

  const tasks = useMemo(() => {
    const sprintTasks = visibleSprints.map((sprint, index) => {
      const id = String(getId(sprint) || `sprint-${index}`);
      const assigneeName = sprint.contributorName || sprint.contributor?.name || sprint.assigneeName || sprint.assignedTo?.name || 'Unassigned';
      const status = sprint.status || sprint.state || 'PLANNED';
      const statusPresentation = getStatusPresentation(status, 'sprint');
      return {
        id: `sprint-${id}`,
        rawId: id,
        type: 'sprint',
        raw: sprint,
        key: sprint.key || `SPR-${sprint.sprintNumber || sprint.number || id.slice(-2)}`,
        taskName: sprint.name || 'Untitled sprint',
        issueName: sprint.goal || sprint.description || 'No sprint goal',
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        status,
        statusPresentation,
        progress: readProgress(sprint.progress),
        priority: 'MEDIUM',
        assigneeName,
        assigneeInitials: assigneeName === 'Unassigned' ? '—' : getInitials(assigneeName),
        otherAssigneesCount: Array.isArray(sprint.assignees) ? Math.max(0, sprint.assignees.length - 1) : 0,
        velocity: sprint.velocity ?? sprint.storyPoints ?? sprint.estimatedPoints ?? sprint.issuesCount ?? '—',
        projectId: sprint.projectId,
        projectName: sprint.projectName || 'Project',
      };
    });

    const issueTasks = visibleIssues.map((issue, index) => {
      const id = String(getId(issue) || `issue-${index}`);
      const assignedNames = Array.isArray(issue.assignees) ? issue.assignees : Array.isArray(issue.assignedTo) ? issue.assignedTo : [];
      const assigneeName = assignedNames[0]?.name || issue.assigneeName || issue.assignedTo?.name || issue.assignee?.name || issue.assigneeEmail || 'Unassigned';
      const status = issue.status || 'OPEN';
      const statusPresentation = getStatusPresentation(status, 'issue');
      return {
        id: `issue-${id}`,
        rawId: id,
        type: 'issue',
        raw: issue,
        key: issue.key || (issue.issueNumber ? `ISS-${issue.issueNumber}` : `ISS-${id.slice(-2)}`),
        taskName: issue.sprintName || issue.sprint?.name || issue.type || 'Issue',
        issueName: issue.title || issue.summary || issue.name || 'Untitled issue',
        startDate: issue.startDate || issue.createdAt,
        endDate: issue.dueDate || issue.deadline,
        status,
        statusPresentation,
        progress: readProgress(issue.progress),
        priority: normalize(issue.priority || 'MEDIUM'),
        assigneeName,
        assigneeInitials: assigneeName === 'Unassigned' ? '—' : getInitials(assigneeName),
        otherAssigneesCount: Math.max(0, assignedNames.length - 1),
        velocity: issue.storyPoints ?? issue.estimate ?? issue.estimatedHours ?? '—',
        projectId: issue.projectId,
        projectName: issue.projectName || 'Project',
      };
    });
    return [...sprintTasks, ...issueTasks];
  }, [visibleSprints, visibleIssues]);

  const metrics = useMemo(() => ({
    total: tasks.length,
    active: tasks.filter((task) => isActive(task.status)).length,
    overdue: tasks.filter(isOverdue).length,
    completed: tasks.filter((task) => isCompleted(task.status)).length,
  }), [tasks]);

  const projectOptions = useMemo(() => projects.map((project) => ({ value: String(getId(project)), label: project.name || 'Project' })), [projects]);
  const assigneeOptions = useMemo(() => {
    const names = new Map();
    tasks.forEach((task) => {
      if (task.assigneeName !== 'Unassigned') names.set(task.assigneeName.toLowerCase(), task.assigneeName);
    });
    return [...names.values()].map((name) => ({ value: name, label: name }));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return tasks.filter((task) => {
      if (typeFilter !== 'all' && task.type !== typeFilter) return false;
      if (projectFilter !== 'all' && String(task.projectId) !== projectFilter) return false;
      if (statusFilter !== 'all' && normalize(task.status) !== statusFilter) return false;
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
      if (assigneeFilter !== 'all' && !task.assigneeName.toLowerCase().includes(assigneeFilter.toLowerCase())) return false;
      if (!query) return true;
      return [task.key, task.taskName, task.issueName, task.projectName, task.assigneeName].some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [tasks, typeFilter, projectFilter, statusFilter, priorityFilter, assigneeFilter, searchQuery]);

  const sortedTasks = useMemo(() => {
    const dateValue = (value, missing) => {
      if (!value) return missing;
      const parsed = new Date(value).getTime();
      return Number.isNaN(parsed) ? missing : parsed;
    };
    return [...filteredTasks].sort((a, b) => {
      if (sortOrder === 'due-asc') return dateValue(a.endDate, Infinity) - dateValue(b.endDate, Infinity);
      if (sortOrder === 'due-desc') return dateValue(b.endDate, -Infinity) - dateValue(a.endDate, -Infinity);
      if (sortOrder === 'start-asc') return dateValue(a.startDate, Infinity) - dateValue(b.startDate, Infinity);
      if (sortOrder === 'name-asc') return a.taskName.localeCompare(b.taskName);
      if (sortOrder === 'progress-desc') return (b.progress ?? -1) - (a.progress ?? -1);
      return 0;
    });
  }, [filteredTasks, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedTasks.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageTasks = useMemo(() => sortedTasks.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE), [sortedTasks, currentPage]);
  const scopedProjectTasks = projectFilter === 'all'
    ? tasks
    : tasks.filter((task) => String(task.projectId) === projectFilter);
  const scopedTasks = typeFilter === 'all'
    ? scopedProjectTasks
    : scopedProjectTasks.filter((task) => task.type === typeFilter);
  const emptyContent = (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 px-4">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {scopedTasks.length > 0
          ? 'No work items match your current filters.'
          : typeFilter === 'sprint'
          ? `No sprints in ${projectFilter === 'all' ? 'your projects' : projects.find((project) => String(getId(project)) === projectFilter)?.name || 'this project'} yet.`
          : typeFilter === 'issue'
          ? `No issues in ${projectFilter === 'all' ? 'your projects' : projects.find((project) => String(getId(project)) === projectFilter)?.name || 'this project'} yet.`
          : projectFilter === 'all'
          ? 'No work items are available yet.'
          : `No work in ${projects.find((project) => String(getId(project)) === projectFilter)?.name || 'this project'} yet.`}
      </p>
      {assignmentRequestFeedback && (
        <p role="status" className={`text-xs font-medium ${assignmentRequestFeedback.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
          {assignmentRequestFeedback.message}
        </p>
      )}
      {scopedTasks.length > 0 ? (
        <button type="button" onClick={() => {
          setTypeFilter('all');
          setSearchQuery('');
          setStatusFilter('all');
          setPriorityFilter('all');
          setProjectFilter('all');
          setAssigneeFilter('all');
          setSortOrder('due-asc');
          setPage(0);
        }} className="inline-flex h-9 items-center gap-2 rounded-xl bg-sky-600 px-4 text-xs font-semibold text-white transition hover:bg-sky-700">
          <FiRefreshCw size={14} /> Reset filters
        </button>
      ) : canManageSelectedProject ? (
        <div className="flex flex-wrap justify-center gap-2">
          {typeFilter !== 'sprint' && canCreateIssueInSelectedProject && (
            <button type="button" onClick={() => setIsCreateIssueOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-sky-600 px-4 text-xs font-semibold text-white transition hover:bg-sky-700">
              <FiPlus size={14} /> Create Issue
            </button>
          )}
          {typeFilter !== 'issue' && canCreateSprintInSelectedProject && (
            <button type="button" onClick={() => setIsCreateSprintOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-xl bg-sky-600 px-4 text-xs font-semibold text-white transition hover:bg-sky-700">
              <FiPlus size={14} /> Create Sprint
            </button>
          )}
        </div>
      ) : isContributor ? (
        <div className="flex flex-wrap justify-center gap-2">
          {typeFilter !== 'sprint' && <button type="button" onClick={() => setRequestChoice(requestChoice === 'issue' ? '' : 'issue')} disabled={!requestableIssues.length} className="inline-flex h-9 items-center gap-2 rounded-xl bg-sky-600 px-4 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50">
            <FiInbox size={14} /> Request Issue Assignment
          </button>}
          {typeFilter !== 'issue' && <button type="button" onClick={() => setRequestChoice(requestChoice === 'sprint' ? '' : 'sprint')} disabled={!requestableSprints.length} className="inline-flex h-9 items-center gap-2 rounded-xl bg-sky-600 px-4 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50">
            <FiInbox size={14} /> Request Sprint Assignment
          </button>}
        </div>
      ) : null}
      {isContributor && requestChoice && (
        <div className="max-h-56 w-full space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3 text-left dark:border-[#35353d] dark:bg-[#24242a]">
          <p className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-200">
            {requestChoice === 'issue' ? 'Select an issue to request' : 'Select a sprint to request'}
          </p>
          {(requestChoice === 'issue' ? requestableIssues : requestableSprints).map((item) => {
            const id = String(getId(item));
            const requestKey = `${requestChoice}:${id}`;
            const state = assignmentRequestStates[requestKey];
            const projectName = item.projectName || projects.find((project) => String(getId(project)) === String(item.projectId))?.name;
            return (
              <div key={id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 dark:bg-[#1b1b1f]">
                <span className="min-w-0 truncate text-xs text-slate-700 dark:text-slate-200">
                  {item.title || item.name || 'Untitled'}
                  {projectFilter === 'all' && <span className="ml-1 text-slate-400">· {projectName || 'Project'}</span>}
                </span>
                <button type="button" onClick={() => handleAssignmentRequest(requestChoice, item)} disabled={state === 'pending' || state === 'sent'} className="shrink-0 rounded-lg bg-sky-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {state === 'pending' ? 'Sending…' : state === 'sent' ? 'Requested' : 'Request'}
                </button>
              </div>
            );
          })}
        </div>
      )}
      {isContributor && (typeFilter === 'all' ? !requestableIssues.length && !requestableSprints.length : typeFilter === 'issue' ? !requestableIssues.length : !requestableSprints.length) && scopedTasks.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">There are no issues or sprints available to request here yet.</p>
      )}
    </div>
  );

  const updateFilter = (setter) => (value) => {
    setter(value);
    setPage(0);
  };

  const openTask = (task) => {
    if (task.type === 'sprint') {
      setSelectedIssue(null);
      setSelectedSprint(task.raw);
    } else {
      setSelectedSprint(null);
      setSelectedIssue(task.raw);
    }
  };

  const issueDetailsModal = selectedIssue && (
    <IssueDetailsModal
      isOpen
      issueId={getId(selectedIssue)}
      initialIssue={selectedIssue}
      projectName={selectedIssue.projectName}
      onClose={() => setSelectedIssue(null)}
      onIssueUpdated={refresh}
      onIssueDeleted={() => { setSelectedIssue(null); refresh(); }}
    />
  );

  if (selectedSprint) {
    const projectRole = getProjectRole(selectedSprint.projectId);
    return (
      <div className="space-y-4 p-4 sm:p-6 lg:p-8 animate-fadeIn">
        <SprintDetailsView
          sprintId={getId(selectedSprint)}
          initialSprint={selectedSprint}
          projectId={selectedSprint.projectId}
          projectName={selectedSprint.projectName || 'Project'}
          canManage={canManageProject(selectedSprint.projectId)}
          currentProjectRoleName={projectRole}
          canViewSprintRequests={projectRole === 'PROJECT_MANAGER' || globalRole === 'PROJECT_MANAGER'}
          currentUserProfile={currentUserProfile}
          onBack={() => setSelectedSprint(null)}
          onSprintUpdated={refresh}
          onSprintDeleted={() => { setSelectedSprint(null); refresh(); }}
          onIssueClick={setSelectedIssue}
        />
        {issueDetailsModal}
      </div>
    );
  }

  if (isLoading && projects.length === 0) {
    return <LoadingScreen fullScreen label="Loading your work" />;
  }

  if (!isLoading && !error && projects.length === 0) {
    return (
      <main className="min-h-full p-4 text-slate-900 dark:text-slate-100 sm:p-6 lg:p-8">
        <EmptyState
          title="My Work"
          subtitle="Create or join a project to get started."
          illustration={esmywork}
          illustrationAlt="No projects yet"
          illustrationClassName="max-w-[500px] sm:max-w-[580px] md:max-w-[620px]"
        />
      </main>
    );
  }

  return (
    <main className="min-h-full space-y-6 p-4 text-slate-900 dark:text-slate-100 sm:p-6 lg:p-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">My work</h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">Track your assigned issues and sprints across projects.</p>
        </div>
        <button type="button" onClick={refresh} disabled={isLoading} title="Refresh work" className="self-start rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-xs transition hover:bg-slate-50 disabled:opacity-50 dark:border-[#35353d] dark:bg-[#202024] dark:text-slate-300 dark:hover:bg-[#2b2b32] sm:self-auto">
          <FiRefreshCw size={15} className={isLoading ? 'animate-spin text-sky-500' : ''} />
        </button>
      </header>

      {error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300 sm:text-sm">
          <span className="flex items-center gap-2"><FiAlertCircle size={18} />{error}</span>
          <button type="button" onClick={refresh} className="rounded-lg bg-rose-600 px-3 py-1 font-semibold text-white transition hover:bg-rose-700">Retry</button>
        </div>
      )}

      <section aria-label="Work summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={FiFolder} label="Total tasks" value={isLoading ? '—' : metrics.total} hint="Across your projects" color="border-sky-100 bg-sky-50 text-sky-600 dark:border-sky-900/50 dark:bg-[#1c2e42] dark:text-sky-400" />
        <SummaryCard icon={FiActivity} label="Active tasks" value={isLoading ? '—' : metrics.active} hint="In progress or active" color="border-purple-100 bg-purple-50 text-purple-600 dark:border-purple-900/50 dark:bg-[#2d1e44] dark:text-purple-400" />
        <SummaryCard icon={FiAlertCircle} label="Overdue tasks" value={isLoading ? '—' : metrics.overdue} hint="Past their due date" color="border-rose-100 bg-rose-50 text-rose-600 dark:border-rose-900/50 dark:bg-[#3d1c24] dark:text-rose-400" />
        <SummaryCard icon={FiCheckSquare} label="Completed tasks" value={isLoading ? '—' : metrics.completed} hint="Resolved or completed" color="border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-900/50 dark:bg-[#1b352b] dark:text-emerald-400" />
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4" aria-label="Work type">
        <div className="inline-flex items-center rounded-xl border border-slate-200/80 bg-slate-100 p-1 dark:border-[#2d2d34] dark:bg-[#202024]">
          {[
            ['all', `All work (${tasks.length})`],
            ['sprint', `Sprints (${visibleSprints.length})`],
            ['issue', `Issues (${visibleIssues.length})`],
          ].map(([value, label]) => (
            <button key={value} type="button" onClick={() => { setTypeFilter(value); setRequestChoice(''); setPage(0); }} className={`rounded-lg px-4 py-1.5 text-xs font-bold transition ${typeFilter === value ? 'bg-sky-200 text-sky-900 shadow-2xs dark:bg-sky-500/30 dark:text-sky-200' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-3" aria-label="Work filters">
        <label className="relative min-w-[200px] flex-1 sm:min-w-[260px]">
          <FiSearch size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#888]" />
          <input type="search" value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setPage(0); }} placeholder="Search work..." className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-medium text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-400 dark:border-[#303035] dark:bg-[#1a1a1d] dark:text-white dark:placeholder:text-[#777]" />
        </label>
        <FilterSelect label="Status" value={statusFilter} onChange={updateFilter(setStatusFilter)} options={[
          { value: 'OPEN', label: 'Open' }, { value: 'IN_PROGRESS', label: 'In progress' },
          { value: 'RESOLVED', label: 'Resolved' }, { value: 'REOPENED', label: 'Reopened' },
          { value: 'CLOSED', label: 'Closed' }, { value: 'PLANNED', label: 'Planned' },
          { value: 'ACTIVE', label: 'Active' }, { value: 'COMPLETED', label: 'Completed' },
        ]} />
        <FilterSelect label="Priority" value={priorityFilter} onChange={updateFilter(setPriorityFilter)} options={[
          { value: 'HIGHEST', label: 'Highest' }, { value: 'HIGH', label: 'High' },
          { value: 'MEDIUM', label: 'Medium' }, { value: 'LOW', label: 'Low' }, { value: 'LOWEST', label: 'Lowest' },
        ]} />
        <FilterSelect label="Project" value={projectFilter} onChange={updateFilter(setProjectFilter)} options={projectOptions} />
        <FilterSelect label="Assignee" value={assigneeFilter} onChange={updateFilter(setAssigneeFilter)} options={assigneeOptions} />
        <FilterSelect label="Sort by" value={sortOrder} onChange={updateFilter(setSortOrder)} options={[
          { value: 'due-asc', label: 'Due date: earliest' }, { value: 'due-desc', label: 'Due date: latest' },
          { value: 'start-asc', label: 'Start date' }, { value: 'name-asc', label: 'Name' },
          { value: 'progress-desc', label: 'Progress' },
        ]} />
      </section>

      <WorkTable
        tasks={pageTasks}
        loading={isLoading}
        page={currentPage}
        totalPages={totalPages}
        total={sortedTasks.length}
        onChangePage={(nextPage) => setPage(Math.max(0, Math.min(totalPages - 1, nextPage)))}
        onOpenTask={openTask}
        emptyContent={emptyContent}
      />

      {issueDetailsModal}
      <CreateIssueModal
        isOpen={isCreateIssueOpen}
        onClose={() => setIsCreateIssueOpen(false)}
        projects={projects}
        defaultProjectId={emptyActionProjectId}
        onIssueCreated={() => { setIsCreateIssueOpen(false); refresh(); }}
      />
      <CreateEditSprintModal
        isOpen={isCreateSprintOpen}
        onClose={() => setIsCreateSprintOpen(false)}
        projectId={emptyActionProjectId}
        projectName={projects.find((project) => String(getId(project)) === emptyActionProjectId)?.name}
        onSprintSaved={() => { setIsCreateSprintOpen(false); refresh(); }}
      />
    </main>
  );
};

export default MyWorkView;
