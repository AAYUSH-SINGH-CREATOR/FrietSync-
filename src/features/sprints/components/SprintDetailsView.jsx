import { useState, useEffect, useCallback, useMemo } from 'react';
import { formatRoleLabel } from '../../../utils/formatRoleLabel';
import {
  FiArrowLeft, FiCalendar, FiClock, FiUser, FiCheckCircle, FiEdit2,
  FiTrash2, FiRefreshCw, FiPlay, FiCheck, FiLayers, FiAlertCircle,
  FiUserPlus, FiInbox, FiFlag, FiTarget, FiActivity, FiTrendingUp,
  FiCheckSquare, FiXCircle, FiSearch,
} from 'react-icons/fi';
import {
  getSprintById, startSprint, completeSprint, deleteSprint,
  assignSprint, requestSprintAssignment, getProjectSprintRequests, approveSprintRequest,
  getSprintComments, createSprintComment, updateSprintComment, deleteSprintComment,
  getSprintIssues, getSprintMilestones,
  getFriendlyErrorMessage,
} from '../services/sprintsApi';
import CommentsThread from '../../../components/ui/CommentsThread';
import { getProjectMembers } from '../../projects/services/projectApi';

const formatDate = (dateStr) => {
  if (!dateStr) return 'Not set';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return String(dateStr);
  }
};

