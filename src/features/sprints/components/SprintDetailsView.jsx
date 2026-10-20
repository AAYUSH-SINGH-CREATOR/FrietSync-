import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FiArrowLeft, FiCalendar, FiClock, FiUser, FiCheckCircle, FiEdit2,
  FiTrash2, FiRefreshCw, FiPlay, FiCheck, FiLayers, FiAlertCircle,
  FiUserPlus, FiInbox,
} from 'react-icons/fi';
import {
  getSprintById, startSprint, completeSprint, deleteSprint,
  assignSprint, requestSprintAssignment, getProjectSprintRequests, approveSprintRequest,
  getFriendlyErrorMessage,
} from '../services/sprintsApi';
import { getProjectIssues } from '../../issues/services/issueApi';
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
  if (['COMPLETED', 'CLOSED', 'DONE'].includes(norm)) {
    return { label: 'Completed', className: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' };
  }
  if (['ACTIVE', 'IN_PROGRESS', 'STARTED'].includes(norm)) {
    return { label: 'Active', className: 'border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-300' };
  }
  if (['IN_REVIEW', 'REVIEW', 'TESTING'].includes(norm)) {
    return { label: 'In review', className: 'border-pink-500/40 bg-pink-500/15 text-pink-700 dark:text-pink-300' };
  }
  return { label: 'Planned', className: 'border-purple-500/40 bg-purple-500/15 text-purple-700 dark:text-purple-300' };
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
  onIssueClick,
}) => {
  const [sprint, setSprint] = useState(initialSprint || null);
  const [isLoading, setIsLoading] = useState(!initialSprint);
  const [error, setError] = useState('');
  const [toastNotice, setToastNotice] = useState(null);
  const [busyAction, setBusyAction] = useState('');
  const [detailsTrigger, setDetailsTrigger] = useState(0);
  const [requestsTrigger, setRequestsTrigger] = useState(0);

  // Associated Project issues
  const [projectIssues, setProjectIssues] = useState([]);
  const [isLoadingIssues, setIsLoadingIssues] = useState(true);

  // Project Members for assignment
  const [members, setMembers] = useState([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');

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

  // Load issues for the project to display associated sprint issues
  useEffect(() => {
    const pid = projectId || sprint?.projectId || sprint?.project?.id;
    if (!pid) return undefined;
    let isMounted = true;
    getProjectIssues(pid, { page: 0, size: 50 })
      .then((data) => {
        if (!isMounted) return;
        const items = data?.items || data?.content || (Array.isArray(data) ? data : []);
        setProjectIssues(items);
        setIsLoadingIssues(false);
      })
      .catch((err) => {
        console.warn('Failed loading project issues for sprint:', err);
        if (isMounted) setIsLoadingIssues(false);
      });
    return () => { isMounted = false; };
  }, [projectId, sprint?.projectId, sprint?.project?.id]);

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
    if (!pid || !canManage) return undefined;
    let isMounted = true;
    getProjectSprintRequests(pid)
      .then((data) => {
        if (!isMounted) return;
        const list = Array.isArray(data) ? data : (data?.requests || data?.items || data?.data?.requests || data?.data?.items || []);
        setRequests(list);
      })
      .catch((err) => console.warn('Failed loading sprint requests:', err));
    return () => { isMounted = false; };
  }, [projectId, sprint?.projectId, sprint?.project?.id, canManage, requestsTrigger]);

  const currentStatus = String(sprint?.status || sprint?.state || 'PLANNED').toUpperCase();
  const isCompleted = ['COMPLETED', 'CLOSED', 'DONE'].includes(currentStatus);
  const isActive = ['ACTIVE', 'IN_PROGRESS', 'STARTED'].includes(currentStatus);
  const isPlanned = ['PLANNED', 'PLANNING', 'FUTURE'].includes(currentStatus);

  const statusBadge = getStatusBadge(currentStatus);

  // Associated sprint issues (either explicit in sprint object, or matched by sprintId)
  const sprintIssues = useMemo(() => {
    if (Array.isArray(sprint?.issues) && sprint.issues.length > 0) return sprint.issues;
    if (Array.isArray(sprint?.items) && sprint.items.length > 0) return sprint.items;
    return projectIssues.filter((i) => String(i.sprintId || i.sprint?.id || '') === String(sprintId));
  }, [sprint, projectIssues, sprintId]);

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
    if (!window.confirm('Complete this sprint? This marks current delivery goals as finished.')) return;
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
      showToast('error', getFriendlyErrorMessage(err, 'sprint'));
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
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/90 bg-white text-slate-600 shadow-xs hover:bg-slate-50 dark:border-[#303030] dark:bg-[#1d1d1d] dark:text-[#e0e0e0] dark:hover:bg-[#242424] cursor-pointer"
          >
            <FiArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-[#b3b3b3]">
              <button type="button" onClick={onBack} className="hover:text-sky-600 dark:hover:text-[#60A5FA] cursor-pointer">
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
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-[#303030] dark:bg-[#1d1d1d] dark:text-[#e0e0e0] cursor-pointer disabled:opacity-50"
          >
            <FiRefreshCw size={15} className={isLoading ? 'animate-spin text-sky-600' : ''} />
          </button>

          {isPlanned && canManage && (
            <button
              type="button"
              onClick={handleStart}
              disabled={Boolean(busyAction)}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-sky-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-sky-700 dark:bg-blue-600 dark:hover:bg-blue-500 cursor-pointer disabled:opacity-50"
            >
              <FiPlay size={14} /> Start Sprint
            </button>
          )}

          {isActive && canManage && (
            <button
              type="button"
              onClick={handleComplete}
              disabled={Boolean(busyAction)}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 cursor-pointer disabled:opacity-50"
            >
              <FiCheck size={14} /> Complete Sprint
            </button>
          )}

          {!isCompleted && canManage && (
            <>
              <button
                type="button"
                onClick={() => onOpenEdit?.(sprint)}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-[#303030] dark:bg-[#1d1d1d] dark:text-[#e0e0e0] cursor-pointer"
              >
                <FiEdit2 size={14} /> Edit
              </button>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-[#303030] dark:bg-[#1d1d1d] dark:text-[#e0e0e0] cursor-pointer"
              >
                <FiUserPlus size={14} /> Assign
              </button>
            </>
          )}

          {!canManage && !isCompleted && (
            <button
              type="button"
              onClick={handleRequestAssignment}
              disabled={Boolean(busyAction)}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300 cursor-pointer disabled:opacity-50"
            >
              <FiUser size={14} /> Request Assignment
            </button>
          )}

          {canManage && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={Boolean(busyAction)}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:bg-[#1d1d1d] dark:text-rose-400 cursor-pointer disabled:opacity-50"
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
              <p className="mt-0.5 font-mono text-xs text-slate-400 dark:text-[#888]">
                Sprint ID: {sprintId}
              </p>
            </div>
          </div>
        </div>

        {/* Goal */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#888] mb-1.5">
            Sprint Goal
          </h3>
          <p className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 text-xs sm:text-sm text-slate-700 leading-relaxed dark:border-[#2d2d32] dark:bg-[#242428] dark:text-[#e0e0e0]">
            {sprint?.goal || 'No goal provided for this sprint.'}
          </p>
        </div>

        {/* Schedule & Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Schedule */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-[#303030] dark:bg-[#242428]/60 space-y-2">
            <h4 className="font-bold uppercase tracking-wider text-slate-400 dark:text-[#888] flex items-center gap-1.5">
              <FiClock size={13} /> Schedule
            </h4>
            <div className="space-y-1">
              <div className="flex justify-between text-slate-600 dark:text-[#bbb]">
                <span>Start:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatDate(sprint?.startDate)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-[#bbb]">
                <span>End:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{formatDate(sprint?.endDate)}</span>
              </div>
            </div>
          </div>

          {/* Project & Milestone */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-[#303030] dark:bg-[#242428]/60 space-y-2">
            <h4 className="font-bold uppercase tracking-wider text-slate-400 dark:text-[#888] flex items-center gap-1.5">
              <FiLayers size={13} /> Project & Scope
            </h4>
            <div className="space-y-1">
              <div className="flex justify-between text-slate-600 dark:text-[#bbb]">
                <span>Project:</span>
                <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[140px]">{projectName}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-[#bbb]">
                <span>Milestone:</span>
                <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[140px]">{sprint?.milestoneId || sprint?.milestoneName || '—'}</span>
              </div>
            </div>
          </div>

          {/* Contributor */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 dark:border-[#303030] dark:bg-[#242428]/60 space-y-2">
            <h4 className="font-bold uppercase tracking-wider text-slate-400 dark:text-[#888] flex items-center gap-1.5">
              <FiUser size={13} /> Contributor
            </h4>
            <div className="flex items-center gap-2 pt-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-600 text-[10px] font-bold text-white">
                {(sprint?.contributorName || sprint?.contributor?.name || 'HV').slice(0, 2).toUpperCase()}
              </div>
              <div className="truncate">
                <p className="font-semibold text-slate-900 dark:text-white truncate">
                  {sprint?.contributorName || sprint?.contributor?.name || 'Not assigned'}
                </p>
                {sprint?.contributorEmail && (
                  <p className="text-[10px] text-slate-400 truncate">{sprint.contributorEmail}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assignment Requests Section (for sprint managers) */}
      {canManage && sprintRequests.length > 0 && (
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 dark:border-[#303030] dark:bg-[#1d1d1d] sm:p-7 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-[#303030]">
            <div className="flex items-center gap-2">
              <FiInbox size={18} className="text-sky-600" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Sprint Assignment Requests</h3>
              <span className="rounded-full bg-sky-100 px-2 py-0.2 text-xs font-bold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">{sprintRequests.length}</span>
            </div>
            <button type="button" onClick={loadRequests} className="text-xs font-semibold text-sky-600 hover:underline cursor-pointer">Refresh</button>
          </div>
          <div className="space-y-2">
            {sprintRequests.map((req) => (
              <div key={req.id || req.requestId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3.5 dark:border-[#2d2d32] dark:bg-[#222226] text-xs">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{req.user?.name || req.requesterName || req.email || 'Project Contributor'}</p>
                  <p className="text-slate-500">{req.message || 'Requested to contribute to this sprint'}</p>
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

      {/* Associated Issues Section */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-[#303030] dark:bg-[#1d1d1d] sm:p-7 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-[#303030]">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Sprint Issues & Deliverables <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-[#252528] dark:text-[#bbb]">{sprintIssues.length}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#999]">Issues mapped to this delivery window.</p>
          </div>
        </div>

        {isLoadingIssues ? (
          <div className="space-y-2">
            {[0, 1].map((n) => <div key={n} className="h-10 rounded-xl bg-slate-100 dark:bg-[#252528] animate-pulse" />)}
          </div>
        ) : sprintIssues.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase text-slate-400 dark:border-[#2d2d32] dark:text-[#888]">
                  <th className="py-2.5 px-3">Issue</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Assignee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#28282c]">
                {sprintIssues.map((issue, idx) => (
                  <tr
                    key={issue.id || issue._id || idx}
                    onClick={() => onIssueClick?.(issue)}
                    className="cursor-pointer hover:bg-slate-50 dark:hover:bg-[#232327] transition"
                  >
                    <td className="py-3 px-3">
                      <span className="font-mono text-[10px] text-sky-600 dark:text-sky-400">
                        {issue.issueNumber ? `#${issue.issueNumber}` : ''}
                      </span>
                      <p className="font-semibold text-slate-800 dark:text-slate-100 truncate max-w-sm">
                        {issue.title || 'Untitled Issue'}
                      </p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="rounded-md border border-slate-200 px-2 py-0.5 text-[11px] font-medium dark:border-[#38383e]">
                        {issue.status || 'OPEN'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-[#bbb]">
                      {issue.priority || 'MEDIUM'}
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-[#bbb]">
                      {issue.assigneeName || issue.assignedTo?.name || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-50 p-6 text-center text-xs text-slate-400 dark:bg-[#242428]/40 dark:text-[#888]">
            No issues currently assigned to this sprint. Issues can be assigned to sprints from the Issues module.
          </div>
        )}
      </section>

      {/* Assign Contributor Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-[#303030] dark:bg-[#1a1a1d] space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Assign Sprint Contributor</h3>
            <p className="text-xs text-slate-500">Select a project member to lead or contribute to this sprint.</p>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 outline-none dark:border-[#35353a] dark:bg-[#222226] dark:text-white"
            >
              <option value="">Select a contributor...</option>
              {members.map((m) => {
                const mid = m.userId || m.id || m._id;
                const mname = m.name || m.fullName || m.email || 'Member';
                return <option key={mid} value={mid}>{mname} ({m.role || 'Member'})</option>;
              })}
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 dark:border-[#35353a] dark:text-[#bbb]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignContributor}
                disabled={!selectedMemberId || busyAction === 'assign'}
                className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
              >
                {busyAction === 'assign' ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SprintDetailsView;
