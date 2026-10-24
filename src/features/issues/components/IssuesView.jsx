import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  FiPlus, FiSearch, FiRefreshCw, FiFolder, FiAlertCircle, FiCheckCircle,
  FiChevronDown, FiChevronLeft, FiChevronRight, FiActivity,
  FiCheckSquare, FiLayers, FiX, FiInbox, FiUser, FiCheck,
  FiColumns, FiList,
} from 'react-icons/fi';
import { AiOutlineBug, AiOutlineExclamationCircle } from 'react-icons/ai';
import {
  getProjectIssues, getIssueDetails, getProjectIssueRequests, manageProjectIssueRequest,
  deleteProjectIssueRequest, resolveIssue, reviewIssue, updateIssueStatus, getFriendlyErrorMessage,
} from '../services/issueApi';
import { getMyProjects, getProjectMembers } from '../../projects/services/projectApi';
import { getPriorityBadge, getStatusBadge } from '../utils/issueUtils';
import CreateIssueModal from './CreateIssueModal';
import IssueDetailsView from './IssueDetailsView';
import KanbanBoardView from './KanbanBoardView';

const PAGE_SIZE = 20;
const normalize = (v) => String(v || '').toUpperCase().replace(/[\s-]+/g, '_');
const issueId = (i) => i?.id || i?._id || i?.issueId;
const memberId = (m) => m?.userId || m?.id || m?._id || m?.user?.id || m?.user?._id;
const memberRole = (m) => String(m?.role || m?.projectRole || m?.user?.role || '').toUpperCase();
const assigneeIds = (i) => i?.assigneeIds || i?.assignedUserIds || i?.assignees?.map(memberId) || i?.assignedTo?.map?.(memberId) || (i?.assigneeId ? [i.assigneeId] : []);
const memberName = (m) => m?.name || m?.fullName || m?.user?.name || m?.email || m?.user?.email || '';
const personLabel = (i) => i?.assigneeName || i?.assignedTo?.name || i?.assignedTo?.fullName || i?.assignee?.name || i?.assigneeEmail || '';
const isResolved = (s) => ['RESOLVED', 'CLOSED'].includes(normalize(s));
const isInProgress = (s) => normalize(s) === 'IN_PROGRESS';
const compactDate = (d) => {
  if (!d) return '—';
  const p = new Date(d);
  return Number.isNaN(p.getTime()) ? String(d) : p.toLocaleDateString('en-GB');
};
const avatarColors = ['bg-pink-500', 'bg-blue-500', 'bg-orange-500', 'bg-violet-500', 'bg-emerald-500', 'bg-sky-500'];

const SummaryCard = ({ icon: Icon, label, value, hint, tone }) => (
  <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3.5 py-3 dark:border-[#343434] dark:bg-[#171717] sm:px-4 shadow-xs">
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon size={19} /></div>
    <div className="min-w-0">
      <p className="truncate text-xs text-slate-500 dark:text-[#b6b6b6]">{label}</p>
      <p className="text-lg font-semibold leading-5 text-slate-900 dark:text-white">{value}</p>
      <p className="truncate text-xs text-slate-400 dark:text-[#888]">{hint}</p>
    </div>
  </div>
);

const FilterSelect = ({ label, value, onChange, options }) => (
  <label className="relative min-w-[105px] flex-1 sm:flex-none">
    <span className="sr-only">Filter by {label.toLowerCase()}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)} className="h-[34px] w-full cursor-pointer appearance-none rounded-md border border-slate-200 bg-white pl-3 pr-8 text-xs font-medium text-slate-800 outline-none transition hover:border-slate-300 focus:border-sky-400 dark:border-[#343434] dark:bg-[#202020] dark:text-white dark:hover:border-[#555]">
      <option value="all">{label}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
    <FiChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 dark:text-[#aaa]" />
  </label>
);

