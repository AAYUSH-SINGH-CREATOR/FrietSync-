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
  FiLayers,
  FiUser,
} from 'react-icons/fi';
import { getMyProjects, getProjectMembers } from '../../projects/services/projectApi';
import { getProjectIssues } from '../../issues/services/issueApi';
import {
  getProjectSprints,
  getProjectSprintRequests,
  approveSprintRequest,
  updateSprintStatus,
  startSprint,
  completeSprint,
  getFriendlyErrorMessage,
} from '../services/sprintsApi';
import SprintsSummaryCards from './SprintsSummaryCards';
import SprintsTable from './SprintsTable';
import SprintsBoard from './SprintsBoard';
import SprintDetailsView from './SprintDetailsView';
import CreateEditSprintModal from './CreateEditSprintModal';
import EmptyState from '../../../components/ui/EmptyState';
import LoadingScreen from '../../../components/ui/LoadingScreen';
import essprints from '../../../assets/essprints.png';

const getCollection = (value, keys) => {
  const queue = [value];
  const visited = new Set();
  while (queue.length) {
    const container = queue.shift();
    if (Array.isArray(container)) return container;
    if (!container || typeof container !== 'object' || visited.has(container)) continue;
    visited.add(container);
    for (const key of [...keys, 'data', 'result']) {
      if (container[key] !== undefined) queue.push(container[key]);
    }
  }
  return [];
};

