import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  FiAlertCircle,
  FiCheckCircle,
  FiChevronDown,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiX,
  FiInbox,
  FiCheck,
} from 'react-icons/fi';
import { getMyProjects, getProjectMembers } from '../../projects/services/projectApi';
import { getProjectIssues } from '../../issues/services/issueApi';
import {
  getProjectSprints,
  getProjectSprintRequests,
  approveSprintRequest,
  startSprint,
  completeSprint,
  getFriendlyErrorMessage,
} from '../services/sprintsApi';
import SprintsSummaryCards from './SprintsSummaryCards';
import SprintsTable from './SprintsTable';
import SprintsBoard from './SprintsBoard';
import SprintDetailsView from './SprintDetailsView';
import CreateEditSprintModal from './CreateEditSprintModal';

const getCollection = (value, keys) => {
  const containers = [value, value?.data, value?.result];
  for (const container of containers) {
    if (Array.isArray(container)) return container;
    if (container && typeof container === 'object') {
      for (const key of keys) {
        if (Array.isArray(container[key])) return container[key];
      }
    }
  }
  return [];
};

const getProjectId = (project) => project?.id || project?.projectId || project?._id;
const getSprintId = (sprint) => sprint?.id || sprint?.sprintId || sprint?._id;

const FilterSelect = ({ label, value, onChange, options }) => (
  <label className="relative min-w-[110px] flex-1 sm:flex-none">
    <span className="sr-only">Filter by {label.toLowerCase()}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-[34px] w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white pl-3 pr-8 text-xs font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-sky-400 dark:border-[#303035] dark:bg-[#1a1a1d] dark:text-white dark:hover:border-[#555]"
    >
      <option value="all">{label}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
    <FiChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#888]" />
  </label>
);

const SprintsView = () => {
  const { currentUserProfile } = useOutletContext() || {};
  const globalRole = String(currentUserProfile?.role || currentUserProfile?.user?.role || '').toUpperCase();
  const isAdmin = ['ADMIN', 'WORKSPACE_ADMIN', 'OWNER'].includes(globalRole);

  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState('');

  const [sprints, setSprints] = useState([]);
  const [sprintRequests, setSprintRequests] = useState([]);
  const [sprintRequestsLoading, setSprintRequestsLoading] = useState(false);
  const [sprintRequestsProjectId, setSprintRequestsProjectId] = useState('');
  const [pendingSprintIds, setPendingSprintIds] = useState(() => new Set());
  const pendingSprintIdsRef = useRef(new Set());
  const [sprintsLoading, setSprintsLoading] = useState(false);
  const [sprintsError, setSprintsError] = useState('');

  const [projectIssues, setProjectIssues] = useState([]);
  const [members, setMembers] = useState([]);
  const [membersProjectId, setMembersProjectId] = useState('');

  // Selected sprint for details
  const [selectedSprintId, setSelectedSprintId] = useState('');
  const [selectedSprint, setSelectedSprint] = useState(null);

  // View mode: 'list' or 'board' (matching screenshot, default to list)
  const [layoutView, setLayoutView] = useState('list');

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('due-asc');
  const [page, setPage] = useState(0);

  // Create / Edit modal state
  const [isCreateEditOpen, setIsCreateEditOpen] = useState(false);
  const [sprintToEdit, setSprintToEdit] = useState(null);

  const [toastNotice, setToastNotice] = useState(null);
  const [projectRefreshTrigger, setProjectRefreshTrigger] = useState(0);
  const [sprintRefreshTrigger, setSprintRefreshTrigger] = useState(0);

  const showToast = useCallback((type, message) => {
    setToastNotice({ type, message });
    window.setTimeout(() => setToastNotice(null), 4000);
  }, []);

  const currentProject = projects.find((p) => String(getProjectId(p)) === projectId);

  // Load Projects
  useEffect(() => {
    let isMounted = true;
    getMyProjects()
      .then((response) => {
        if (!isMounted) return;
        const records = getCollection(response, ['projects', 'items', 'content', 'results']);
        setProjects(records);
        setProjectId((currentId) =>
          currentId && records.some((project) => String(getProjectId(project)) === currentId)
            ? currentId
            : getProjectId(records[0])
            ? String(getProjectId(records[0]))
            : ''
        );
        setProjectsError('');
      })
      .catch((error) => {
        if (!isMounted) return;
        setProjects([]);
        setProjectsError(getFriendlyErrorMessage(error, 'project'));
      })
      .finally(() => {
        if (isMounted) setProjectsLoading(false);
      });

    return () => { isMounted = false; };
  }, [projectRefreshTrigger]);

  // Load Sprints for active project
  useEffect(() => {
    if (!projectId) return undefined;

    let isMounted = true;
    getProjectSprints(projectId)
      .then((response) => {
        if (!isMounted) return;
        setSprints(getCollection(response, ['sprints', 'items', 'content', 'results']));
        setSprintsError('');
        setSprintsLoading(false);
      })
      .catch((error) => {
        if (!isMounted) return;
        setSprints([]);
        setSprintsError(getFriendlyErrorMessage(error, 'sprint'));
        setSprintsLoading(false);
      });

    return () => { isMounted = false; };
  }, [projectId, sprintRefreshTrigger]);

  // Load Project Issues & Members for accurate metrics & filters
  useEffect(() => {
    if (!projectId) return undefined;
    let isMounted = true;
    getProjectIssues(projectId, { page: 0, size: 100 })
      .then((data) => {
        if (!isMounted) return;
        const items = data?.items || data?.content || (Array.isArray(data) ? data : []);
        setProjectIssues(items);
      })
      .catch(() => {});

    getProjectMembers(projectId)
      .then((data) => {
        if (!isMounted) return;
        const list = Array.isArray(data) ? data : (data?.members || []);
        setMembers(list);
        setMembersProjectId(String(projectId));
      })
      .catch(() => {});

    return () => { isMounted = false; };
  }, [projectId]);

  const loadSprints = useCallback(() => {
    setSprintsLoading(true);
    setSprintRefreshTrigger((v) => v + 1);
  }, []);

  const handleSprintStatusChange = useCallback(async (sprint, sourceColumnId, destinationColumnId) => {
    const sprintId = getSprintId(sprint);
    if (!sprintId || sourceColumnId === destinationColumnId) return;
    const key = String(sprintId);
    if (pendingSprintIdsRef.current.has(key)) return;

    const currentStatus = String(sprint.status || sprint.state || 'PLANNED').toUpperCase().replace(/[\s-]+/g, '_');
    const plannedStatuses = ['PLANNED', 'PLANNING', 'FUTURE'];
    const activeStatuses = ['ACTIVE', 'IN_PROGRESS', 'STARTED'];
    const isStartTransition = plannedStatuses.includes(currentStatus) && destinationColumnId === 'ACTIVE';
    const isCompleteTransition = activeStatuses.includes(currentStatus) && destinationColumnId === 'COMPLETED';

    if (!isStartTransition && !isCompleteTransition) {
      showToast('error', 'That sprint status transition is not supported by the available sprint actions.');
      return;
    }
    if (isCompleteTransition && !window.confirm('Complete this sprint? This marks current delivery goals as finished.')) return;

    pendingSprintIdsRef.current.add(key);
    setPendingSprintIds(new Set(pendingSprintIdsRef.current));
    try {
      if (isStartTransition) await startSprint(sprintId);
      else await completeSprint(sprintId);
      showToast('success', isStartTransition ? 'Sprint started successfully.' : 'Sprint completed successfully.');
      loadSprints();
    } catch (error) {
      showToast('error', getFriendlyErrorMessage(error, 'sprint'));
    } finally {
      pendingSprintIdsRef.current.delete(key);
      setPendingSprintIds(new Set(pendingSprintIdsRef.current));
    }
  }, [loadSprints, showToast]);

  const loadProjects = useCallback(() => {
    setProjectsLoading(true);
    setProjectRefreshTrigger((v) => v + 1);
  }, []);

  const currentUserId = currentUserProfile?.id || currentUserProfile?._id || currentUserProfile?.userId || currentUserProfile?.user?.id || currentUserProfile?.user?._id;
  const currentUserEmail = String(currentUserProfile?.email || currentUserProfile?.user?.email || '').toLowerCase();
  const currentProjectRole = members.find((member) => {
    if (String(membersProjectId) !== String(projectId)) return false;
    const memberUserId = member.userId || member.id || member._id || member.user?.id || member.user?._id;
    const memberEmail = String(member.email || member.user?.email || '').toLowerCase();
    return (currentUserId && String(memberUserId) === String(currentUserId)) || (currentUserEmail && memberEmail === currentUserEmail);
  });
  const currentProjectRoleName = String(currentProjectRole?.role || currentProjectRole?.projectRole || currentProjectRole?.user?.role || '').toUpperCase();
  const canManage = isAdmin || ['PROJECT_MANAGER', 'TEAM_LEAD', 'ADMIN'].includes(globalRole) || ['PROJECT_MANAGER', 'TEAM_LEAD', 'ADMIN'].includes(currentProjectRoleName);

  const loadSprintRequests = useCallback(async () => {
    if (!projectId || !canManage) {
      setSprintRequests([]);
      return;
    }
    setSprintRequestsLoading(true);
    try {
      const response = await getProjectSprintRequests(projectId);
      setSprintRequests(getCollection(response, ['requests', 'items', 'content', 'results']));
      setSprintRequestsProjectId(String(projectId));
    } catch (error) {
      showToast('error', getFriendlyErrorMessage(error, 'sprint'));
      setSprintRequests([]);
      setSprintRequestsProjectId(String(projectId));
    } finally {
      setSprintRequestsLoading(false);
    }
  }, [projectId, canManage, showToast]);

  useEffect(() => {
    if (!projectId || !canManage) return undefined;
    let isMounted = true;
    getProjectSprintRequests(projectId)
      .then((response) => {
        if (!isMounted) return;
        setSprintRequests(getCollection(response, ['requests', 'items', 'content', 'results']));
        setSprintRequestsProjectId(String(projectId));
      })
      .catch((error) => {
        if (!isMounted) return;
        showToast('error', getFriendlyErrorMessage(error, 'sprint'));
        setSprintRequests([]);
        setSprintRequestsProjectId(String(projectId));
      });
    return () => { isMounted = false; };
  }, [projectId, canManage, showToast]);

  const isLoadingSprintRequests = sprintRequestsLoading || (canManage && projectId && sprintRequestsProjectId !== String(projectId));

  const handleApproveSprintRequest = async (request) => {
    const requestId = request.id || request.requestId || request.assignmentRequestId;
    const requestSprintId = request.sprintId || request.sprint?.id || request.sprint?.sprintId || request.sprint?._id;
    if (!requestId || !requestSprintId) {
      showToast('error', 'Unable to approve this request: sprint or request ID is missing.');
      return;
    }
    try {
      await approveSprintRequest(requestSprintId, requestId);
      showToast('success', 'Sprint assignment request approved.');
      await loadSprintRequests();
      loadSprints();
    } catch (error) {
      showToast('error', getFriendlyErrorMessage(error, 'sprint'));
    }
  };

  // Derived metrics for summary cards
  const summaryMetrics = useMemo(() => {
    const totalSprints = sprints.length;
    const activeSprints = sprints.filter((s) => {
      const norm = String(s.status || s.state || '').toUpperCase();
      return ['ACTIVE', 'IN_PROGRESS', 'STARTED'].includes(norm);
    }).length;
    const completedSprints = sprints.filter((s) => {
      const norm = String(s.status || s.state || '').toUpperCase();
      return ['COMPLETED', 'CLOSED', 'DONE'].includes(norm);
    }).length;
    const openIssues = projectIssues.filter((i) => {
      const norm = String(i.status || '').toUpperCase();
      return !['DONE', 'RESOLVED', 'CLOSED', 'COMPLETED'].includes(norm);
    }).length;

    return { totalSprints, activeSprints, completedSprints, openIssues };
  }, [sprints, projectIssues]);

  // Filtered sprints
  const filteredSprints = useMemo(() => {
    let result = [...sprints];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.goal || '').toLowerCase().includes(q) ||
        (s.key || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter((s) => {
        const norm = String(s.status || s.state || 'PLANNED').toUpperCase();
        if (statusFilter === 'PLANNED') return ['PLANNED', 'PLANNING', 'FUTURE'].includes(norm);
        if (statusFilter === 'ACTIVE') return ['ACTIVE', 'IN_PROGRESS', 'STARTED'].includes(norm);
        if (statusFilter === 'IN_REVIEW') return ['IN_REVIEW', 'REVIEW', 'TESTING'].includes(norm);
        if (statusFilter === 'COMPLETED') return ['COMPLETED', 'CLOSED', 'DONE'].includes(norm);
        return norm === statusFilter;
      });
    }
    if (assigneeFilter !== 'all') {
      result = result.filter((s) => {
        const assignee = s.contributorName || s.contributor?.name || '';
        return assignee.toLowerCase().includes(assigneeFilter.toLowerCase());
      });
    }
    if (sortOrder === 'due-desc') {
      result.sort((a, b) => new Date(b.endDate || 0) - new Date(a.endDate || 0));
    } else if (sortOrder === 'name') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else {
      // due-asc
      result.sort((a, b) => new Date(a.endDate || '9999-12-31') - new Date(b.endDate || '9999-12-31'));
    }
    return result;
  }, [sprints, searchQuery, statusFilter, assigneeFilter, sortOrder]);

  const handleSprintClick = (sprint) => {
    const id = getSprintId(sprint);
    if (!id) return;
    setSelectedSprint(sprint);
    setSelectedSprintId(String(id));
  };

  // If a sprint is selected, render full dedicated SprintDetailsView
  if (selectedSprintId) {
    return (
      <section className="min-h-[calc(100vh-7.5rem)] rounded-2xl bg-[#f4f5f7] p-4 text-slate-900 dark:bg-[#292929] dark:text-white sm:p-6 lg:p-7">
        <SprintDetailsView
          sprintId={selectedSprintId}
          initialSprint={selectedSprint}
          projectId={projectId}
          projectName={currentProject?.name}
          canManage={canManage}
          currentUserProfile={currentUserProfile}
          onBack={() => { setSelectedSprintId(''); setSelectedSprint(null); }}
          onSprintUpdated={loadSprints}
          onSprintDeleted={() => { setSelectedSprintId(''); setSelectedSprint(null); loadSprints(); }}
          onOpenEdit={(s) => { setSprintToEdit(s); setIsCreateEditOpen(true); }}
        />
        <CreateEditSprintModal
          isOpen={isCreateEditOpen}
          onClose={() => { setIsCreateEditOpen(false); setSprintToEdit(null); }}
          projectId={projectId}
          projectName={currentProject?.name}
          sprintToEdit={sprintToEdit}
          onSprintSaved={() => {
            loadSprints();
            showToast('success', 'Sprint saved successfully.');
          }}
        />
      </section>
    );
  }

  return (
    <section className="min-h-[calc(100vh-7.5rem)] min-w-0 space-y-4 rounded-xl bg-[#f0f0f0] p-4 text-slate-900 dark:bg-[#292929] dark:text-white sm:p-6 lg:p-7 animate-fadeIn">
      {/* 1. Header Row matching screenshot */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
            Sprints
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#a0a0a5] sm:text-sm">
            Plan, track and manage your sprints to deliver value faster.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => Promise.all([loadProjects(), loadSprints()])}
            disabled={projectsLoading || sprintsLoading}
            title="Refresh sprints"
            className="flex h-[38px] w-[38px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-[#2b2b30] dark:bg-[#1a1a1d] dark:text-[#ccc] cursor-pointer"
          >
            <FiRefreshCw size={15} className={projectsLoading || sprintsLoading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => { setSprintToEdit(null); setIsCreateEditOpen(true); }}
            disabled={!projectId}
            className="inline-flex h-[38px] items-center gap-2 rounded-xl bg-sky-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-sky-700 dark:bg-blue-600 dark:hover:bg-blue-500 sm:text-sm cursor-pointer disabled:opacity-50"
          >
            <FiPlus size={16} /> New sprint
          </button>
        </div>
      </div>

      {/* Notices */}
      {toastNotice && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          <span className="flex items-center gap-2"><FiCheckCircle />{toastNotice.message}</span>
          <button type="button" onClick={() => setToastNotice(null)} aria-label="Dismiss"><FiX /></button>
        </div>
      )}
      {projectsError && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          <span className="flex items-center gap-2"><FiAlertCircle />{projectsError}</span>
          <button type="button" onClick={loadProjects} className="font-semibold underline cursor-pointer">Retry</button>
        </div>
      )}
      {sprintsError && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          <span className="flex items-center gap-2"><FiAlertCircle />{sprintsError}</span>
          <button type="button" onClick={loadSprints} className="font-semibold underline cursor-pointer">Retry</button>
        </div>
      )}

      {/* 2. 4 Summary Cards Row matching screenshot */}
      <SprintsSummaryCards
        totalSprints={summaryMetrics.totalSprints}
        activeSprints={summaryMetrics.activeSprints}
        openIssues={summaryMetrics.openIssues}
        completedSprints={summaryMetrics.completedSprints}
      />

      {canManage && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#303030] dark:bg-[#1d1d1d] sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-[#303030]">
            <div className="flex items-center gap-2">
              <FiInbox size={17} className="text-sky-600 dark:text-sky-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Sprint Assignment Requests</h2>
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">{sprintRequests.length}</span>
            </div>
            <button type="button" onClick={loadSprintRequests} disabled={isLoadingSprintRequests} className="text-xs font-semibold text-sky-600 hover:underline disabled:opacity-50 dark:text-sky-400">Refresh</button>
          </div>
          {isLoadingSprintRequests ? (
            <p className="py-5 text-center text-xs text-slate-500 dark:text-[#999]">Loading assignment requests...</p>
          ) : sprintRequests.length ? (
            <div className="space-y-2">
              {sprintRequests.map((request, index) => {
                const requestId = request.id || request.requestId || request.assignmentRequestId || index;
                const requestSprintId = request.sprintId || request.sprint?.id || request.sprint?.sprintId || request.sprint?._id;
                const sprintName = request.sprintName || request.sprint?.name || sprints.find((sprint) => String(getSprintId(sprint)) === String(requestSprintId))?.name || 'Sprint';
                const requesterName = request.requester?.name || request.user?.name || request.requesterName || request.name || request.email || 'Project member';
                return (
                  <div key={requestId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-[#303030] dark:bg-[#222226]">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">{requesterName}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-[#999]">Requested assignment to {sprintName}</p>
                    </div>
                    <button type="button" onClick={() => handleApproveSprintRequest(request)} disabled={!requestSprintId} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                      <FiCheck size={13} /> Approve
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-5 text-center text-xs text-slate-500 dark:text-[#999]">No sprint assignment requests for this project.</p>
          )}
        </section>
      )}

      {/* 3. Board / List View Switcher Capsule matching screenshot */}
      <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-[#2b2b30] dark:bg-[#151518]">
        <button
          type="button"
          onClick={() => setLayoutView('board')}
          className={`rounded-lg px-6 py-2 text-xs font-bold transition cursor-pointer ${
            layoutView === 'board'
              ? 'border border-[#20204a] bg-[#141428] text-white shadow-xs dark:border-[#383860] dark:bg-[#1a1a36]'
              : 'text-slate-500 hover:text-slate-800 dark:text-[#888] dark:hover:text-white'
          }`}
        >
          Board
        </button>
        <button
          type="button"
          onClick={() => setLayoutView('list')}
          className={`rounded-lg px-6 py-2 text-xs font-bold transition cursor-pointer ${
            layoutView === 'list'
              ? 'border border-[#20204a] bg-[#141428] text-white shadow-xs dark:border-[#383860] dark:bg-[#1a1a36]'
              : 'text-slate-500 hover:text-slate-800 dark:text-[#888] dark:hover:text-white'
          }`}
        >
          List
        </button>
      </div>

      {/* 4. Controls Row: Search & Filters matching screenshot */}
      <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
        {/* Search input matching screenshot placeholder: Search issue.... */}
        <div className="relative min-w-[200px] flex-1 sm:w-72">
          <FiSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#777]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
            placeholder="Search issue...."
            className="h-[36px] w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-400 dark:border-[#2e2e34] dark:bg-[#1a1a1d] dark:text-white dark:placeholder:text-[#777]"
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(0); }}
            options={[
              { value: 'PLANNED', label: 'Planned' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'IN_REVIEW', label: 'In review' },
              { value: 'COMPLETED', label: 'Completed' },
            ]}
          />
          <FilterSelect
            label="Priority"
            value={priorityFilter}
            onChange={(v) => { setPriorityFilter(v); setPage(0); }}
            options={[
              { value: 'HIGH', label: 'High' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'LOW', label: 'Low' },
            ]}
          />
          <FilterSelect
            label="Project"
            value={projectId}
            onChange={(v) => { setProjectId(v); setPage(0); }}
            options={projects.map((p) => ({
              value: String(getProjectId(p)),
              label: p.name || 'Untitled project',
            }))}
          />
          <FilterSelect
            label="Assignee"
            value={assigneeFilter}
            onChange={(v) => { setAssigneeFilter(v); setPage(0); }}
            options={members.map((m) => {
              const name = m.name || m.fullName || m.email || 'Member';
              return { value: name, label: name };
            })}
          />
          <FilterSelect
            label="Sort by : Due date"
            value={sortOrder}
            onChange={setSortOrder}
            options={[
              { value: 'due-asc', label: 'Due date: earliest' },
              { value: 'due-desc', label: 'Due date: latest' },
              { value: 'name', label: 'Name: A-Z' },
            ]}
          />
        </div>
      </div>

      {/* 5. Main Content: Table or Board */}
      {layoutView === 'list' ? (
        <SprintsTable
          sprints={filteredSprints}
          isLoading={sprintsLoading}
          onSprintClick={handleSprintClick}
          page={page}
          pageSize={9}
          onPageChange={setPage}
        />
      ) : (
        <SprintsBoard
          sprints={filteredSprints}
          isLoading={sprintsLoading}
          onSprintClick={handleSprintClick}
          onStatusChange={handleSprintStatusChange}
          pendingSprintIds={pendingSprintIds}
          onCreateSprint={() => { setSprintToEdit(null); setIsCreateEditOpen(true); }}
        />
      )}

      {/* Create / Edit Sprint Modal */}
      <CreateEditSprintModal
        isOpen={isCreateEditOpen}
        onClose={() => { setIsCreateEditOpen(false); setSprintToEdit(null); }}
        projectId={projectId}
        projectName={currentProject?.name}
        sprintToEdit={sprintToEdit}
        onSprintSaved={() => {
          loadSprints();
          showToast('success', sprintToEdit ? 'Sprint updated.' : 'Sprint created.');
        }}
      />
    </section>
  );
};

export default SprintsView;
