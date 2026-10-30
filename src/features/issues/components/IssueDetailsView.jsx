import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FiArrowLeft, FiEdit2, FiTrash2, FiCheckCircle, FiCheck, FiUserPlus,
  FiPaperclip, FiDownload, FiX, FiActivity, FiRefreshCw,
  FiAlertCircle, FiClock, FiCalendar, FiSend, FiMaximize2,
} from 'react-icons/fi';
import { AiOutlineBug } from 'react-icons/ai';
import {
  getIssueDetails, getProjectIssues, updateIssue, deleteIssue, assignIssue, resolveIssue, reviewIssue,
  getIssueHistory, getIssueLabels, attachIssueLabel, removeIssueLabel,
  getIssueLinks, createIssueLink, deleteIssueLink, getIssueDependencies, getIssueImpact,
  getIssueAttachments, uploadIssueAttachment, downloadIssueAttachment, deleteIssueAttachment,
  requestIssueAssignment, getMyIssueAssignmentRequest, cancelIssueAssignmentRequest,
  getProjectIssueRequests, manageProjectIssueRequest, deleteProjectIssueRequest,
  getIssueComments, createIssueComment, updateIssueComment, deleteIssueComment,
  getIssueSprints,
  getFriendlyErrorMessage,
} from '../services/issueApi';
import CommentsThread from '../../../components/ui/CommentsThread';
import { getProjectMembers } from '../../projects/services/projectApi';
import { getProjectSprints } from '../../sprints/services/sprintsApi';
import { getPriorityBadge, getStatusBadge, formatIssueDate, formatEstimatedHours, PRIORITY_OPTIONS } from '../utils/issueUtils';
import DependencyGraph from './DependencyGraph';

const normalize = (v) => String(v || '').toUpperCase().replace(/[\s-]+/g, '_');
const getId = (v) => v?.id || v?._id || v?.requestId || v?.labelId || v?.linkId || v?.attachmentId || v?.userId;
const asList = (d) => {
  if (Array.isArray(d)) return d;
  const b = d?.data && !Array.isArray(d.data) ? d.data : d;
  const v = b?.items || b?.content || b?.history || b?.labels || b?.links || b?.attachments || b?.requests || b?.dependencies || (Array.isArray(b?.data) ? b.data : null);
  return Array.isArray(v) ? v : [];
};
const getProjectIssueDetails = async (projectId, issueId) => {
  const firstPage = await getProjectIssues(projectId, { page: 0, size: 100 });
  const remainingPages = await Promise.all(Array.from(
    { length: Math.max(0, firstPage.totalPages - 1) },
    (_, index) => getProjectIssues(projectId, { page: index + 1, size: 100 })
  ));
  const items = [...firstPage.items, ...remainingPages.flatMap((page) => page.items)];
  return items.find((item) => String(getId(item)) === String(issueId)) || null;
};
const formatBytes = (bytes) => {
  if (!bytes || Number.isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i] || 'MB'}`;
};
const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const Card = ({ children, className = '' }) => (
  <div className={`rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-[#2d2d32] dark:bg-[#171717] sm:p-5 ${className}`}>
    {children}
  </div>
);

const CardHeader = ({ title, action }) => (
  <div className="mb-3 flex items-center justify-between gap-2">
    <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white sm:text-base">{title}</h3>
    {action}
  </div>
);