const getProjectId = (project) => project?.id || project?.projectId || project?._id;
const getSprintId = (sprint) => sprint?.id || sprint?.sprintId || sprint?._id;
const getSprintProjectId = (sprint) => sprint?.projectId || sprint?.project?.id || sprint?.project?._id;

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
  const { currentUserProfile, isLoadingUserProfile } = useOutletContext() || {};
  const globalRole = String(currentUserProfile?.role || currentUserProfile?.user?.role || '').toUpperCase();
  const currentUserEmail = String(currentUserProfile?.email || currentUserProfile?.user?.email || '').toLowerCase();
  const isAdmin = ['ADMIN', 'WORKSPACE_ADMIN', 'OWNER'].includes(globalRole);

  const [projects, setProjects] = useState([]);
  // Empty means the all projects view. A specific ID filters to one project.
  const [projectId, setProjectId] = useState('');
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState('');

  const [sprints, setSprints] = useState([]);
  const [selectedView, setSelectedView] = useState('');
  const [sprintRequests, setSprintRequests] = useState([]);
  const [sprintRequestsLoading, setSprintRequestsLoading] = useState(false);
  const [sprintRequestsProjectId, setSprintRequestsProjectId] = useState('');
  const [pendingSprintIds, setPendingSprintIds] = useState(() => new Set());
  const pendingSprintIdsRef = useRef(new Set());
  const [sprintsLoading, setSprintsLoading] = useState(true);
  const [sprintsProjectId, setSprintsProjectId] = useState('');
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
  const selectedSprintProjectId = selectedSprint ? String(getSprintProjectId(selectedSprint) || '') : '';
  const selectedSprintProject = projects.find((project) => String(getProjectId(project)) === selectedSprintProjectId);

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

  // Load sprints for every project by default, or for the selected project.
  useEffect(() => {
    if (projectsLoading) return undefined;

    const targetProjects = projectId
      ? projects.filter((project) => String(getProjectId(project)) === String(projectId))
      : projects;

    if (targetProjects.length === 0) {
      setSprints([]);
      setSprintsProjectId(projectId || 'all');
      setSprintsLoading(false);
      return undefined;
    }

    let isMounted = true;
    setSprintsProjectId('');
    setSprintsError('');
    setSprintsLoading(true);
    Promise.allSettled(targetProjects.map(async (project) => {
      const id = String(getProjectId(project));
      const response = await getProjectSprints(id);
      return getCollection(response, ['sprints', 'items', 'content', 'results']).map((sprint) => ({
        ...sprint,
        projectId: sprint.projectId || sprint.project?.id || sprint.project?._id || id,
        projectName: sprint.projectName || sprint.project?.name || project.name || 'Untitled project',
      }));
    }))
      .then((results) => {
        if (!isMounted) return;
        const fulfilled = results.filter((result) => result.status === 'fulfilled');
        const failed = results.filter((result) => result.status === 'rejected');
        setSprints(fulfilled.flatMap((result) => result.value));
        setSprintsProjectId(projectId || 'all');
        setSprintsError(failed.length === targetProjects.length
          ? getFriendlyErrorMessage(failed[0].reason, 'sprint')
          : failed.length
            ? 'Some project sprints could not be loaded.'
            : '');
        setSprintsLoading(false);
      });

    return () => { isMounted = false; };
  }, [projectId, projects, projectsLoading, sprintRefreshTrigger]);

  // Load Project Issues & Members for accurate metrics & filters
  useEffect(() => {
    if (projectsLoading) return undefined;
    const targetProjects = projectId
      ? projects.filter((project) => String(getProjectId(project)) === String(projectId))
      : projects;
    if (targetProjects.length === 0) {
      setProjectIssues([]);
      setMembers([]);
      return undefined;
    }
    let isMounted = true;
    Promise.all(targetProjects.map(async (project) => {
      const id = String(getProjectId(project));
      const [issuesResult, membersResult] = await Promise.allSettled([
        getProjectIssues(id, { page: 0, size: 100 }),
        getProjectMembers(id),
      ]);
      const issues = issuesResult.status === 'fulfilled'
        ? getCollection(issuesResult.value, ['issues', 'items', 'content', 'results'])
        : [];
      const projectMembers = membersResult.status === 'fulfilled'
        ? getCollection(membersResult.value, ['members', 'items', 'content', 'results'])
        : [];
      return {
        issues: issues.map((issue) => ({ ...issue, projectId: issue.projectId || id })),
        members: projectMembers.map((member) => ({ ...member, projectId: id })),
      };
    })).then((results) => {
      if (!isMounted) return;
      setProjectIssues(results.flatMap((result) => result.issues));
      setMembers(results.flatMap((result) => result.members));
      setMembersProjectId(projectId || 'all');
    });

    return () => { isMounted = false; };
  }, [projectId, projects, projectsLoading]);

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
    const sprintProjectId = String(getSprintProjectId(sprint) || '');
    const userId = currentUserProfile?.id || currentUserProfile?._id || currentUserProfile?.userId || currentUserProfile?.user?.id || currentUserProfile?.user?._id;
    const contributorId = sprint.contributorId || sprint.assignedContributorId || sprint.contributor?.id || sprint.contributor?._id || sprint.contributor?.userId;
    const isProjectManager = globalRole === 'PROJECT_MANAGER' || members.some((member) => {
      if (String(member.projectId) !== sprintProjectId) return false;
      const memberId = member.userId || member.id || member._id || member.user?.id || member.user?._id;
      const memberEmail = String(member.email || member.user?.email || '').toLowerCase();
      return ((userId && String(memberId) === String(userId)) || (currentUserEmail && memberEmail === currentUserEmail)) &&
        String(member.role || member.projectRole || member.user?.role || '').toUpperCase() === 'PROJECT_MANAGER';
    });
    const assignedToCurrentUser = (userId && String(contributorId) === String(userId)) ||
      (currentUserEmail && String(sprint.contributorEmail || sprint.assignedContributorEmail || sprint.contributor?.email || '').toLowerCase() === currentUserEmail);
    if (!isProjectManager && !assignedToCurrentUser) {
      showToast('error', 'Only the project manager or assigned sprint contributor can change sprint status.');
      return;
    }
    const canSetAnyStatus = isAdmin || isProjectManager;
    const isStartTransition = currentStatus === 'PLANNED' && destinationColumnId === 'ACTIVE';
    const isCompleteTransition = currentStatus === 'ACTIVE' && destinationColumnId === 'COMPLETED';
    if (!canSetAnyStatus && !isStartTransition && !isCompleteTransition) {
      showToast('error', 'That sprint status transition is not supported by the available sprint actions.');
      return;
    }

    pendingSprintIdsRef.current.add(key);
    setPendingSprintIds(new Set(pendingSprintIdsRef.current));
    try {
      if (canSetAnyStatus) {
        await updateSprintStatus(sprintId, destinationColumnId);
      } else if (isStartTransition) {
        await startSprint(sprintId);
      } else {
        await completeSprint(sprintId);
      }
      showToast(
        'success',
        canSetAnyStatus
          ? `Sprint moved to ${destinationColumnId.replace(/[_-]/g, ' ').toLowerCase()}.`
          : isStartTransition
          ? 'Sprint started successfully.'
          : 'Sprint completed successfully.'
      );
      loadSprints();
    } catch (error) {
      showToast('error', getFriendlyErrorMessage(error, 'sprint'));
    } finally {
      pendingSprintIdsRef.current.delete(key);
      setPendingSprintIds(new Set(pendingSprintIdsRef.current));
    }
  }, [loadSprints, showToast, currentUserProfile, globalRole, members, currentUserEmail, isAdmin]);

  const loadProjects = useCallback(() => {
    setProjectsLoading(true);
    setProjectRefreshTrigger((v) => v + 1);
  }, []);

  const currentUserId = currentUserProfile?.id || currentUserProfile?._id || currentUserProfile?.userId || currentUserProfile?.user?.id || currentUserProfile?.user?._id;
  const findProjectRole = useCallback((targetProjectId) => members.find((member) => {
    if (String(member.projectId) !== String(targetProjectId)) return false;
    const memberUserId = member.userId || member.id || member._id || member.user?.id || member.user?._id;
    const memberEmail = String(member.email || member.user?.email || '').toLowerCase();
    return (currentUserId && String(memberUserId) === String(currentUserId)) || (currentUserEmail && memberEmail === currentUserEmail);
  }), [members, currentUserId, currentUserEmail]);
  const currentProjectRole = projectId ? findProjectRole(projectId) : null;
  const currentProjectRoleName = String(currentProjectRole?.role || currentProjectRole?.projectRole || currentProjectRole?.user?.role || '').toUpperCase();
  const selectedSprintProjectRole = selectedSprintProjectId ? findProjectRole(selectedSprintProjectId) : null;
  const selectedSprintProjectRoleName = String(selectedSprintProjectRole?.role || selectedSprintProjectRole?.projectRole || selectedSprintProjectRole?.user?.role || '').toUpperCase();
  const isProjectRequestManager = useCallback((targetProjectId) => {
    const targetProject = projects.find((project) => String(getProjectId(project)) === String(targetProjectId));
    return Boolean(currentUserId && targetProject && (
      String(targetProject.adminId || '') === String(currentUserId) ||
      String(targetProject.projectManagerId || targetProject.projectManager?.id || targetProject.projectManager?._id || '') === String(currentUserId)
    ));
  }, [projects, currentUserId]);
  const canManageSelectedSprint = isAdmin || ['PROJECT_MANAGER', 'TEAM_LEAD', 'ADMIN'].includes(globalRole) || ['PROJECT_MANAGER', 'TEAM_LEAD', 'ADMIN'].includes(selectedSprintProjectRoleName);
  const canApproveSelectedSprintRequests = isProjectRequestManager(selectedSprintProjectId);
  const canManage = isAdmin || ['PROJECT_MANAGER', 'TEAM_LEAD', 'ADMIN'].includes(globalRole) || ['PROJECT_MANAGER', 'TEAM_LEAD', 'ADMIN'].includes(currentProjectRoleName);
  const canApproveSprintRequests = projectId
    ? isProjectRequestManager(projectId)
    : projects.some((project) => isProjectRequestManager(getProjectId(project)));
  const hasManagementRole = isAdmin || ['PROJECT_MANAGER', 'TEAM_LEAD', 'LEAD'].includes(globalRole) || projects.some((project) => {
    const role = findProjectRole(getProjectId(project));
    return ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'LEAD'].includes(
      String(role?.role || role?.projectRole || role?.user?.role || '').toUpperCase()
    );
  });
  const activeView = selectedView === 'assigned' && hasManagementRole
    ? 'all'
    : selectedView || (!hasManagementRole && globalRole === 'CONTRIBUTOR' ? 'assigned' : 'all');
  const canCreateSprint = isLoadingUserProfile === false && canManage;

  const loadSprintRequests = useCallback(async () => {
    if (!canApproveSprintRequests) {
      setSprintRequests([]);
      return;
    }
    const targetProjects = (projectId
      ? projects.filter((project) => String(getProjectId(project)) === String(projectId))
      : projects.filter((project) => isProjectRequestManager(getProjectId(project))));
    setSprintRequestsLoading(true);
    try {
      const results = await Promise.allSettled(targetProjects.map(async (project) => {
        const id = String(getProjectId(project));
        const response = await getProjectSprintRequests(id);
        return getCollection(response, ['requests', 'items', 'content', 'results']).map((request) => ({
          ...request,
          projectId: request.projectId || id,
          projectName: request.projectName || project.name || 'Untitled project',
        }));
      }));
      setSprintRequests(results.filter((result) => result.status === 'fulfilled').flatMap((result) => result.value));
      setSprintRequestsProjectId(projectId || 'all');
    } catch (error) {
      showToast('error', getFriendlyErrorMessage(error, 'sprint'));
      setSprintRequests([]);
      setSprintRequestsProjectId(projectId || 'all');
    } finally {
      setSprintRequestsLoading(false);
    }
  }, [projectId, projects, canApproveSprintRequests, isProjectRequestManager, showToast]);

  useEffect(() => {
    if (projectsLoading) return;
    loadSprintRequests();
  }, [projectsLoading, loadSprintRequests]);

  const isLoadingSprintRequests = sprintRequestsLoading || (canApproveSprintRequests && sprintRequestsProjectId !== (projectId || 'all'));
  const pendingSprintRequests = useMemo(
    () => sprintRequests.filter((request) => String(request.status || '').toUpperCase() === 'PENDING'),
    [sprintRequests]
  );

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
      return norm === 'ACTIVE';
    }).length;
    const completedSprints = sprints.filter((s) => {
      const norm = String(s.status || s.state || '').toUpperCase();
      return norm === 'COMPLETED';
    }).length;
    const openIssues = projectIssues.filter((i) => {
      const norm = String(i.status || '').toUpperCase();
      return !['RESOLVED', 'CLOSED'].includes(norm);
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
        if (statusFilter === 'PLANNED') return norm === 'PLANNED';
        if (statusFilter === 'ACTIVE') return norm === 'ACTIVE';
        if (statusFilter === 'COMPLETED') return norm === 'COMPLETED';
        return norm === statusFilter;
      });
    }
    if (assigneeFilter !== 'all') {
      result = result.filter((s) => {
        const assignee = s.contributorName || s.assignedContributorName || s.contributor?.name || '';
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

  const visibleSprints = useMemo(() => {
    if (activeView !== 'assigned') return filteredSprints;
    return filteredSprints.filter((sprint) => {
      const contributorId = sprint.contributorId || sprint.assignedContributorId || sprint.contributor?.id || sprint.contributor?._id || sprint.contributor?.userId;
      const contributorEmail = String(sprint.contributorEmail || sprint.assignedContributorEmail || sprint.contributor?.email || '').toLowerCase();
      return (currentUserId && String(contributorId || '') === String(currentUserId)) ||
        (currentUserEmail && contributorEmail === currentUserEmail);
    });
  }, [activeView, filteredSprints, currentUserId, currentUserEmail]);

  const handleSprintClick = (sprint) => {
    const id = getSprintId(sprint);
    if (!id) return;
    setSelectedSprint(sprint);
    setSelectedSprintId(String(id));
  };

  if (projectsLoading && projects.length === 0) {
    return <LoadingScreen fullScreen label="Loading sprint projects" />;
  }

  // If a sprint is selected, render full dedicated SprintDetailsView
  if (selectedSprintId) {
    return (
      <section className="min-h-[calc(100vh-7.5rem)] rounded-2xl bg-[#f4f5f7] p-4 text-slate-900 dark:bg-[#292929] dark:text-white sm:p-6 lg:p-7">
        <SprintDetailsView
          sprintId={selectedSprintId}
          initialSprint={selectedSprint}
          projectId={selectedSprintProjectId}
          projectName={selectedSprintProject?.name || selectedSprint?.projectName}
          canManage={canManageSelectedSprint}
          currentProjectRoleName={selectedSprintProjectRoleName}
          canViewSprintRequests={canApproveSelectedSprintRequests}
          currentUserProfile={currentUserProfile}
          onBack={() => { setSelectedSprintId(''); setSelectedSprint(null); }}
          onSprintUpdated={loadSprints}
          onSprintDeleted={() => { setSelectedSprintId(''); setSelectedSprint(null); loadSprints(); }}
          onOpenEdit={(s) => { setSprintToEdit(s); setIsCreateEditOpen(true); }}
        />
        <CreateEditSprintModal
          isOpen={isCreateEditOpen && (sprintToEdit ? canManageSelectedSprint : canCreateSprint && Boolean(projectId))}
          onClose={() => { setIsCreateEditOpen(false); setSprintToEdit(null); }}
          projectId={sprintToEdit ? selectedSprintProjectId : projectId}
          projectName={sprintToEdit ? selectedSprintProject?.name || selectedSprint?.projectName : currentProject?.name}
          sprintToEdit={sprintToEdit}
          onSprintSaved={() => {
            loadSprints();
            showToast('success', 'Sprint saved successfully.');
          }}
        />
      </section>
    );
  }

  const isCurrentProjectSprintsLoaded = sprintsProjectId === (projectId || 'all');
  const hasNoSprintsToShow = activeView === 'all' && !projectsLoading && !projectsError && isCurrentProjectSprintsLoaded && !sprintsLoading && !sprintsError &&
    sprints.length > 0 && visibleSprints.length === 0;
  if (hasNoSprintsToShow) {
    const hasNoProjects = projects.length === 0;
    return (
      <>
        <section className="min-h-[calc(100vh-7.5rem)] rounded-xl bg-[#f0f0f0] p-4 text-slate-900 dark:bg-[#292929] dark:text-white sm:p-6 lg:p-7">
          <EmptyState
            title="Sprints"
            subtitle={hasNoProjects
              ? 'Create or join a project to start planning sprints.'
              : sprints.length === 0
              ? 'No sprints yet. Create a sprint to plan your next delivery.'
              : 'No sprints match your current search or filters.'}
            illustration={essprints}
            illustrationAlt="No sprints yet"
            actionButton={!hasNoProjects && sprints.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setAssigneeFilter('all');
                  setPage(0);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                <FiRefreshCw size={15} /> Reset filters
              </button>
            ) : !hasNoProjects && canCreateSprint ? (
              <button
                type="button"
                onClick={() => { setSprintToEdit(null); setIsCreateEditOpen(true); }}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                <FiPlus size={16} /> Create Sprint
              </button>
            ) : null}
          />
        </section>
        <CreateEditSprintModal
          isOpen={isCreateEditOpen && !sprintToEdit && canCreateSprint && Boolean(projectId)}
          onClose={() => { setIsCreateEditOpen(false); setSprintToEdit(null); }}
          projectId={projectId}
          projectName={currentProject?.name}
          sprintToEdit={sprintToEdit}
          onSprintSaved={() => {
            loadSprints();
            showToast('success', 'Sprint created.');
          }}
        />
      </>
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
            className="flex h-[38px] w-[38px] items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-[#3a3a3a] dark:bg-[#202020] dark:text-[#ddd] dark:hover:bg-[#333] cursor-pointer"
          >
            <FiRefreshCw size={15} className={projectsLoading || sprintsLoading ? 'animate-spin' : ''} />
          </button>
          {canCreateSprint && Boolean(projectId) && (
            <button
              type="button"
              onClick={() => { setSprintToEdit(null); setIsCreateEditOpen(true); }}
              disabled={!projectId}
              className="inline-flex h-[38px] items-center gap-2 rounded-xl bg-sky-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-sky-700 sm:text-sm cursor-pointer disabled:opacity-50"
            >
              <FiPlus size={16} /> New sprint
            </button>
          )}
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

      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 pb-1 dark:border-[#38383e]">
        <button
          type="button"
          onClick={() => { setSelectedView('all'); setPage(0); }}
          className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${activeView === 'all' ? 'bg-white text-slate-900 shadow-xs dark:bg-[#202020] dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-[#888] dark:hover:text-white'}`}
        >
          <FiLayers size={14} /> Project Sprints
        </button>
        {!hasManagementRole && (
          <button
            type="button"
            onClick={() => { setSelectedView('assigned'); setPage(0); }}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${activeView === 'assigned' ? 'bg-white text-slate-900 shadow-xs dark:bg-[#202020] dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-[#888] dark:hover:text-white'}`}
          >
            <FiUser size={14} /> Assigned to Me
          </button>
        )}
        {canApproveSprintRequests && (
          <button
            type="button"
            onClick={() => setSelectedView('requests')}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${activeView === 'requests' ? 'bg-white text-slate-900 shadow-xs dark:bg-[#202020] dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-[#888] dark:hover:text-white'}`}
          >
            <FiInbox size={14} /> Sprint Requests
            {pendingSprintRequests.length > 0 && <span className="ml-1 rounded-full bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{pendingSprintRequests.length}</span>}
          </button>
        )}
      </div>

      {activeView === 'requests' && canApproveSprintRequests ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-[#303030] dark:bg-[#1f1f1f] sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-[#303030]">
            <div className="flex items-center gap-2">
              <FiInbox size={17} className="text-sky-600 dark:text-sky-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Sprint Assignment Requests</h2>
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">{pendingSprintRequests.length}</span>
            </div>
            <button type="button" onClick={loadSprintRequests} disabled={isLoadingSprintRequests} className="text-xs font-semibold text-sky-600 hover:underline disabled:opacity-50 dark:text-sky-400">Refresh</button>
          </div>
          {isLoadingSprintRequests ? (
            <p className="py-5 text-center text-xs text-slate-500 dark:text-[#999]">Loading assignment requests...</p>
          ) : pendingSprintRequests.length ? (
            <div className="space-y-2">
              {pendingSprintRequests.map((request, index) => {
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
                    {canApproveSprintRequests && (
                      <button type="button" onClick={() => handleApproveSprintRequest(request)} disabled={!requestSprintId} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                        <FiCheck size={13} /> Approve
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-5 text-center text-xs text-slate-500 dark:text-[#999]">No sprint assignment requests for this project.</p>
          )}
        </section>
      ) : (
      <>

     
{/* Board / List View Switcher */}
<div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-[#2b2b30] dark:bg-[#1f1f1f]">
  <button
    type="button"
    onClick={() => setLayoutView('board')}
    aria-pressed={layoutView === 'board'}
    className={`cursor-pointer rounded-lg border px-6 py-2 text-xs font-bold transition-colors duration-200 ${
      layoutView === 'board'
        ? 'border-slate-300 bg-white text-slate-900 shadow-sm dark:border-[#383860] dark:bg-[#1a1a36] dark:text-white'
        : 'border-transparent bg-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:text-[#888] dark:hover:bg-[#222228] dark:hover:text-white'
    }`}
  >
    Board
  </button>

  <button
    type="button"
    onClick={() => setLayoutView('list')}
    aria-pressed={layoutView === 'list'}
    className={`cursor-pointer rounded-lg border px-6 py-2 text-xs font-bold transition-colors duration-200 ${
      layoutView === 'list'
        ? 'border-slate-300 bg-white text-slate-900 shadow-sm dark:border-[#383860] dark:bg-[#1a1a36] dark:text-white'
        : 'border-transparent bg-transparent text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:text-[#888] dark:hover:bg-[#222228] dark:hover:text-white'
    }`}
  >
    List
  </button>
</div>


      {/* 4. Controls Row: Search & Filters matching screenshot */}
      <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
        {/* Search sprints */}
        <div className="relative min-w-[200px] flex-1 sm:w-72">
          <FiSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#777]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
            placeholder="Search sprints..."
            className="h-[36px] w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-400 dark:border-[#2e2e34] dark:bg-[#1f1f1f] dark:text-white dark:placeholder:text-[#999]"
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
            value={projectId || 'all'}
            onChange={(v) => { setProjectId(v === 'all' ? '' : v); setPage(0); }}
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

      {/* A project with no sprints keeps the normal controls and gets a direct create action. */}
      {activeView !== 'assigned' && !projectId && sprints.length === 0 ? (
        <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 px-5 py-10 text-center dark:border-[#414148] dark:bg-[#1f1f1f]/70">
          <p className="text-sm font-semibold text-slate-800 dark:text-white">There are no sprints in your projects yet.</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#aaa]">Create a sprint from a specific project.</p>
        </div>
      ) : !sprintsLoading && (activeView === 'assigned' ? visibleSprints.length === 0 : sprints.length === 0) ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-5 py-10 text-center dark:border-[#414148] dark:bg-[#1f1f1f]/70">
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">{activeView === 'assigned' ? 'No sprints are assigned to you yet.' : `No sprints in ${currentProject?.name || 'this project'} yet.`}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-[#aaa]">{activeView === 'assigned' ? 'Sprints assigned to you will appear here.' : 'Create a sprint to start planning work for this project.'}</p>
          </div>
          {canCreateSprint && Boolean(projectId) && (
            <button
              type="button"
              onClick={() => { setSprintToEdit(null); setIsCreateEditOpen(true); }}
              className="inline-flex h-[38px] items-center gap-2 rounded-xl bg-sky-600 px-4 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              <FiPlus size={16} /> Create Sprint
            </button>
          )}
        </div>
      ) : layoutView === 'list' ? (
        <SprintsTable
          sprints={visibleSprints}
          isLoading={sprintsLoading}
          onSprintClick={handleSprintClick}
          page={page}
          pageSize={9}
          onPageChange={setPage}
        />
      ) : (
        <SprintsBoard
          sprints={visibleSprints}
          isLoading={sprintsLoading}
          onSprintClick={handleSprintClick}
          onStatusChange={handleSprintStatusChange}
          pendingSprintIds={pendingSprintIds}
          onCreateSprint={canCreateSprint && Boolean(projectId) ? () => { setSprintToEdit(null); setIsCreateEditOpen(true); } : undefined}
        />
      )}
      </>
      )}

      {/* Create / Edit Sprint Modal */}
      <CreateEditSprintModal
        isOpen={isCreateEditOpen && (sprintToEdit ? canManageSelectedSprint : canCreateSprint && Boolean(projectId))}
        onClose={() => { setIsCreateEditOpen(false); setSprintToEdit(null); }}
        projectId={sprintToEdit ? selectedSprintProjectId : projectId}
        projectName={sprintToEdit ? selectedSprintProject?.name || selectedSprint?.projectName : currentProject?.name}
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