const getStatusBadge = (status) => {
  const norm = String(status || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (norm === 'COMPLETED') {
    return { label: 'Completed', className: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' };
  }
  if (norm === 'ACTIVE') {
    return { label: 'Active', className: 'border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-300' };
  }
  return { label: 'Planned', className: 'border-purple-500/40 bg-purple-500/15 text-purple-700 dark:text-purple-300' };
};

const getPriorityBadge = (priority) => {
  const norm = String(priority || '').toUpperCase();
  if (norm === 'CRITICAL' || norm === 'URGENT') {
    return 'border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300';
  }
  if (norm === 'HIGH') {
    return 'border-orange-500/40 bg-orange-500/15 text-orange-700 dark:text-orange-300';
  }
  if (norm === 'MEDIUM') {
    return 'border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300';
  }
  return 'border-slate-300/40 bg-slate-100 text-slate-600 dark:text-slate-400';
};

const getIssueStatusBadge = (status) => {
  const norm = String(status || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (norm === 'RESOLVED' || norm === 'CLOSED' || norm === 'DONE') {
    return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
  }
  if (norm === 'IN_PROGRESS') {
    return 'border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-300';
  }
  if (norm === 'BLOCKED') {
    return 'border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300';
  }
  return 'border-slate-300/40 bg-slate-100 text-slate-600 dark:bg-slate-800/30 dark:text-slate-400';
};

const SprintDetailsView = ({
  sprintId,
  initialSprint,
  projectId,
  projectName = 'Project',
  onBack,
  onSprintUpdated,
  onSprintDeleted,
  onOpenEdit,
  canManage = false,
  currentProjectRoleName = '',
  canViewSprintRequests = false,
  onIssueClick,
  currentUserProfile = null,
}) => {
  const [sprint, setSprint] = useState(initialSprint || null);
  const [isLoading, setIsLoading] = useState(!initialSprint);
  const [error, setError] = useState('');
  const [toastNotice, setToastNotice] = useState(null);
  const [busyAction, setBusyAction] = useState('');
  const [detailsTrigger, setDetailsTrigger] = useState(0);
  const [requestsTrigger, setRequestsTrigger] = useState(0);
  const [sprintCommentsCount, setSprintCommentsCount] = useState(0);

  // Sprint Issues from dedicated endpoint
  const [sprintIssues, setSprintIssues] = useState([]);
  const [isLoadingIssues, setIsLoadingIssues] = useState(true);

  // Sprint Milestones
  const [sprintMilestones, setSprintMilestones] = useState([]);
  const [isLoadingMilestones, setIsLoadingMilestones] = useState(true);

  // Project Members for assignment
  const [members, setMembers] = useState([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  // Assignment Requests
  const [requests, setRequests] = useState([]);

  const showToast = useCallback((type, message) => {
    setToastNotice({ type, message });
    window.setTimeout(() => setToastNotice(null), 4000);
  }, []);

  const loadDetails = useCallback(() => {
    setIsLoading(true);
    setDetailsTrigger((c) => c + 1);
  }, []);

  useEffect(() => {
    if (!sprintId) return undefined;
    let isMounted = true;
    getSprintById(sprintId)
      .then((data) => {
        if (!isMounted) return;
        const unwrapped = data?.sprint || data?.data || data;
        setSprint(unwrapped);
        setError('');
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(getFriendlyErrorMessage(err, 'sprint'));
        setIsLoading(false);
      });
    return () => { isMounted = false; };
  }, [sprintId, detailsTrigger]);

  // Load sprint issues from dedicated endpoint
  useEffect(() => {
    if (!sprintId) return undefined;
    let isMounted = true;
    setIsLoadingIssues(true);
    getSprintIssues(sprintId)
      .then((data) => {
        if (!isMounted) return;
        const items = Array.isArray(data) ? data : (data?.items || data?.content || data?.data || []);
        setSprintIssues(items);
        setIsLoadingIssues(false);
      })
      .catch((err) => {
        console.warn('Failed loading sprint issues:', err);
        if (isMounted) {
          setSprintIssues([]);
          setIsLoadingIssues(false);
        }
      });
    return () => { isMounted = false; };
  }, [sprintId, detailsTrigger]);

  // Load sprint milestones
  useEffect(() => {
    if (!sprintId) return undefined;
    let isMounted = true;
    setIsLoadingMilestones(true);
    getSprintMilestones(sprintId)
      .then((data) => {
        if (!isMounted) return;
        const items = Array.isArray(data) ? data : (data?.items || data?.content || data?.data || []);
        setSprintMilestones(items);
        setIsLoadingMilestones(false);
      })
      .catch((err) => {
        console.warn('Failed loading sprint milestones:', err);
        if (isMounted) {
          setSprintMilestones([]);
          setIsLoadingMilestones(false);
        }
      });
    return () => { isMounted = false; };
  }, [sprintId, detailsTrigger]);

  // Load members if manager
  useEffect(() => {
    const pid = projectId || sprint?.projectId || sprint?.project?.id;
    if (!pid || !canManage) return undefined;
    let isMounted = true;
    getProjectMembers(pid)
      .then((data) => {
        if (!isMounted) return;
        const list = Array.isArray(data) ? data : (data?.members || []);
        setMembers(list);
      })
      .catch((err) => console.warn('Failed loading members for sprint assignment:', err));
    return () => { isMounted = false; };
  }, [projectId, sprint?.projectId, sprint?.project?.id, canManage]);

  // Load sprint assignment requests if manager
  const loadRequests = useCallback(() => {
    setRequestsTrigger((c) => c + 1);
  }, []);

  useEffect(() => {
    const pid = projectId || sprint?.projectId || sprint?.project?.id;
    if (!pid || !canViewSprintRequests) return undefined;
    let isMounted = true;
    getProjectSprintRequests(pid)
      .then((data) => {
        if (!isMounted) return;
        const list = Array.isArray(data) ? data : (data?.requests || data?.items || data?.data?.requests || data?.data?.items || []);
        setRequests(list);
      })
      .catch((err) => console.warn('Failed loading sprint requests:', err));
    return () => { isMounted = false; };
  }, [projectId, sprint?.projectId, sprint?.project?.id, canViewSprintRequests, requestsTrigger]);

  const currentStatus = String(sprint?.status || sprint?.state || 'PLANNED').toUpperCase();
  const isCompleted = currentStatus === 'COMPLETED';
  const isActive = currentStatus === 'ACTIVE';
  const isPlanned = currentStatus === 'PLANNED';
  const currentUserId = currentUserProfile?.id || currentUserProfile?._id || currentUserProfile?.userId || currentUserProfile?.user?.id || currentUserProfile?.user?._id;
  const sprintContributorId = sprint?.contributorId || sprint?.assignedContributorId || sprint?.contributor?.id || sprint?.contributor?._id || sprint?.contributor?.userId;
  const sprintContributorName = sprint?.contributorName || sprint?.assignedContributorName || sprint?.contributor?.name;
  const sprintContributorEmail = sprint?.contributorEmail || sprint?.assignedContributorEmail || sprint?.contributor?.email;
  const currentUserEmail = String(currentUserProfile?.email || currentUserProfile?.user?.email || '').toLowerCase();
  const canTransitionSprint = currentProjectRoleName === 'PROJECT_MANAGER' ||
    String(currentUserProfile?.role || currentUserProfile?.user?.role || '').toUpperCase() === 'PROJECT_MANAGER' ||
    (currentUserId && String(sprintContributorId) === String(currentUserId)) ||
    (currentUserEmail && String(sprintContributorEmail || '').toLowerCase() === currentUserEmail);
  const hasAssignedContributor = Boolean(sprintContributorId || sprintContributorEmail || sprintContributorName);
  const canRequestAssignment = !canManage && !isCompleted && !hasAssignedContributor;

  const statusBadge = getStatusBadge(currentStatus);
  const assignableContributors = useMemo(() => members.filter((member) => {
    const role = String(member.role || member.projectRole || member.user?.role || '').toUpperCase();
    if (role !== 'CONTRIBUTOR') return false;
    const query = memberSearchQuery.trim().toLowerCase();
    if (!query) return true;
    const name = member.name || member.userName || member.fullName || member.email || '';
    const email = member.email || member.user?.email || '';
    return `${name} ${email}`.toLowerCase().includes(query);
  }), [members, memberSearchQuery]);

  const linkedSprintIssues = useMemo(() => {
    if (sprintIssues.length > 0) return sprintIssues;
    const detailIssues = Array.isArray(sprint?.issues) ? sprint.issues : Array.isArray(sprint?.items) ? sprint.items : [];
    if (detailIssues.length > 0) return detailIssues;
    if (!sprint?.issueId) return [];
    return [{
      id: sprint.issueId,
      issueId: sprint.issueId,
      issueNumber: sprint.issueNumber,
      title: sprint.issueTitle,
    }];
  }, [sprint, sprintIssues]);

  // Calculate sprint metrics
  const sprintMetrics = useMemo(() => {
    const totalIssues = linkedSprintIssues.length;
    const resolvedIssues = linkedSprintIssues.filter((i) => {
      const s = String(i.status || '').toUpperCase().replace(/[\s-]+/g, '_');
      return s === 'RESOLVED' || s === 'CLOSED' || s === 'DONE';
    }).length;
    const inProgressIssues = linkedSprintIssues.filter((i) => {
      const s = String(i.status || '').toUpperCase().replace(/[\s-]+/g, '_');
      return s === 'IN_PROGRESS';
    }).length;
    const blockedIssues = linkedSprintIssues.filter((i) => {
      const s = String(i.status || '').toUpperCase().replace(/[\s-]+/g, '_');
      return s === 'BLOCKED';
    }).length;
    const completionRate = totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 0;

    const totalEstimatedHours = linkedSprintIssues.reduce((sum, i) => sum + (Number(i.estimatedHours) || 0), 0);

    return {
      totalIssues,
      resolvedIssues,
      inProgressIssues,
      blockedIssues,
      completionRate,
      totalEstimatedHours,
    };
  }, [linkedSprintIssues]);

  const handleStart = async () => {
    setBusyAction('start');
    try {
      await startSprint(sprintId);
      showToast('success', 'Sprint started successfully.');
      loadDetails();
      onSprintUpdated?.();
    } catch (err) {
      showToast('error', getFriendlyErrorMessage(err, 'sprint'));
    } finally {
      setBusyAction('');
    }
  };

  const handleComplete = async () => {
    setBusyAction('complete');
    try {
      await completeSprint(sprintId);
      showToast('success', 'Sprint completed successfully.');
      loadDetails();
      onSprintUpdated?.();
    } catch (err) {
      showToast('error', getFriendlyErrorMessage(err, 'sprint'));
    } finally {
      setBusyAction('');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this sprint? This action cannot be undone.')) return;
    setBusyAction('delete');
    try {
      await deleteSprint(sprintId);
      showToast('success', 'Sprint deleted.');
      onSprintDeleted?.();
      onBack?.();
    } catch (err) {
      showToast('error', getFriendlyErrorMessage(err, 'sprint'));
    } finally {
      setBusyAction('');
    }
  };

  const handleAssignContributor = async () => {
    if (!selectedMemberId) return;
    setBusyAction('assign');
    try {
      await assignSprint(sprintId, selectedMemberId);
      showToast('success', 'Contributor assigned to sprint.');
      setIsAssignModalOpen(false);
      loadDetails();
      onSprintUpdated?.();
    } catch (err) {
      showToast('error', getFriendlyErrorMessage(err, 'sprint'));
    } finally {
      setBusyAction('');
    }
  };

  const handleRequestAssignment = async () => {
    setBusyAction('request');
    try {
      await requestSprintAssignment(sprintId);
      showToast('success', 'Sprint assignment request submitted.');
    } catch (err) {
      showToast('error', getFriendlyErrorMessage(err, 'sprint-assignment'));
    } finally {
      setBusyAction('');
    }
  };

  const sprintRequests = requests.filter((request) => {
    const requestSprintId = request.sprintId || request.sprint?.id || request.sprint?.sprintId || request.sprint?._id;
    return String(requestSprintId || '') === String(sprintId);
  });

  const handleApproveRequest = async (request) => {
    const requestId = request.id || request.requestId || request.assignmentRequestId;
    const requestSprintId = request.sprintId || request.sprint?.id || request.sprint?.sprintId || request.sprint?._id;
    if (!requestId || !requestSprintId) {
      showToast('error', 'Unable to approve this request: sprint or request ID is missing.');
      return;
    }
    try {
      await approveSprintRequest(requestSprintId, requestId);
      showToast('success', 'Sprint assignment request approved.');
      loadRequests();
      loadDetails();
      onSprintUpdated?.();
    } catch (err) {
      showToast('error', getFriendlyErrorMessage(err, 'sprint'));
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Top Header & Breadcrumb Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            title="Back to Sprints"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/90 bg-white text-slate-600 shadow-xs hover:bg-slate-50 dark:border-[#303030] dark:bg-[#1d1d1d] dark:text-[#e0e0e0] dark:hover:bg-[#242424] cursor-pointer transition"
          >
            <FiArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-[#b3b3b3]">
              <button type="button" onClick={onBack} className="hover:text-sky-600 dark:hover:text-[#60A5FA] cursor-pointer transition">
                Sprints
              </button>
              <span>/</span>
              <span className="truncate max-w-[200px] text-slate-600 dark:text-[#e0e0e0]">
                {sprint?.name || 'Sprint Details'}
              </span>
            </div>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight text-slate-900 dark:text-[#F1F5F9] sm:text-2xl truncate">
              {sprint?.name || 'Sprint Details'}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadDetails}
            disabled={isLoading || Boolean(busyAction)}
            title="Refresh sprint"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-[#303030] dark:bg-[#1d1d1d] dark:text-[#e0e0e0] dark:hover:bg-[#292929] cursor-pointer disabled:opacity-50 transition"
          >
            <FiRefreshCw size={15} className={isLoading ? 'animate-spin text-sky-600' : ''} />
          </button>

          {isPlanned && canTransitionSprint && (
            <button
              type="button"
              onClick={handleStart}
              disabled={Boolean(busyAction)}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-700 cursor-pointer disabled:opacity-50 transition"
            >
              <FiPlay size={14} /> Start Sprint
            </button>
          )}

          {isActive && canTransitionSprint && (
            <button
              type="button"
              onClick={handleComplete}
              disabled={Boolean(busyAction)}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 cursor-pointer disabled:opacity-50 transition"
            >
              <FiCheck size={14} /> Complete Sprint
            </button>
          )}

          {!isCompleted && canManage && (
            <>
              <button
                type="button"
                onClick={() => onOpenEdit?.(sprint)}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-[#303030] dark:bg-[#1d1d1d] dark:text-[#e0e0e0] dark:hover:bg-[#292929] cursor-pointer transition"
              >
                <FiEdit2 size={14} /> Edit
              </button>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-[#303030] dark:bg-[#1d1d1d] dark:text-[#e0e0e0] dark:hover:bg-[#292929] cursor-pointer transition"
              >
                <FiUserPlus size={14} /> Assign
              </button>
            </>
          )}

          {canRequestAssignment && (
            <button
              type="button"
              onClick={handleRequestAssignment}
              disabled={Boolean(busyAction)}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-900/50 cursor-pointer disabled:opacity-50 transition"
            >
              <FiUser size={14} /> Request Assignment
            </button>
          )}

          {canManage && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={Boolean(busyAction)}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:bg-[#1d1d1d] dark:text-rose-400 dark:hover:bg-rose-950/50 cursor-pointer disabled:opacity-50 transition"
            >
              <FiTrash2 size={14} /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Notices */}
      {toastNotice && (
        <div className={`p-3.5 rounded-2xl border text-xs sm:text-sm flex items-center justify-between gap-3 animate-fadeIn ${
          toastNotice.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-[#34D399]'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            <FiCheckCircle size={17} />
            <span>{toastNotice.message}</span>
          </div>
          <button type="button" onClick={() => setToastNotice(null)} className="underline font-semibold cursor-pointer">Dismiss</button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-2xl bg-rose-50 p-4 border border-rose-200 text-xs text-rose-700 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300">
          <div className="flex items-center gap-2">
            <FiAlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button type="button" onClick={loadDetails} className="font-semibold underline cursor-pointer">Retry</button>
        </div>
      )}

      {/* Sprint Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-[#303030] dark:bg-[#1d1d1d]">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
              <FiCheckSquare size={16} />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8]">Total Issues</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{sprintMetrics.totalIssues}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-[#303030] dark:bg-[#1d1d1d]">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <FiCheckCircle size={16} />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8]">Resolved</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{sprintMetrics.resolvedIssues}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-[#303030] dark:bg-[#1d1d1d]">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
              <FiActivity size={16} />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8]">In Progress</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{sprintMetrics.inProgressIssues}</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 dark:border-[#303030] dark:bg-[#1d1d1d]">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <FiTrendingUp size={16} />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8]">Completion</span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{sprintMetrics.completionRate}%</p>
        </div>
      </div>

      {/* Overview Card */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-[#303030] dark:bg-[#1d1d1d] sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
              <FiCalendar size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {sprint?.name || 'Untitled Sprint'}
                </h2>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusBadge.className}`}>
                  {statusBadge.label}
                </span>
              </div>
              {sprint?.sprintNumber && (
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">Sprint #{sprint.sprintNumber}</p>
              )}
            </div>
          </div>
        </div>

        {/* Goal */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#888] mb-2 flex items-center gap-1.5">
            <FiTarget size={13} /> Sprint Goal
          </h3>
          <p className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-sm text-slate-700 leading-relaxed dark:border-[#2d2d32] dark:bg-[#242428] dark:text-[#e0e0e0]">
            {sprint?.goal || 'No goal provided for this sprint.'}
          </p>
        </div>

        {/* Schedule & Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Schedule */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-[#303030] dark:bg-[#242428]/60 space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-slate-400 dark:text-[#888] flex items-center gap-1.5">
              <FiClock size={13} /> Schedule
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-slate-600 dark:text-[#bbb]">
                <span>Start:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatDate(sprint?.startDate)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-[#bbb]">
                <span>End:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatDate(sprint?.endDate)}</span>
              </div>
              {sprint?.createdAt && (
                <div className="flex justify-between text-slate-600 dark:text-[#bbb] pt-2 border-t border-slate-200 dark:border-[#35353a]">
                  <span>Created:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-[11px]">{formatDate(sprint.createdAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Project & Milestone */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-[#303030] dark:bg-[#242428]/60 space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-slate-400 dark:text-[#888] flex items-center gap-1.5">
              <FiLayers size={13} /> Project & Scope
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-slate-600 dark:text-[#bbb]">
                <span>Project:</span>
                <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[140px]">{projectName}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-[#bbb]">
                <span>Estimated:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{sprintMetrics.totalEstimatedHours}h</span>
              </div>
              {sprintMilestones.length > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-[#bbb] pt-2 border-t border-slate-200 dark:border-[#35353a]">
                  <span>Milestones:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{sprintMilestones.length}</span>
                </div>
              )}
            </div>
          </div>

          {/* Contributor */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-[#303030] dark:bg-[#242428]/60 space-y-3">
            <h4 className="font-bold uppercase tracking-wider text-slate-400 dark:text-[#888] flex items-center gap-1.5">
              <FiUser size={13} /> Contributor
            </h4>
            <div className="flex items-center gap-2.5 pt-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-600 text-xs font-bold text-white shadow-sm">
                {sprintContributorName
                  ? sprintContributorName.slice(0, 2).toUpperCase()
                  : '—'}
              </div>
              <div className="truncate flex-1">
                <p className="font-semibold text-slate-900 dark:text-white truncate text-sm">
                  {sprintContributorName || 'Not assigned'}
                </p>
                {sprintContributorEmail && (
                  <p className="text-[10px] text-slate-400 truncate">{sprintContributorEmail}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assignment Requests Section (for sprint managers) */}
      {canViewSprintRequests && sprintRequests.length > 0 && (
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 dark:border-[#303030] dark:bg-[#1d1d1d] sm:p-7 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-[#303030]">
            <div className="flex items-center gap-2">
              <FiInbox size={18} className="text-sky-600 dark:text-sky-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Sprint Assignment Requests</h3>
              <span className="rounded-full bg-sky-100 px-2 py-0.2 text-xs font-bold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">{sprintRequests.length}</span>
            </div>
            <button type="button" onClick={loadRequests} className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer">Refresh</button>
          </div>
          <div className="space-y-2">
            {sprintRequests.map((req) => (
              <div key={req.id || req.requestId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3.5 dark:border-[#2d2d32] dark:bg-[#222226] text-xs">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{req.user?.name || req.requesterName || req.email || 'Project Contributor'}</p>
                  <p className="text-slate-500 dark:text-[#94A3B8]">{req.message || 'Requested to contribute to this sprint'}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleApproveRequest(req)}
                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3.5 py-1.5 font-semibold text-white hover:bg-emerald-700 transition cursor-pointer"
                >
                  <FiCheck size={13} /> Approve
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sprint Milestones Section */}
      {sprintMilestones.length > 0 && (
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-[#303030] dark:bg-[#1d1d1d] sm:p-7 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-[#303030]">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FiFlag size={18} className="text-amber-600 dark:text-amber-400" />
                Sprint Milestones
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-[#252528] dark:text-[#bbb]">{sprintMilestones.length}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#999]">Key milestones associated with this sprint.</p>
            </div>
          </div>

          <div className={sprintMilestones.length > 3 ? "max-h-[280px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent space-y-3" : "space-y-3"}>
            {sprintMilestones.map((milestone, idx) => {
              const milestoneId = milestone.id || milestone._id || milestone.milestoneId;
              const milestoneName = milestone.name || milestone.title || `Milestone ${idx + 1}`;
              const milestoneDesc = milestone.description;
              const milestoneDue = milestone.dueDate || milestone.targetDate || milestone.deadline;
              const milestoneStatus = milestone.status;

              return (
                <div key={milestoneId || idx} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-[#2d2d32] dark:bg-[#242428] space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                        <FiFlag size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-sm text-slate-900 dark:text-white truncate">{milestoneName}</h4>
                        {milestoneDesc && (
                          <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-1 line-clamp-2">{milestoneDesc}</p>
                        )}
                      </div>
                    </div>
                    {milestoneStatus && (
                      <span className="shrink-0 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:border-[#35353a] dark:bg-[#1a1a1d] dark:text-slate-300 uppercase">
                        {milestoneStatus}
                      </span>
                    )}
                  </div>
                  {milestoneDue && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#94A3B8] pt-1">
                      <FiCalendar size={12} />
                      <span>Due: {formatDate(milestoneDue)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Associated Issues Section */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-[#303030] dark:bg-[#1d1d1d] sm:p-7 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-[#303030]">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Sprint Issues & Deliverables <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-[#252528] dark:text-[#bbb]">{linkedSprintIssues.length}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#999]">Issues mapped to this delivery window.</p>
          </div>
        </div>

        {isLoadingIssues ? (
          <div className="space-y-2">
            {[0, 1, 2].map((n) => <div key={n} className="h-12 rounded-xl bg-slate-100 dark:bg-[#252528] animate-pulse" />)}
          </div>
        ) : linkedSprintIssues.length > 0 ? (
          <div className={linkedSprintIssues.length > 5 ? "max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent" : ""}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-xs">
                <thead className="sticky top-0 bg-white dark:bg-[#1d1d1d] z-10">
                  <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-400 dark:border-[#2d2d32] dark:text-[#888]">
                    <th className="py-3 px-3">Issue</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Priority</th>
                    <th className="py-3 px-3">Assignee</th>
                    <th className="py-3 px-3">Due Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#28282c]">
                  {linkedSprintIssues.map((issue, idx) => (
                    <tr
                      key={issue.id || issue._id || idx}
                      onClick={() => onIssueClick?.(issue)}
                      className="cursor-pointer hover:bg-slate-50 dark:hover:bg-[#232327] transition"
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          {issue.issueNumber && (
                            <span className="shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400">
                              #{issue.issueNumber}
                            </span>
                          )}
                          <p className="font-semibold text-slate-800 dark:text-slate-100 truncate max-w-xs">
                            {issue.title || issue.issueTitle || 'Untitled Issue'}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${getIssueStatusBadge(issue.status)}`}>
                          {issue.status ? String(issue.status).replace(/_/g, ' ') : '—'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${getPriorityBadge(issue.priority)}`}>
                          {issue.priority || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-[#bbb]">
                        {issue.assigneeName || issue.assignedTo?.name || '—'}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-[#bbb]">
                        {issue.dueDate ? formatDate(issue.dueDate) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-50 p-8 text-center dark:bg-[#242428]/40">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
                <FiCheckSquare size={20} className="text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No issues assigned to this sprint</p>
              <p className="text-xs text-slate-500 dark:text-[#888]">Issues can be assigned to sprints from the Issues module.</p>
            </div>
          </div>
        )}
      </section>

      {/* Sprint Discussion & Comments Section */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-[#303030] dark:bg-[#1d1d1d] sm:p-7 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-[#303030]">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Sprint Discussion & Comments {sprintCommentsCount > 0 && <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-[#252528] dark:text-[#bbb]">{sprintCommentsCount}</span>}
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#999]">Collaborate, share sprint updates, and post blockers.</p>
          </div>
        </div>

        <CommentsThread
          key={`sprint-comments-${sprintId}`}
          entityId={sprintId}
          entityType="sprint"
          currentUserProfile={currentUserProfile}
          fetchComments={getSprintComments}
          createComment={createSprintComment}
          updateComment={updateSprintComment}
          deleteComment={deleteSprintComment}
          onCountChange={setSprintCommentsCount}
        />
      </section>

      {/* Assign Contributor Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn" onClick={() => setIsAssignModalOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-[#38383e] dark:bg-[#171717]" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-[#2d2d32]">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Assign Sprint Contributor</h3>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-[#888]">Select a contributor to assign to this sprint.</p>
              </div>
              <button type="button" aria-label="Close" onClick={() => setIsAssignModalOpen(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><FiXCircle size={16} /></button>
            </div>
            <div className="relative mt-3">
              <input type="text" placeholder="Search by name or email..." value={memberSearchQuery} onChange={(event) => setMemberSearchQuery(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 outline-none focus:border-sky-500 dark:border-[#38383e] dark:bg-[#252529] dark:text-white" />
              <FiSearch className="absolute left-3 top-2.5 text-slate-400" size={15} />
            </div>
            <div className="mt-3 max-h-60 space-y-1.5 overflow-y-auto pr-1">
              {assignableContributors.map((member) => {
                const id = String(member.userId || member.id || member._id || member.user?.id || '');
                const name = member.name || member.userName || member.fullName || member.email || 'Member';
                const email = member.email || member.user?.email || '';
                const avatar = member.profilePictureUrl || member.profilePicture || member.avatar || member.picture || member.user?.profilePictureUrl;
                const initials = name.trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
                const selected = id === selectedMemberId;
                return (
                  <button key={id} type="button" onClick={() => setSelectedMemberId(id)} className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition ${selected ? 'border-sky-500/50 bg-sky-50/60 dark:bg-sky-950/20' : 'border-slate-100 hover:bg-slate-50 dark:border-[#2d2d32] dark:hover:bg-[#252529]'}`}>
                    {avatar ? <img src={avatar} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" /> : <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fuchsia-700 text-[11px] font-bold text-white">{initials || 'U'}</span>}
                    <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-900 dark:text-white">{name}</span>{email && <span className="block truncate text-[11px] text-slate-500 dark:text-[#888]">{email}</span>}</span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-[#34343a] dark:text-slate-300">{formatRoleLabel(member.role || member.projectRole || 'CONTRIBUTOR')}</span>
                  </button>
                );
              })}
              {assignableContributors.length === 0 && <p className="py-6 text-center text-xs text-slate-400 dark:text-[#888]">{memberSearchQuery.trim() ? 'No contributors match your search.' : 'No contributors found in this project.'}</p>}
            </div>
            <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-[#2d2d32]">
              <button type="button" onClick={() => setIsAssignModalOpen(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#29292d]">Cancel</button>
              <button type="button" onClick={handleAssignContributor} disabled={!selectedMemberId || busyAction === 'assign'} className="rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50">{busyAction === 'assign' ? 'Assigning...' : 'Assign Sprint'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SprintDetailsView;