const IssuesView = () => {
  const { currentUserProfile } = useOutletContext() || {};
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [projectMembers, setProjectMembers] = useState({});
  const [membersError, setMembersError] = useState('');
  const [issues, setIssues] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingIssues, setIsLoadingIssues] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('due-asc');
  const [layoutView, setLayoutView] = useState('list');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalIssueCount, setTotalIssueCount] = useState(0);
  const [toastNotice, setToastNotice] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedIssueForDetails, setSelectedIssueForDetails] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pendingStatusIssueIds, setPendingStatusIssueIds] = useState(() => new Set());
  const pendingStatusIssueIdsRef = useRef(new Set());

  // Tab mode: 'all' (project issues), 'assigned' (assigned to me), 'requests' (assignment requests)
  const [userSelectedTab, setUserSelectedTab] = useState(null);
  const [projectRequestsList, setProjectRequestsList] = useState([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);

  const showToast = useCallback((type, message) => {
    setToastNotice({ type, message });
    window.setTimeout(() => setToastNotice(null), 4500);
  }, []);

  const currentUserId = currentUserProfile?.id || currentUserProfile?._id || currentUserProfile?.userId || currentUserProfile?.user?.id;
  const currentUserEmail = String(currentUserProfile?.email || currentUserProfile?.user?.email || '').toLowerCase();
  const globalRole = normalize(currentUserProfile?.role || currentUserProfile?.user?.role);
  const isGlobalAdmin = ['ADMIN', 'WORKSPACE_ADMIN', 'OWNER'].includes(globalRole);

  // Load project members
  useEffect(() => {
    if (isLoadingProjects) return undefined;
    let active = true;
    Promise.allSettled(projects.map(async (p) => {
      const pid = p.id || p._id || p.projectId;
      if (!pid) return [];
      return getProjectMembers(pid);
    })).then((results) => {
      if (!active) return;
      const people = new Map();
      const loadedByProject = {};
      results.forEach((res, index) => {
        const p = projects[index];
        const pid = p?.id || p?._id || p?.projectId;
        if (res.status === 'fulfilled' && pid) loadedByProject[String(pid)] = res.value;
      });
      setProjectMembers(loadedByProject);
      results.filter((res) => res.status === 'fulfilled').flatMap((res) => res.value).forEach((m) => {
        const mid = memberId(m);
        const name = memberName(m);
        if (name) people.set(String(mid || name).toLowerCase(), { id: String(mid || name), name, email: m.email || m.user?.email || '' });
      });
      setMembers([...people.values()]);
      const failed = results.find((res) => res.status === 'rejected');
      setMembersError(failed ? getFriendlyErrorMessage(failed.reason, 'project') : '');
    });
    return () => { active = false; };
  }, [projects, isLoadingProjects]);

  // Load initial projects
  useEffect(() => {
    let active = true;
    getMyProjects()
      .then((list) => { if (active) setProjects(Array.isArray(list) ? list : []); })
      .catch((err) => { if (active) { setProjects([]); setError(getFriendlyErrorMessage(err, 'project')); } })
      .finally(() => { if (active) setIsLoadingProjects(false); });
    return () => { active = false; };
  }, []);

  const projectMap = useMemo(() => new Map(projects.map((p) => [String(p.id || p._id || p.projectId), p.name || 'Project'])), [projects]);

  const managedProjectIds = useMemo(() => new Set(projects.filter((p) => {
    const pid = String(p.id || p._id || p.projectId);
    const self = (projectMembers[pid] || []).find((m) =>
      (currentUserId && String(memberId(m)) === String(currentUserId)) ||
      (currentUserEmail && String(m.email || m.user?.email || '').toLowerCase() === currentUserEmail)
    );
    return ['PROJECT_MANAGER', 'TEAM_LEAD', 'ADMIN'].includes(memberRole(self));
  }).map((p) => String(p.id || p._id || p.projectId))), [projects, projectMembers, currentUserId, currentUserEmail]);

  const canManageIssues = useCallback((id) => isGlobalAdmin || managedProjectIds.has(String(id)), [isGlobalAdmin, managedProjectIds]);
  const hasManagementRole = isGlobalAdmin || managedProjectIds.size > 0;
  const activeTab = userSelectedTab || (!hasManagementRole && globalRole === 'CONTRIBUTOR' ? 'assigned' : 'all');
  const setActiveTab = setUserSelectedTab;

  // Load issues
  useEffect(() => {
    if (isLoadingProjects) return undefined;
    let active = true;
    const load = async () => {
      const targetProjects = projectFilter === 'all' ? projects : projects.filter((p) => String(p.id || p._id || p.projectId) === projectFilter);
      const results = await Promise.all(targetProjects.map(async (p) => {
        const pid = p.id || p._id || p.projectId;
        if (!pid) return { issues: [], members: [] };
        const [issueResult] = await Promise.allSettled([getProjectIssues(pid, { page, size: PAGE_SIZE })]);
        return {
          page: issueResult.status === 'fulfilled' ? issueResult.value : { items: [], totalElements: 0, totalPages: 1 },
          error: issueResult.status === 'rejected' ? issueResult.reason : null,
          projectId: pid,
          projectName: p.name || 'Project',
        };
      }));
      if (!active) return;
      setIssues(results.flatMap((item) => item.page.items.map((i) => ({ ...i, projectId: item.projectId, projectName: item.projectName }))));
      setTotalIssueCount(results.reduce((sum, item) => sum + item.page.totalElements, 0));
      setTotalPages(Math.max(1, ...results.map((item) => item.page.totalPages)));
      const issueFailure = results.find((item) => item.error);
      setError(issueFailure ? getFriendlyErrorMessage(issueFailure.error, 'issue') : '');
      setIsLoadingIssues(false);
    };
    load().catch((err) => {
      if (!active) return;
      setIssues([]);
      setError(getFriendlyErrorMessage(err, 'issue'));
      setIsLoadingIssues(false);
    });
    return () => { active = false; };
  }, [projects, isLoadingProjects, refreshTrigger, projectFilter, page]);

  // Load assignment requests for management roles
  const loadProjectRequests = useCallback(async () => {
    if (!projects.length) return;
    setIsLoadingRequests(true);
    try {
      const targetPids = projectFilter === 'all'
        ? projects.map((p) => p.id || p._id || p.projectId).filter(Boolean)
        : [projectFilter];
      const results = await Promise.allSettled(targetPids.map((pid) => getProjectIssueRequests(pid)));
      const allReqs = [];
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled') {
          const body = r.value?.data || r.value?.requests || r.value || [];
          const list = Array.isArray(body) ? body : (Array.isArray(body?.items) ? body.items : []);
          list.forEach((req) => allReqs.push({ ...req, projectId: targetPids[idx], projectName: projectMap.get(String(targetPids[idx])) }));
        }
      });
      setProjectRequestsList(allReqs);
    } catch (err) {
      console.warn('Failed loading project requests:', err);
    } finally {
      setIsLoadingRequests(false);
    }
  }, [projects, projectFilter, projectMap]);

  useEffect(() => {
    if (activeTab !== 'requests' || !projects.length) return undefined;
    let active = true;
    const targetPids = projectFilter === 'all'
      ? projects.map((p) => p.id || p._id || p.projectId).filter(Boolean)
      : [projectFilter];
    Promise.allSettled(targetPids.map((pid) => getProjectIssueRequests(pid))).then((results) => {
      if (!active) return;
      const allReqs = [];
      results.forEach((r, idx) => {
        if (r.status === 'fulfilled') {
          const body = r.value?.data || r.value?.requests || r.value || [];
          const list = Array.isArray(body) ? body : (Array.isArray(body?.items) ? body.items : []);
          list.forEach((req) => allReqs.push({ ...req, projectId: targetPids[idx], projectName: projectMap.get(String(targetPids[idx])) }));
        }
      });
      setProjectRequestsList(allReqs);
      setIsLoadingRequests(false);
    });
    return () => { active = false; };
  }, [activeTab, projects, projectFilter, projectMap]);

  const memberById = useMemo(() => new Map(members.map((m) => [String(m.id).toLowerCase(), m.name])), [members]);

  const canCreateIssue = projects.some((p) => {
    const pid = String(p.id || p._id || p.projectId);
    const self = (projectMembers[pid] || []).find((m) =>
      (currentUserId && String(memberId(m)) === String(currentUserId)) ||
      (currentUserEmail && String(m.email || m.user?.email || '').toLowerCase() === currentUserEmail)
    );
    return canManageIssues(pid) || memberRole(self) === 'REPORTER';
  });

  const displayAssignee = useCallback((i) => {
    const direct = personLabel(i);
    if (direct && !/^[0-9a-f-]{32,}$/i.test(direct)) return direct;
    const id = i.assigneeId || i.assigneeUserId || i.assignedToId || i.assignedTo?.id || i.assignedTo?._id || direct;
    return (id && memberById.get(String(id).toLowerCase())) || '';
  }, [memberById]);

  const counts = useMemo(() => ({
    total: issues.length,
    progress: issues.filter((i) => isInProgress(i.status)).length,
    open: issues.filter((i) => !isResolved(i.status)).length,
    resolved: issues.filter((i) => isResolved(i.status)).length,
  }), [issues]);

  const statusOptions = useMemo(() => [...new Set(issues.map((i) => i.status || 'OPEN'))].map((s) => ({ value: normalize(s), label: String(s).replace(/[_-]/g, ' ') })), [issues]);
  const priorityOptions = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => ({ value: p, label: p[0] + p.slice(1).toLowerCase() }));

  const filteredIssues = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = issues.filter((i) => {
      // Role filtering
      const isAssignedToUser = currentUserId && assigneeIds(i).some((id) => String(id) === String(currentUserId));
      if (activeTab === 'assigned' && !isAssignedToUser) return false;
      if (!canManageIssues(i.projectId) && activeTab === 'all' && !hasManagementRole && currentUserId && !isAssignedToUser) return false;

      if (projectFilter !== 'all' && String(i.projectId) !== projectFilter) return false;
      if (statusFilter !== 'all' && normalize(i.status) !== statusFilter) return false;
      if (priorityFilter !== 'all' && normalize(i.priority) !== priorityFilter) return false;
      if (assigneeFilter !== 'all' && (displayAssignee(i).toLowerCase() !== assigneeFilter)) return false;
      return !query || [i.title, i.description, i.projectName, displayAssignee(i)].some((v) => String(v || '').toLowerCase().includes(query));
    });
    return filtered.sort((a, b) => {
      if (sortOrder === 'due-desc') return new Date(b.dueDate || 0) - new Date(a.dueDate || 0);
      if (sortOrder === 'priority') return ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].indexOf(normalize(a.priority)) - ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].indexOf(normalize(b.priority));
      return new Date(a.dueDate || '9999-12-31') - new Date(b.dueDate || '9999-12-31');
    });
  }, [issues, activeTab, projectFilter, statusFilter, priorityFilter, assigneeFilter, searchQuery, sortOrder, displayAssignee, canManageIssues, hasManagementRole, currentUserId]);

  const refresh = () => { setIsLoadingIssues(true); setRefreshTrigger((c) => c + 1); };
  const changeProjectFilter = (v) => { setIsLoadingIssues(true); setPage(0); setProjectFilter(v); };
  const handleIssueCreated = (created) => { showToast('success', `“${created?.title || 'New issue'}” created.`); refresh(); };

  const handleUpdateIssueStatus = useCallback(async (id, newStatus) => {
    const issue = issues.find((item) => String(issueId(item)) === String(id));
    if (!issue || normalize(issue.status || 'OPEN') === normalize(newStatus)) return;
    if (pendingStatusIssueIdsRef.current.has(String(id))) return;
    pendingStatusIssueIdsRef.current.add(String(id));
    setPendingStatusIssueIds(new Set(pendingStatusIssueIdsRef.current));
    try {
      const currentStatus = normalize(issue.status || 'OPEN');
      const targetStatus = normalize(newStatus);
      const projectId = issue.projectId || issue.project?.id || issue.project?.projectId;
      const isProjectManager = globalRole === 'PROJECT_MANAGER' ||
        (projectMembers[String(projectId)] || []).some((member) => {
          const memberUserId = memberId(member);
          const memberEmail = String(member.email || member.user?.email || '').toLowerCase();
          const isCurrentUser = (currentUserId && String(memberUserId) === String(currentUserId)) ||
            (currentUserEmail && memberEmail === currentUserEmail);
          return isCurrentUser && memberRole(member) === 'PROJECT_MANAGER';
        });

      if (isGlobalAdmin || isProjectManager) {
        await updateIssueStatus(id, targetStatus);
      } else if (currentStatus === 'IN_PROGRESS' && targetStatus === 'RESOLVED') {
        await resolveIssue(id);
      } else if (currentStatus === 'RESOLVED' && targetStatus === 'CLOSED') {
        await reviewIssue(id, 'approve');
      } else if (currentStatus === 'RESOLVED' && targetStatus === 'REOPENED') {
        await reviewIssue(id, 'reject');
      } else {
        showToast('error', 'That transition needs an assignment or review action and cannot be completed from the board.');
        return;
      }
      const persistedIssue = await getIssueDetails(id);
      if (!persistedIssue?.status || normalize(persistedIssue.status) !== targetStatus) {
        throw new Error(`The server did not confirm the status change to ${targetStatus.replace(/[_-]/g, ' ')}.`);
      }
      setIssues((current) => current.map((item) => (
        String(issueId(item)) === String(id)
          ? { ...item, ...persistedIssue, projectId: item.projectId, projectName: item.projectName }
          : item
      )));
      showToast('success', `Issue moved to ${targetStatus.replace(/[_-]/g, ' ')}.`);
    } catch (err) {
      showToast('error', getFriendlyErrorMessage(err, 'issue'));
    } finally {
      pendingStatusIssueIdsRef.current.delete(String(id));
      setPendingStatusIssueIds(new Set(pendingStatusIssueIdsRef.current));
    }
  }, [issues, showToast, globalRole, isGlobalAdmin, projectMembers, currentUserId, currentUserEmail]);

  // Handle assignment request decisions in tab
  const handleApproveRequest = async (req) => {
    try {
      await manageProjectIssueRequest(req.issueId || req.issue?.id, req.id || req.requestId, true);
      showToast('success', 'Assignment request approved.');
      loadProjectRequests();
      refresh();
    } catch (err) { showToast('error', getFriendlyErrorMessage(err, 'issue')); }
  };

  const handleRejectRequest = async (req) => {
    try {
      await deleteProjectIssueRequest(req.projectId, req.id || req.requestId);
      showToast('success', 'Assignment request rejected.');
      loadProjectRequests();
    } catch (err) { showToast('error', getFriendlyErrorMessage(err, 'issue')); }
  };

  if (selectedIssueForDetails) {
    return (
      <section className="min-h-[calc(100vh-7.5rem)] rounded-2xl bg-[#f4f5f7] p-4 text-slate-900 dark:bg-[#141416] dark:text-white sm:p-6 lg:p-7">
        <IssueDetailsView
          issueId={issueId(selectedIssueForDetails)}
          initialIssue={selectedIssueForDetails}
          projectName={selectedIssueForDetails.projectName || projectMap.get(String(selectedIssueForDetails.projectId))}
          onBack={() => setSelectedIssueForDetails(null)}
          onIssueUpdated={refresh}
          onIssueDeleted={() => { setSelectedIssueForDetails(null); refresh(); }}
          currentUserProfile={currentUserProfile}
        />
      </section>
    );
  }

  const start = totalIssueCount ? page * PAGE_SIZE + 1 : 0;
  const end = Math.min((page + 1) * PAGE_SIZE, totalIssueCount);

  return (
    <section className="min-h-[calc(100vh-7.5rem)] space-y-4 rounded-xl bg-[#f0f0f0] p-4 text-slate-900 dark:bg-[#292929] dark:text-white sm:p-6 lg:p-7 animate-fadeIn">
      {/* 1. Header with Tabs */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold leading-tight tracking-tight">Issues</h1>
          <p className="mt-1 text-xs text-slate-600 dark:text-[#c0c0c0] sm:text-sm">Manage all your issues in one place. Prioritize, track, and resolve problems.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={refresh} disabled={isLoadingIssues} title="Refresh issues" className="flex h-[38px] w-[38px] items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-[#3a3a3a] dark:bg-[#202020] dark:text-[#ddd] dark:hover:bg-[#333] cursor-pointer"><FiRefreshCw size={15} className={isLoadingIssues ? 'animate-spin' : ''} /></button>
          {canCreateIssue && <button type="button" onClick={() => setIsCreateModalOpen(true)} className="inline-flex h-[38px] items-center gap-2 rounded-md bg-sky-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 active:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:text-sm cursor-pointer"><FiPlus size={16} />Create Issue</button>}
        </div>
      </div>

      {/* Role-Based View Switcher Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-[#38383e] pb-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => { setActiveTab('all'); setPage(0); }}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
            activeTab === 'all'
              ? 'bg-white text-slate-900 shadow-xs dark:bg-[#202020] dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-[#888] dark:hover:text-white'
          }`}
        >
          <FiLayers size={14} /> Project Issues
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('assigned'); setPage(0); }}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
            activeTab === 'assigned'
              ? 'bg-white text-slate-900 shadow-xs dark:bg-[#202020] dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-[#888] dark:hover:text-white'
          }`}
        >
          <FiUser size={14} /> Assigned to Me
        </button>
        {hasManagementRole && (
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-[#202020] dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-[#888] dark:hover:text-white'
            }`}
          >
            <FiInbox size={14} /> Assignment Requests
            {projectRequestsList.length > 0 && (
              <span className="ml-1 rounded-full bg-sky-500 text-white px-1.5 py-0.2 text-[10px] font-bold">
                {projectRequestsList.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Notices */}
      {toastNotice && <div className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"><span className="flex items-center gap-2"><FiCheckCircle />{toastNotice.message}</span><button type="button" onClick={() => setToastNotice(null)} aria-label="Dismiss"><FiX /></button></div>}
      {error && <div className="flex items-center justify-between rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"><span className="flex items-center gap-2"><FiAlertCircle />{error}</span><button type="button" onClick={refresh} className="font-semibold underline cursor-pointer">Retry</button></div>}
      {membersError && <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Some project members could not be loaded: {membersError}</p>}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SummaryCard icon={FiFolder} label="Total issues" value={totalIssueCount} hint="Across selected projects" tone="bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300" />
        <SummaryCard icon={FiActivity} label="In progress" value={counts.progress} hint="Current page results" tone="bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300" />
        <SummaryCard icon={AiOutlineExclamationCircle} label="Open on this page" value={counts.open} hint="Current page results" tone="bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-300" />
        <SummaryCard icon={FiCheckSquare} label="Resolved on this page" value={counts.resolved} hint="Current page results" tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" />
      </div>

      {/* 2. Main View Content based on Active Tab */}
      {activeTab === 'requests' ? (
        /* ================= ASSIGNMENT REQUESTS VIEW ================= */
        <div className="rounded-xl border border-slate-200 bg-white dark:border-[#363636] dark:bg-[#171717] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Project Assignment Requests</h2>
            <button type="button" onClick={loadProjectRequests} className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer">Refresh requests</button>
          </div>
          {isLoadingRequests ? (
            <div className="py-12 text-center text-xs text-slate-500"><FiRefreshCw className="inline animate-spin mr-2" /> Loading requests...</div>
          ) : projectRequestsList.length > 0 ? (
            <div className="space-y-2.5">
              {projectRequestsList.map((req, idx) => {
                const reqId = req.id || req.requestId || idx;
                const reqName = req.user?.name || req.requesterName || req.email || 'Project Member';
                return (
                  <div key={reqId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-[#333] dark:bg-[#202020] text-xs">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white sm:text-sm">{reqName}</p>
                      <p className="text-slate-500 dark:text-[#888]">{req.projectName || 'Project'} · Issue: {req.issue?.title || req.issueTitle || 'Task'}</p>
                      {req.message && <p className="mt-1 text-slate-700 dark:text-slate-300 italic">“{req.message}”</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleApproveRequest(req)}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 font-semibold text-white transition cursor-pointer"
                      >
                        <FiCheck size={13} /> Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectRequest(req)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 px-3 py-1.5 font-semibold text-rose-700 dark:text-rose-300 transition cursor-pointer"
                      >
                        <FiX size={13} /> Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              <FiInbox size={32} className="mx-auto mb-2 text-slate-400 opacity-60" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No pending assignment requests</p>
              <p className="mt-1 text-slate-400">When contributors request to be assigned to issues, they will appear here.</p>
            </div>
          )}
        </div>
      ) : (
        /* ================= ISSUES BOARD / TABLE VIEW ================= */
        <>
          {/* Controls: View Switcher (Board/List), Search & Filters */}
          <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-[#343434] dark:bg-[#1e1e1e]">
                <button
                  type="button"
                  onClick={() => setLayoutView('board')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    layoutView === 'board'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-[#2b2b2b] dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-[#888] dark:hover:text-white'
                  }`}
                >
                  <FiColumns size={13} /> Board
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutView('list')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                    layoutView === 'list'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-[#2b2b2b] dark:text-white'
                      : 'text-slate-500 hover:text-slate-900 dark:text-[#888] dark:hover:text-white'
                  }`}
                >
                  <FiList size={13} /> List
                </button>
              </div>

              <div className="relative min-w-[190px] flex-1 sm:w-64">
                <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-[#aaa]" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search issue...."
                  className="h-[34px] w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-400 dark:border-[#343434] dark:bg-[#202020] dark:text-white dark:placeholder:text-[#999]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
              <FilterSelect label="Priority" value={priorityFilter} onChange={setPriorityFilter} options={priorityOptions} />
              <FilterSelect label="Project" value={projectFilter} onChange={changeProjectFilter} options={projects.map((p) => ({ value: String(p.id || p._id || p.projectId), label: p.name || 'Project' }))} />
              <FilterSelect label="Assignee" value={assigneeFilter} onChange={setAssigneeFilter} options={[...new Set(members.map((m) => m.name))].map((name) => ({ value: name.toLowerCase(), label: name }))} />
              <FilterSelect label="Sort by: Due date" value={sortOrder} onChange={setSortOrder} options={[{ value: 'due-asc', label: 'Due date: earliest' }, { value: 'due-desc', label: 'Due date: latest' }, { value: 'priority', label: 'Priority' }]} />
            </div>
          </div>

          {layoutView === 'board' ? (
            <div className="space-y-4">
              <KanbanBoardView
                issues={filteredIssues}
                isLoading={isLoadingIssues}
                onIssueClick={(issue) => setSelectedIssueForDetails(issue)}
                onStatusChange={handleUpdateIssueStatus}
                pendingStatusIssueIds={pendingStatusIssueIds}
                onCreateInColumn={() => setIsCreateModalOpen(true)}
                displayAssignee={displayAssignee}
              />
              {totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-600 dark:border-[#363636] dark:bg-[#171717] dark:text-[#bbb] sm:px-4">
                  <span>{projectFilter === 'all' ? `Showing ${filteredIssues.length} issues on page ${page + 1}` : `Showing ${start}–${end} of ${totalIssueCount} issues`}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" aria-label="Previous page" disabled={page <= 0} onClick={() => { setIsLoadingIssues(true); setPage((c) => Math.max(0, c - 1)); }} className="flex h-6 w-6 items-center justify-center rounded text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-[#ddd] dark:hover:bg-[#383838] cursor-pointer"><FiChevronLeft size={14} /></button>
                    {Array.from({ length: totalPages }, (_, idx) => idx).slice(Math.max(0, Math.min(page - 2, totalPages - 4)), Math.max(4, Math.min(page - 2, totalPages - 4)) + 4).map((val) => (
                      <button type="button" key={val} onClick={() => { setIsLoadingIssues(true); setPage(val); }} className={`flex h-6 min-w-6 items-center justify-center rounded px-1.5 text-xs cursor-pointer ${page === val ? 'bg-sky-500 font-semibold text-white' : 'hover:bg-slate-100 dark:hover:bg-[#383838]'}`}>{val + 1}</button>
                    ))}
                    <button type="button" aria-label="Next page" disabled={page >= totalPages - 1} onClick={() => { setIsLoadingIssues(true); setPage((c) => Math.min(totalPages - 1, c + 1)); }} className="flex h-6 w-6 items-center justify-center rounded text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-[#ddd] dark:hover:bg-[#383838] cursor-pointer"><FiChevronRight size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Table Container */
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-[#363636] dark:bg-[#171717]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] border-collapse text-left">
                  <thead>
                    <tr className="h-[38px] bg-slate-100 text-xs font-semibold text-slate-800 dark:bg-[#202020] dark:text-[#eee]">
                      <th className="p-4">Issue</th><th className="p-5">ID</th><th className="p-5">Project</th><th className="p-5">Status</th><th className="px-3">Priority</th><th className="px-3">Assignee</th><th className="px-3">Due date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#343434]">
                    {isLoadingIssues ? Array.from({ length: 5 }, (_, idx) => (
                      <tr key={idx} className="h-[43px] animate-pulse"><td colSpan="7" className="px-4"><div className="h-4 rounded bg-slate-100 dark:bg-[#333]" /></td></tr>
                    )) : filteredIssues.map((issueItem, idx) => {
                      const id = issueId(issueItem);
                      const number = issueItem.issueNumber || (id ? String(id).slice(-6) : `#${idx + 1}`);
                      const assignee = displayAssignee(issueItem);
                      const avatarColor = avatarColors[(assignee.charCodeAt(0) || idx) % avatarColors.length];
                      return (
                        <tr
                          key={id || `${issueItem.title}-${idx}`}
                          onClick={() => setSelectedIssueForDetails(issueItem)}
                          onKeyDown={(e) => { if (e.key === 'Enter') setSelectedIssueForDetails(issueItem); }}
                          tabIndex={0}
                          className="h-[43px] cursor-pointer text-xs transition hover:bg-slate-50 dark:hover:bg-[#2e2e2e]"
                        >
                          <td className="max-w-[250px] px-2"><span className="inline-block max-w-full truncate rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-900 dark:bg-[#303030] dark:text-white" title={issueItem.title}>{issueItem.title || 'Untitled issue'}</span></td>
                          <td className="px-3"><span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-700 dark:bg-[#303030] dark:text-[#ddd]">{String(number).startsWith('#') ? number : `#${number}`}</span></td>
                          <td className="px-3"><span className="inline-flex max-w-[150px] items-center gap-1 truncate rounded-md bg-slate-100 px-2 py-1 text-slate-700 dark:bg-[#303030] dark:text-[#ddd]"><FiLayers size={11} className="shrink-0" />{issueItem.projectName || projectMap.get(String(issueItem.projectId)) || issueItem.project?.name || '—'}</span></td>
                          <td className="px-3"><span className={`whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium ${getStatusBadge(issueItem.status)}`}>{String(issueItem.status || 'OPEN').replace(/[_-]/g, ' ')}</span></td>
                          <td className="px-3"><span className={`whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium ${getPriorityBadge(issueItem.priority)}`}>{String(issueItem.priority || 'MEDIUM').replace(/[_-]/g, ' ')}</span></td>
                          <td className="px-3">{assignee ? <span title={assignee} className={`flex h-[22px] w-[22px] items-center justify-center rounded-full text-[9px] font-semibold text-white ${avatarColor}`}>{assignee.trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase()}</span> : <span className="text-slate-400 dark:text-[#888]">—</span>}</td>
                          <td className="whitespace-nowrap px-3 text-slate-700 dark:text-[#ddd]">{compactDate(issueItem.dueDate)}</td>
                        </tr>
                      );
                    })}
                    {!isLoadingIssues && filteredIssues.length === 0 && (
                      <tr>
                        <td colSpan="7" className="px-4 py-12 text-center">
                          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300">
                            <AiOutlineBug size={24} />
                          </div>
                          <p className="text-sm font-semibold">
                            {activeTab === 'assigned' ? 'No issues assigned to you yet' : issues.length ? 'No matching issues' : 'No issues yet'}
                          </p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-[#aaa]">
                            {activeTab === 'assigned'
                              ? 'When a project manager assigns an issue to you, or your assignment request is approved, it will appear here.'
                              : issues.length ? 'Try changing your search or filters.' : 'Create an issue to start tracking work across your projects.'}
                          </p>
                          {activeTab === 'assigned' ? (
                            <button type="button" onClick={() => setActiveTab('all')} className="mt-4 inline-flex h-[34px] items-center gap-1.5 rounded-md bg-sky-600 px-3.5 text-xs font-semibold text-white hover:bg-sky-700 cursor-pointer">
                              Browse Project Issues
                            </button>
                          ) : !issues.length ? (
                            <button type="button" onClick={() => setIsCreateModalOpen(true)} className="mt-4 inline-flex h-[34px] items-center gap-2 rounded-md bg-sky-600 px-3 text-xs font-semibold text-white hover:bg-sky-700 cursor-pointer">
                              <FiPlus />Create Issue
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-3 py-2.5 text-xs text-slate-600 dark:border-[#363636] dark:text-[#bbb] sm:px-4">
                <span className="text-xs">{projectFilter === 'all' ? `Showing ${filteredIssues.length} issues on page ${page + 1}` : `Showing ${start}–${end} of ${totalIssueCount} issues`}</span>
                <div className="flex items-center gap-1">
                  <button type="button" aria-label="Previous page" disabled={page <= 0} onClick={() => { setIsLoadingIssues(true); setPage((c) => Math.max(0, c - 1)); }} className="flex h-6 w-6 items-center justify-center rounded text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-[#ddd] dark:hover:bg-[#383838] cursor-pointer"><FiChevronLeft size={14} /></button>
                  {Array.from({ length: totalPages }, (_, idx) => idx).slice(Math.max(0, Math.min(page - 2, totalPages - 4)), Math.max(4, Math.min(page - 2, totalPages - 4)) + 4).map((val) => (
                    <button type="button" key={val} onClick={() => { setIsLoadingIssues(true); setPage(val); }} className={`flex h-6 min-w-6 items-center justify-center rounded px-1.5 text-xs cursor-pointer ${page === val ? 'bg-sky-500 font-semibold text-white' : 'hover:bg-slate-100 dark:hover:bg-[#383838]'}`}>{val + 1}</button>
                  ))}
                  <button type="button" aria-label="Next page" disabled={page >= totalPages - 1} onClick={() => { setIsLoadingIssues(true); setPage((c) => Math.min(totalPages - 1, c + 1)); }} className="flex h-6 w-6 items-center justify-center rounded text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-[#ddd] dark:hover:bg-[#383838] cursor-pointer"><FiChevronRight size={14} /></button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Issue Modal */}
      <CreateIssueModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        projects={projects}
        defaultProjectId={projectFilter !== 'all' ? projectFilter : projects[0]?.id || projects[0]?._id || ''}
        onIssueCreated={handleIssueCreated}
      />
    </section>
  );
};

export default IssuesView;