const IssueDetailsView = ({
  issueId,
  initialIssue = null,
  projectName = '',
  onBack,
  onIssueUpdated,
  onIssueDeleted,
  currentUserProfile = null,
}) => {
  const [issue, setIssue] = useState(initialIssue);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyAction, setBusyAction] = useState('');

  const [members, setMembers] = useState([]);
  const [projectIssues, setProjectIssues] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [labels, setLabels] = useState([]);
  const [links, setLinks] = useState([]);
  const [dependencies, setDependencies] = useState(null);
  const [impact, setImpact] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [activityTab, setActivityTab] = useState('all');
  const [commentsCount, setCommentsCount] = useState(0);
  const [myRequest, setMyRequest] = useState(null);
  const [projectRequests, setProjectRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editValues, setEditValues] = useState({ title: '', description: '', priority: 'MEDIUM', dueDate: '', estimatedHours: '' });
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [linkValues, setLinkValues] = useState({ targetIssueId: '' });
  const [isLabelOpen, setIsLabelOpen] = useState(false);
  const [newLabelText, setNewLabelText] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isFullscreenGraphOpen, setIsFullscreenGraphOpen] = useState(false);

  const pid = issue?.projectId || issue?.project?.id || issue?.project?._id || initialIssue?.projectId;
  const currentUserId = currentUserProfile?.id || currentUserProfile?._id || currentUserProfile?.userId || currentUserProfile?.user?.id;
  const currentUserEmail = String(currentUserProfile?.email || currentUserProfile?.user?.email || '').toLowerCase();
  const myMembership = members.find((m) => (currentUserId && String(getId(m)) === String(currentUserId)) || (currentUserEmail && String(m.email || m.user?.email || '').toLowerCase() === currentUserEmail));
  const currentRole = String(myMembership?.role || myMembership?.projectRole || currentUserProfile?.role || '').toUpperCase();
  const isManager = ['ADMIN', 'WORKSPACE_ADMIN', 'OWNER', 'PROJECT_MANAGER', 'TEAM_LEAD'].includes(currentRole);
  const assigneeIdsList = useMemo(() => issue?.assigneeIds || issue?.assignedUserIds || issue?.assignees?.map(getId) || issue?.assignedTo?.map?.(getId) || (issue?.assigneeId ? [issue.assigneeId] : []), [issue]);
  const isAssignee = currentUserId && assigneeIdsList.some((id) => String(id) === String(currentUserId));
  const createdBy = issue?.createdBy?.id || issue?.createdBy?._id || issue?.createdBy || issue?.creator?.id;
  const isCreator = currentUserId && String(createdBy) === String(currentUserId);
  const canEdit = isManager || (currentRole === 'REPORTER' && isCreator);
  const canResolve = currentRole === 'CONTRIBUTOR' && isAssignee && normalize(issue?.status) === 'IN_PROGRESS';
  const canReview = ['PROJECT_MANAGER', 'TEAM_LEAD', 'REPORTER'].includes(currentRole) && normalize(issue?.status) === 'RESOLVED';

  const showToast = useCallback((msg, isErr = false) => {
    if (isErr) setError(msg);
    else { setNotice(msg); setTimeout(() => setNotice(''), 4000); }
  }, []);

  const reloadIssue = useCallback(async () => {
    if (!issueId) return;
    try {
      const fresh = pid
        ? await getProjectIssueDetails(pid, issueId)
        : await getIssueDetails(issueId);
      if (fresh) setIssue((prev) => ({ ...prev, ...fresh }));
      return fresh;
    } catch (err) { setError(getFriendlyErrorMessage(err, 'issue')); }
  }, [issueId, pid]);

  useEffect(() => {
    if (!issueId) return;
    let active = true;
    (pid ? getProjectIssueDetails(pid, issueId) : getIssueDetails(issueId))
      .then((fresh) => {
        if (!active) return;
        if (fresh) setIssue((prev) => ({ ...prev, ...fresh }));
        else setError('This issue was not found in the project issues list.');
      })
      .catch((err) => { if (active) setError(getFriendlyErrorMessage(err, 'issue')); });
    return () => { active = false; };
  }, [issueId, pid]);

  useEffect(() => {
    if (!pid) return;
    let active = true;
    getProjectMembers(pid).then((res) => { if (active) setMembers(Array.isArray(res) ? res : []); }).catch(() => {});
    getProjectIssues(pid, { page: 0, size: 100 }).then(async (firstPage) => {
      const pages = await Promise.all(Array.from({ length: Math.max(0, firstPage.totalPages - 1) }, (_, index) => getProjectIssues(pid, { page: index + 1, size: 100 })));
      if (active) setProjectIssues([...(firstPage.items || []), ...pages.flatMap((page) => page.items || [])]);
    }).catch(() => { if (active) setProjectIssues([]); });
    return () => { active = false; };
  }, [pid]);

  useEffect(() => {
    if (!issueId) return;
    let active = true;
    Promise.allSettled([
      getIssueLabels(issueId),
      getIssueLinks(issueId),
      getIssueDependencies(issueId),
      getIssueImpact(issueId),
      getIssueAttachments(issueId),
      getIssueHistory(issueId, { page: 0, size: 20 }),
      getIssueSprints(issueId),
      getMyIssueAssignmentRequest(issueId),
      pid && isManager ? getProjectIssueRequests(pid) : Promise.resolve([]),
    ]).then(([lbls, lnks, deps, imp, atts, hist, sprts, myReq, projReqs]) => {
      if (!active) return;
      if (lbls.status === 'fulfilled') setLabels(asList(lbls.value));
      if (lnks.status === 'fulfilled') setLinks(asList(lnks.value));
      if (deps.status === 'fulfilled') setDependencies(deps.value);
      if (imp.status === 'fulfilled') setImpact(imp.value);
      if (atts.status === 'fulfilled') setAttachments(asList(atts.value));
      if (hist.status === 'fulfilled') {
        const hItems = asList(hist.value);
        setHistory(hItems);
        const total = hist.value?.totalPages ?? (hItems.length >= 20 ? 2 : 1);
        setHistoryHasMore(total > 1);
      }
      if (sprts.status === 'fulfilled') setSprints(asList(sprts.value));
      if (myReq.status === 'fulfilled') setMyRequest(myReq.value?.request || myReq.value?.data || myReq.value);
      if (projReqs.status === 'fulfilled') setProjectRequests(asList(projReqs.value));
    });
    return () => { active = false; };
  }, [issueId, pid, isManager]);

  const refreshAuxData = useCallback(async () => {
    if (!issueId) return;
    try {
      const [lbls, lnks, deps, imp, atts, hist, sprts, myReq, projReqs] = await Promise.allSettled([
        getIssueLabels(issueId),
        getIssueLinks(issueId),
        getIssueDependencies(issueId),
        getIssueImpact(issueId),
        getIssueAttachments(issueId),
        getIssueHistory(issueId, { page: 0, size: 20 }),
        getIssueSprints(issueId),
        getMyIssueAssignmentRequest(issueId),
        pid && isManager ? getProjectIssueRequests(pid) : Promise.resolve([]),
      ]);
      if (lbls.status === 'fulfilled') setLabels(asList(lbls.value));
      if (lnks.status === 'fulfilled') setLinks(asList(lnks.value));
      if (deps.status === 'fulfilled') setDependencies(deps.value);
      if (imp.status === 'fulfilled') setImpact(imp.value);
      if (atts.status === 'fulfilled') setAttachments(asList(atts.value));
      if (hist.status === 'fulfilled') {
        const hItems = asList(hist.value);
        setHistory(hItems);
        const total = hist.value?.totalPages ?? (hItems.length >= 20 ? 2 : 1);
        setHistoryHasMore(total > 1);
      }
      if (sprts.status === 'fulfilled') setSprints(asList(sprts.value));
      if (myReq.status === 'fulfilled') setMyRequest(myReq.value?.request || myReq.value?.data || myReq.value);
      if (projReqs.status === 'fulfilled') setProjectRequests(asList(projReqs.value));
    } catch (err) {
      console.warn('Failed loading auxiliary issue data:', err);
    }
  }, [issueId, pid, isManager]);

  const handleLoadMoreHistory = async () => {
    const next = historyPage + 1;
    try {
      const res = await getIssueHistory(issueId, { page: next, size: 20 });
      const items = asList(res);
      setHistory((prev) => [...prev, ...items]);
      setHistoryPage(next);
      setHistoryHasMore(typeof res?.totalPages === 'number' ? next + 1 < res.totalPages : items.length >= 20);
    } catch (err) { showToast(getFriendlyErrorMessage(err, 'issue'), true); }
  };

  const runAction = async (key, action, successMsg = 'Updated successfully.') => {
    setBusyAction(key); setError(''); setNotice('');
    try {
      await action();
      showToast(successMsg);
      await reloadIssue();
      await refreshAuxData();
      onIssueUpdated?.();
    } catch (err) { showToast(getFriendlyErrorMessage(err, 'issue'), true); }
    finally { setBusyAction(''); }
  };

  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await runAction('upload', async () => {
      await uploadIssueAttachment(issueId, file);
      e.target.value = '';
    }, 'Attachment uploaded successfully.');
  };

  const handleDownloadAttachment = async (att) => {
    const id = getId(att);
    try {
      const res = await downloadIssueAttachment(id);
      const blob = res instanceof Blob ? res : (res?.blob || res?.data);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.fileName || att.filename || att.name || res?.filename || 'attachment';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { showToast(getFriendlyErrorMessage(err, 'issue'), true); }
  };

  const assigneeName = issue?.assigneeName || issue?.assignedTo?.name || issue?.assignee?.name || issue?.assigneeEmail || (members.find((m) => String(getId(m)) === String(assigneeIdsList[0]))?.name) || 'Unassigned';
  const assigneeInitials = assigneeName.trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  const issueNumber = issue?.issueNumber || (issueId ? String(issueId).slice(-6) : '001');
  const issueKey = issue?.key || (issueNumber ? `WBR-${issueNumber}` : `#${issueNumber}`);
  const displayProjectName = projectName || issue?.projectName || issue?.project?.name || 'Project';
  const dependencyItems = asList(dependencies);
  const linkableIssues = projectIssues.filter((item) => getId(item) && String(getId(item)) !== String(issueId));

  return (
    <div className="flex flex-col space-y-4 text-slate-900 dark:text-white animate-fadeIn pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-[#a0a0a0] dark:hover:text-white transition cursor-pointer"
        >
          <FiArrowLeft size={16} /> Back to issues
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {canResolve && (
            <button
              type="button"
              disabled={!!busyAction}
              onClick={() => runAction('resolve', () => resolveIssue(issueId), 'Issue resolved!')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer"
            >
              <FiCheckCircle size={14} /> Resolve Issue
            </button>
          )}
          {canReview && (
            <button
              type="button"
              onClick={() => setIsReviewOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-[#38383e] dark:bg-[#222226] dark:text-slate-200 dark:hover:bg-[#2b2b30] shadow-xs transition cursor-pointer"
            >
              <FiCheck size={14} /> Review
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setEditValues({
                  title: issue?.title || '',
                  description: issue?.description || '',
                  priority: issue?.priority || 'MEDIUM',
                  dueDate: issue?.dueDate ? String(issue.dueDate).slice(0, 10) : '',
                  estimatedHours: issue?.estimatedHours ?? '',
                });
                setIsEditOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-[#38383e] dark:bg-[#222226] dark:text-slate-200 dark:hover:bg-[#2b2b30] shadow-xs transition cursor-pointer"
            >
              <FiEdit2 size={14} /> Edit
            </button>
          )}
          {isManager && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-900/50 transition cursor-pointer"
            >
              <FiTrash2 size={14} /> Delete
            </button>
          )}
          <button
            type="button"
            onClick={() => { reloadIssue(); refreshAuxData(); }}
            title="Refresh details"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-[#38383e] dark:bg-[#222226] dark:text-slate-300 dark:hover:bg-[#2b2b30] transition cursor-pointer"
          >
            <FiRefreshCw size={14} className={busyAction ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          <span className="flex items-center gap-2"><FiAlertCircle className="shrink-0" />{error}</span>
          <button type="button" onClick={() => setError('')} className="font-semibold underline">Dismiss</button>
        </div>
      )}
      {notice && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          <span className="flex items-center gap-2"><FiCheckCircle className="shrink-0" />{notice}</span>
          <button type="button" onClick={() => setNotice('')}><FiX /></button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-600/15 border border-purple-500/30 text-purple-400">
            <AiOutlineBug size={24} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white truncate">
              {issue?.title || 'Issue details'}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-slate-100 dark:bg-[#252529] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5">
                {issueKey}
              </span>
              <span className={`rounded-full px-3 py-0.5 text-[11px] font-medium border ${getStatusBadge(issue?.status)}`}>
                {String(issue?.status || 'OPEN').replace(/[_-]/g, ' ')}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border uppercase tracking-wider ${getPriorityBadge(issue?.priority)}`}>
                {issue?.priority || 'MEDIUM'}
              </span>
            </div>
          </div>
        </div>

        {(isManager || !isAssignee) && (
          <button
            type="button"
            onClick={() => {
              if (isManager) setIsAssignOpen(true);
              else if (!myRequest) runAction('req', () => requestIssueAssignment(issueId, 'Interested in taking this task.'), 'Assignment requested!');
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-sky-700 active:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 cursor-pointer"
          >
            {isManager ? <><FiUserPlus size={15} /> Assign Member</> : <><FiSend size={15} /> Request Task</>}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Description" />
            <p className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-[#a5a5a9] whitespace-pre-wrap">
              {issue?.description || 'Refresh token fails after session expires, forcing users to log in again.'}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-y-3.5 gap-x-4 border-t border-slate-100 pt-3.5 dark:border-[#2d2d32] text-xs">
              <div>
                <span className="block text-[11px] font-medium text-slate-400 dark:text-[#7f7f85]">Project Name</span>
                <span className="mt-0.5 block font-semibold text-slate-800 dark:text-slate-200">{displayProjectName}</span>
              </div>
              <div>
                <span className="block text-[11px] font-medium text-slate-400 dark:text-[#7f7f85]">Issue ID</span>
                <span className="mt-0.5 block font-mono font-semibold text-slate-800 dark:text-slate-200">{issueKey}</span>
              </div>
              <div>
                <span className="block text-[11px] font-medium text-slate-400 dark:text-[#7f7f85]">Status</span>
                <span className="mt-0.5 inline-block rounded-full bg-sky-50 dark:bg-sky-950/40 px-2.5 py-0.5 text-[11px] font-medium text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800/40">
                  {String(issue?.status || 'OPEN').replace(/[_-]/g, ' ')}
                </span>
              </div>
            </div>

            <div className="mt-3.5 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 dark:border-[#2d2d32] text-[11px] text-slate-500 dark:text-[#888]">
              <span className="inline-flex items-center gap-1.5">
                <FiCalendar size={13} className="text-slate-400" />
                <span>Due: {formatIssueDate(issue?.dueDate)}</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FiClock size={13} className="text-slate-400" />
                <span>Estimate: {formatEstimatedHours(issue?.estimatedHours)}</span>
              </span>
            </div>
          </Card>

          <Card>
            <CardHeader title="Linked Sprints" />
            <div className={sprints.length > 5 ? "max-h-[280px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent space-y-2" : "space-y-2"}>
              {sprints.length > 0 ? (
                sprints.map((sprint, idx) => {
                  const sprintId = sprint.id || sprint._id || sprint.sprintId;
                  const sprintName = sprint.name || sprint.title || `Sprint ${sprint.sprintNumber || idx + 1}`;
                  const sprintGoal = sprint.goal;
                  const sprintStatus = sprint.status || 'PLANNED';
                  const sprintNumber = sprint.sprintNumber;

                  return (
                    <div key={sprintId || idx} className="flex flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-[#2d2d32] dark:bg-[#171717]">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
                            <FiActivity size={15} />
                          </div>
                          <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {sprintNumber !== undefined ? `#${sprintNumber} - ` : ''}{sprintName}
                          </span>
                        </div>
                        <span className="rounded-full bg-slate-200/60 dark:bg-[#252529] px-2 py-0.5 text-[10px] text-slate-600 dark:text-slate-300 uppercase tracking-wider font-semibold shrink-0">
                          {sprintStatus}
                        </span>
                      </div>
                      {sprintGoal && (
                        <p className="text-[11px] text-slate-500 dark:text-[#999] line-clamp-1 pl-9">
                          Goal: {sprintGoal}
                        </p>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 dark:border-[#2d2d32] dark:bg-[#171717]">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
                    <FiActivity size={15} />
                  </div>
                  <span className="text-xs text-slate-500 dark:text-[#888]">No linked sprints</span>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Linked Issues"
              action={
                canEdit && (
                  <button
                    type="button"
                    onClick={() => setIsLinkOpen(true)}
                    className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-[#29292d] px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-[#34343a] transition cursor-pointer"
                  >
                    + Link issue
                  </button>
                )
              }
            />
            {links.length > 0 ? (
              <div className="space-y-2">
                {links.map((link, idx) => {
                  const linkId = getId(link);
                  const issueNumber = link.issueNumber;
                  const issueTitle = link.issueTitle || link.title || 'Linked issue';
                  return (
                    <div key={linkId || idx} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 dark:border-[#2d2d32] dark:bg-[#171717]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="rounded bg-indigo-500/15 px-2 py-0.5 font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                          {issueNumber ? `#${issueNumber}` : 'LINK'}
                        </span>
                        <span className="text-xs text-slate-800 dark:text-slate-200 truncate">
                          {issueTitle}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => runAction('del-link', () => deleteIssueLink(linkId), 'Link removed.')}
                            className="text-slate-400 hover:text-rose-500 transition p-1"
                            title="Remove link"
                          >
                            <FiX size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-[#888] italic py-2">No linked issues yet.</p>
            )}
          </Card>

          <Card>
            <CardHeader title="Issue Doubts / Impact" />
            <p className="text-xs sm:text-sm text-slate-600 dark:text-[#a0a0a0] leading-relaxed">
              {impact?.summary || impact?.description || 'This issue affects users who remain inactive for more than 60 minutes, leading to unexpected logouts and failed API requests.'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-md bg-rose-500/15 border border-rose-500/30 px-2.5 py-0.5 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                {impact?.severity || 'High Impact'}
              </span>
              <span className="rounded-md bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                {impact?.affectedScope || 'Affects multiple users'}
              </span>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Project Issue Dependency Graph"
              action={
                pid && (
                  <button
                    type="button"
                    onClick={() => setIsFullscreenGraphOpen(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                  >
                    <FiMaximize2 size={12} />
                    View Full Screen
                  </button>
                )
              }
            />
            <div className="h-[420px] w-full rounded-xl overflow-hidden">
              {pid ? (
                <DependencyGraph projectId={pid} onBack={() => {}} />
              ) : (
                <p className="py-8 text-center text-xs text-slate-400 dark:text-[#888]">Project ID is required to display dependency graph.</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Labels"
              action={
                canEdit && (
                  <button
                    type="button"
                    onClick={() => setIsLabelOpen(true)}
                    className="inline-flex items-center gap-1 rounded-md bg-sky-50 dark:bg-sky-950/40 px-2.5 py-1 text-[11px] font-semibold text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition cursor-pointer"
                  >
                    + Add label
                  </button>
                )
              }
            />
            <div className="flex flex-wrap gap-2 pt-1">
              {labels.length > 0 ? (
                labels.map((lbl, idx) => {
                  const lblId = getId(lbl);
                  const name = lbl.name || lbl.label || lbl.title || lblId;
                  return (
                    <span
                      key={lblId || idx}
                      className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-600 dark:text-sky-400"
                    >
                      {name}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => runAction('del-lbl', () => removeIssueLabel(issueId, lblId), 'Label removed.')}
                          className="hover:text-rose-500 transition cursor-pointer"
                        >
                          <FiX size={12} />
                        </button>
                      )}
                    </span>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 dark:text-[#888]">No labels attached.</p>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-[#2d2d32]">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white sm:text-base">Activity</h3>
              <div className="flex items-center gap-1">
                {['all', 'comments', 'history'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActivityTab(tab)}
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize transition cursor-pointer ${
                      activityTab === tab
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'text-slate-500 hover:text-slate-800 dark:text-[#888] dark:hover:text-white'
                    }`}
                  >
                    {tab}{tab === 'comments' && commentsCount > 0 ? ` (${commentsCount})` : ''}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 space-y-3">
              {(activityTab === 'comments' || activityTab === 'all') && (
                <div className="space-y-2">
                  {activityTab === 'all' && (
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-[#aaa] border-b border-slate-100 dark:border-[#2d2d32] pb-1">
                      <span>Comments {commentsCount > 0 ? `(${commentsCount})` : ''}</span>
                    </div>
                  )}
                  <CommentsThread
                    key={`issue-comments-${issueId}`}
                    entityId={issueId}
                    entityType="issue"
                    currentUserProfile={currentUserProfile}
                    fetchComments={getIssueComments}
                    createComment={createIssueComment}
                    updateComment={updateIssueComment}
                    deleteComment={deleteIssueComment}
                    compact
                    issueSurface
                    onCountChange={setCommentsCount}
                  />
                </div>
              )}

              {(activityTab === 'history' || activityTab === 'all') && (
                <div className={activityTab === 'all' ? 'space-y-2 pt-3 border-t border-slate-100 dark:border-[#2d2d32]' : 'space-y-3'}>
                  {activityTab === 'all' && (
                    <div className="text-xs font-semibold text-slate-600 dark:text-[#aaa] border-b border-slate-100 dark:border-[#2d2d32] pb-1">
                      <span>History & Updates</span>
                    </div>
                  )}
                  {history.length > 0 ? (
                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {history.map((entry, idx) => {
                        const actorName = entry.actor?.name || entry.user?.name || entry.actorName || 'Member';
                        const actionText = entry.description || entry.action || entry.message || entry.event || 'updated the issue';
                        const time = formatDateTime(entry.createdAt || entry.timestamp);
                        return (
                          <div key={getId(entry) || idx} className="flex items-start gap-2.5 text-xs">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-[#34343a] font-bold text-[10px] text-slate-700 dark:text-slate-300">
                              {actorName.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-slate-800 dark:text-slate-200">
                                <strong className="font-semibold text-slate-900 dark:text-white">{actorName}</strong> {actionText}
                              </p>
                              {time && <span className="text-[10px] text-slate-400 dark:text-[#777]">{time}</span>}
                            </div>
                          </div>
                        );
                      })}
                      {historyHasMore && (
                        <button
                          type="button"
                          onClick={handleLoadMoreHistory}
                          className="w-full text-center py-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                        >
                          Load more
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-xs text-slate-500 dark:text-slate-400">
                      No issue history is available yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Attachments"
              action={
                <label className="inline-flex items-center gap-1 rounded-md bg-sky-600 hover:bg-sky-700 active:bg-sky-800 px-2.5 py-1 text-[11px] font-semibold text-white transition cursor-pointer">
                  <FiPaperclip size={12} /> + Add attachment
                  <input type="file" onChange={handleUploadFile} className="sr-only" />
                </label>
              }
            />
            {attachments.length > 0 ? (
              <div className="space-y-2">
                {attachments.map((att, idx) => {
                  const attId = getId(att);
                  const name = att.fileName || att.filename || att.name || 'document';
                  const size = formatBytes(att.fileSize || att.size);
                  const time = formatDateTime(att.createdAt || att.timestamp);
                  return (
                    <div key={attId || idx} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 dark:border-[#2d2d32] dark:bg-[#171717]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
                          <FiPaperclip size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">{name}</p>
                          <p className="text-[10px] text-slate-400 dark:text-[#777]">{size} {time ? `· ${time}` : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDownloadAttachment(att)}
                          title="Download file"
                          className="rounded-md p-1.5 text-slate-500 hover:text-sky-600 dark:text-slate-400 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-[#333] transition cursor-pointer"
                        >
                          <FiDownload size={14} />
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => runAction('del-att', () => deleteIssueAttachment(attId), 'Attachment deleted.')}
                            title="Delete file"
                            className="rounded-md p-1.5 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-[#333] transition cursor-pointer"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-4 text-center text-xs text-slate-400 dark:text-[#888]">No attachments yet.</p>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Assignees"
              action={
                isManager && (
                  <button
                    type="button"
                    onClick={() => { setSelectedUserIds(assigneeIdsList.map(String)); setIsAssignOpen(true); }}
                    className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                  >
                    Manage
                  </button>
                )
              }
            />
            {(() => {
              const assigneeList = Array.isArray(issue?.assignees) && issue.assignees.length > 0
                ? issue.assignees
                : assigneeIdsList.length > 0
                  ? assigneeIdsList.map((id) => {
                      const m = members.find((m) => String(getId(m)) === String(id));
                      return m ? { userId: getId(m), name: m.name || m.userName || m.email, email: m.email } : { userId: id, name: null, email: null };
                    })
                  : [];

              if (assigneeList.length === 0) {
                return <p className="text-xs text-slate-400 dark:text-[#888]">No assignees yet.</p>;
              }

              return (
                <div className="space-y-2">
                  {assigneeList.map((a, idx) => {
                    const uid = a.userId || a.id || a._id;
                    const name = a.name || a.userName || a.fullName;
                    const email = a.email;
                    const member = members.find((m) => String(getId(m)) === String(uid));
                    const profilePic = member?.profilePicture || member?.avatar || member?.picture;
                    const displayName = name || member?.name || email || 'Member';
                    const displayEmail = email || member?.email || '';
                    const initials = displayName.trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();
                    const colors = ['bg-pink-500', 'bg-violet-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500', 'bg-teal-500'];
                    const avatarColor = colors[idx % colors.length];

                    return (
                      <div
                        key={uid || idx}
                        className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/80 p-2.5 dark:border-[#2d2d32] dark:bg-[#252529]"
                      >
                        {profilePic ? (
                          <img src={profilePic} alt={displayName} className="h-8 w-8 rounded-full object-cover shrink-0" />
                        ) : (
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${avatarColor} text-[11px] font-bold text-white`}>
                            {initials || 'U'}
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{displayName}</p>
                          {displayEmail && <p className="text-[11px] text-slate-500 dark:text-[#888] truncate">{displayEmail}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </Card>

          <Card>
            <CardHeader title="Assignment Requests" />
            <div className="space-y-3">
              {myRequest ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-[#2d2d32] dark:bg-[#171717] flex items-center justify-between gap-2 text-xs">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Your Request Status</p>
                    <span className="text-[11px] text-sky-600 dark:text-sky-400 font-medium capitalize">{myRequest.status || 'Pending'}</span>
                  </div>
                  {String(myRequest.status || 'PENDING').toUpperCase() === 'PENDING' && (
                    <button
                      type="button"
                      disabled={!!busyAction}
                      onClick={() => runAction('cancel-req', () => cancelIssueAssignmentRequest(issueId), 'Request cancelled.')}
                      className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                    >
                      Cancel request
                    </button>
                  )}
                </div>
              ) : !isManager && !isAssignee ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={requestNote}
                    onChange={(e) => setRequestNote(e.target.value)}
                    placeholder="Optional message for manager..."
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-sky-500 dark:border-[#38383e] dark:bg-[#252529] dark:text-white"
                  />
                  <button
                    type="button"
                    disabled={!!busyAction}
                    onClick={() => runAction('sub-req', () => requestIssueAssignment(issueId, requestNote), 'Request submitted.')}
                    className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 transition cursor-pointer shrink-0"
                  >
                    Request Task
                  </button>
                </div>
              ) : null}

              {isManager && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#777]">Project Requests</span>
                  {projectRequests.length > 0 ? (
                    projectRequests.map((req, idx) => {
                      const reqId = getId(req);
                      const reqName = req.user?.name || req.requesterName || req.email || 'Member';
                      return (
                        <div key={reqId || idx} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 dark:border-[#2d2d32] dark:bg-[#171717] text-xs">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-white truncate">{reqName}</p>
                            <p className="text-[11px] text-slate-500 dark:text-[#888] truncate">{req.message || 'Requested assignment'}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => runAction('app-req', () => manageProjectIssueRequest(issueId, reqId, true), 'Request approved.')}
                              className="rounded px-2 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => runAction('rej-req', () => deleteProjectIssueRequest(pid, reqId), 'Request rejected.')}
                              className="rounded px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-[#777] italic">No pending requests for this project.</p>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>


      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn" onClick={() => setIsEditOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-[#38383e] dark:bg-[#171717]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#2d2d32]">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Issue</h3>
              <button type="button" onClick={() => setIsEditOpen(false)}><FiX size={16} /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              await runAction('edit', () => updateIssue(issueId, {
                title: editValues.title.trim(),
                description: editValues.description.trim(),
                priority: editValues.priority,
                dueDate: editValues.dueDate || null,
                estimatedHours: editValues.estimatedHours === '' ? null : Number(editValues.estimatedHours),
              }), 'Issue updated.');
              setIsEditOpen(false);
            }} className="mt-4 space-y-3.5 text-xs">
              <label className="block space-y-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Title</span>
                <input required value={editValues.title} onChange={(e) => setEditValues((v) => ({ ...v, title: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-sky-500 dark:border-[#38383e] dark:bg-[#252529] dark:text-white" />
              </label>
              <label className="block space-y-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Description</span>
                <textarea rows={3} value={editValues.description} onChange={(e) => setEditValues((v) => ({ ...v, description: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-sky-500 dark:border-[#38383e] dark:bg-[#252529] dark:text-white" />
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Priority</span>
                  <select value={editValues.priority} onChange={(e) => setEditValues((v) => ({ ...v, priority: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none dark:border-[#38383e] dark:bg-[#252529] dark:text-white">
                    {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Due date</span>
                  <input type="date" value={editValues.dueDate} onChange={(e) => setEditValues((v) => ({ ...v, dueDate: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none dark:border-[#38383e] dark:bg-[#252529] dark:text-white" />
                </label>
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Est. hours</span>
                  <input type="number" step="0.5" min="0" value={editValues.estimatedHours} onChange={(e) => setEditValues((v) => ({ ...v, estimatedHours: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none dark:border-[#38383e] dark:bg-[#252529] dark:text-white" />
                </label>
              </div>
              <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#2d2d32]">
                <button type="button" onClick={() => setIsEditOpen(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#29292d]">Cancel</button>
                <button type="submit" disabled={!!busyAction} className="rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700 active:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-50">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAssignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn" onClick={() => setIsAssignOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-[#38383e] dark:bg-[#171717]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#2d2d32]">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Assign Project Members</h3>
                <p className="text-[11px] text-slate-500 dark:text-[#888]">Select up to 10 contributors ({selectedUserIds.length}/10 selected)</p>
              </div>
              <button type="button" onClick={() => setIsAssignOpen(false)}><FiX size={16} /></button>
            </div>
            <div className="mt-3 space-y-3 text-xs">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-sky-500 dark:border-[#38383e] dark:bg-[#252529] dark:text-white pl-9 pr-8"
                />
                <svg className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full hover:bg-slate-200 dark:hover:bg-[#38383e] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {members
                  .filter((m) => {
                    const role = String(m.role || m.projectRole || '').toUpperCase();
                    return !role || role === 'CONTRIBUTOR';
                  })
                  .filter((m) => {
                    if (!searchQuery.trim()) return true;
                    const name = m.name || m.userName || m.fullName || m.email || '';
                    const email = m.email || m.user?.email || '';
                    const query = searchQuery.toLowerCase().trim();
                    return name.toLowerCase().includes(query) || email.toLowerCase().includes(query);
                  })
                  .map((m) => {
                    const mid = String(getId(m));
                    const checked = selectedUserIds.includes(mid);
                    const name = m.name || m.userName || m.fullName || m.email || 'Member';
                    const email = m.email || m.user?.email || '';
                    const profilePic = m.profilePicture || m.avatar || m.picture || m.user?.profilePicture;
                    const initials = name.trim().split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase();

                    return (
                      <label
                        key={mid}
                        className={`flex items-center gap-3 rounded-xl p-2.5 transition border ${
                          checked
                            ? 'border-sky-500/40 bg-sky-50/50 dark:bg-sky-950/20'
                            : 'border-slate-100 hover:bg-slate-50 dark:border-[#2d2d32] dark:hover:bg-[#252529]'
                        } cursor-pointer`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              if (selectedUserIds.length >= 10) {
                                showToast('Maximum 10 people can be assigned to an issue.', true);
                                return;
                              }
                              setSelectedUserIds((prev) => [...prev, mid]);
                            } else {
                              setSelectedUserIds((prev) => prev.filter((id) => id !== mid));
                            }
                          }}
                          className="rounded accent-sky-600"
                        />
                        {profilePic ? (
                          <img src={profilePic} alt={name} className="h-8 w-8 rounded-full object-cover shadow-xs shrink-0" />
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pink-500 text-[11px] font-bold text-white shadow-xs">
                            {initials || 'U'}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">{name}</p>
                          {email && <p className="text-[11px] text-slate-500 dark:text-[#888] truncate">{email}</p>}
                        </div>
                        <span className="rounded bg-slate-100 dark:bg-[#34343a] px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                          Contributor
                        </span>
                      </label>
                    );
                  })}
                {members.filter((m) => {
                  const role = String(m.role || m.projectRole || '').toUpperCase();
                  return !role || role === 'CONTRIBUTOR';
                }).filter((m) => {
                  if (!searchQuery.trim()) return true;
                  const name = m.name || m.userName || m.fullName || m.email || '';
                  const email = m.email || m.user?.email || '';
                  return name.toLowerCase().includes(searchQuery.toLowerCase().trim());
                }).length === 0 && (
                  <p className="py-6 text-center text-xs text-slate-400 dark:text-[#888]">
                    {searchQuery.trim() ? 'No members match your search.' : 'No contributors found in this project.'}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#2d2d32]">
              <button type="button" onClick={() => setIsAssignOpen(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#29292d]">Cancel</button>
              <button type="button" disabled={!!busyAction} onClick={async () => {
                if (selectedUserIds.length > 10) {
                  showToast('Maximum 10 people can be assigned to an issue.', true);
                  return;
                }
                await runAction('assign', () => assignIssue(issueId, selectedUserIds), 'Assignees updated.');
                setIsAssignOpen(false);
              }} className="rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700 active:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-50">Save Assignment</button>
            </div>
          </div>
        </div>
      )}

      {isLinkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn" onClick={() => setIsLinkOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-[#38383e] dark:bg-[#171717]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#2d2d32]">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Issue Link</h3>
              <button type="button" onClick={() => setIsLinkOpen(false)}><FiX size={16} /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!linkValues.targetIssueId) return;
              await runAction('link', () => createIssueLink(issueId, linkValues.targetIssueId), 'Link created.');
              setIsLinkOpen(false);
            }} className="mt-3 space-y-3 text-xs">
              <label className="block space-y-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Target Issue</span>
                <select required value={linkValues.targetIssueId} onChange={(e) => setLinkValues((v) => ({ ...v, targetIssueId: e.target.value }))} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-sky-500 dark:border-[#38383e] dark:bg-[#252529] dark:text-white">
                  <option value="">{linkableIssues.length ? 'Select an issue' : 'No other issues found'}</option>
                  {linkableIssues.map((item) => {
                    const id = getId(item);
                    return <option key={id} value={id}>{item.issueNumber ? `#${item.issueNumber} · ` : ''}{item.title || 'Untitled issue'}</option>;
                  })}
                </select>
              </label>
              <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#2d2d32]">
                <button type="button" onClick={() => setIsLinkOpen(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#29292d]">Cancel</button>
                <button type="submit" disabled={!!busyAction || !linkValues.targetIssueId} className="rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700 active:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-50">Add Link</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLabelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn" onClick={() => setIsLabelOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-[#38383e] dark:bg-[#171717]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#2d2d32]">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Label</h3>
              <button type="button" onClick={() => setIsLabelOpen(false)}><FiX size={16} /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!newLabelText.trim()) return;
              await runAction('label', () => attachIssueLabel(issueId, newLabelText.trim()), 'Label attached.');
              setNewLabelText('');
              setIsLabelOpen(false);
            }} className="mt-3 space-y-3 text-xs">
              <label className="block space-y-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Label name</span>
                <input required maxLength={20} value={newLabelText} onChange={(e) => setNewLabelText(e.target.value)} placeholder="e.g. bug" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none dark:border-[#38383e] dark:bg-[#252529] dark:text-white" />
              </label>
              <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#2d2d32]">
                <button type="button" onClick={() => setIsLabelOpen(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#29292d]">Cancel</button>
                <button type="submit" disabled={!!busyAction} className="rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-700 active:bg-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-not-allowed disabled:opacity-50">Attach</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isReviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn" onClick={() => setIsReviewOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-[#38383e] dark:bg-[#171717]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#2d2d32]">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Review Decision</h3>
              <button type="button" onClick={() => setIsReviewOpen(false)}><FiX size={16} /></button>
            </div>
            <div className="mt-3 space-y-3 text-xs">
              <label className="block space-y-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Decision Comment (optional)</span>
                <textarea rows={3} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Provide feedback or justification..." className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 outline-none dark:border-[#38383e] dark:bg-[#252529] dark:text-white" />
              </label>
              <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#2d2d32]">
                <button type="button" disabled={!!busyAction} onClick={async () => {
                  await runAction('reject-rev', () => reviewIssue(issueId, 'reject', reviewNote), 'Review rejected.');
                  setIsReviewOpen(false);
                }} className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer">Reject</button>
                <button type="button" disabled={!!busyAction} onClick={async () => {
                  await runAction('approve-rev', () => reviewIssue(issueId, 'approve', reviewNote), 'Review approved.');
                  setIsReviewOpen(false);
                }} className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer">Approve</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn" onClick={() => setConfirmDelete(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-rose-200 bg-white p-5 shadow-2xl dark:border-rose-900 dark:bg-[#171717]" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-bold text-rose-700 dark:text-rose-400">Delete this issue?</h3>
            <p className="mt-2 text-xs text-slate-600 dark:text-[#a0a0a0]">This action permanently removes the issue from the project and cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#2d2d32]">
              <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#29292d]">Cancel</button>
              <button type="button" disabled={!!busyAction} onClick={async () => {
                setBusyAction('delete');
                try {
                  await deleteIssue(issueId);
                  onIssueDeleted?.(issueId);
                  onBack();
                } catch (err) { showToast(getFriendlyErrorMessage(err, 'issue'), true); }
                finally { setBusyAction(''); }
              }} className="rounded-lg bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700">Confirm Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Dependency Graph View */}
      {isFullscreenGraphOpen && pid && (
        <div className="fixed inset-0 z-40 flex flex-col bg-[#f4f5f7] dark:bg-[#141416] animate-fadeIn">
          <div className="flex items-center gap-3 px-4 sm:px-6 py-4 bg-white dark:bg-[#171717] border-b border-slate-200 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setIsFullscreenGraphOpen(false)}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <FiArrowLeft size={14} />
              Back to Issue
            </button>
            <div className="flex-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Project Dependency Graph
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {displayProjectName}
              </p>
            </div>
          </div>
          <div className="flex-1 min-h-0 p-4 sm:p-6">
            <DependencyGraph projectId={pid} onBack={() => setIsFullscreenGraphOpen(false)} className="h-full" />
          </div>
        </div>
      )}
    </div>
  );
};

export default IssueDetailsView;

