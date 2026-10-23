import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link, useOutletContext } from 'react-router-dom';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  FiArrowLeft,
  FiFolder,
  FiRepeat,
  FiAlertTriangle,
  FiBarChart2,
  FiArrowRight,
  FiRefreshCw,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiCheckCircle,
  FiAlertCircle,
  FiUsers,
  FiUserPlus,
  FiChevronRight,
} from 'react-icons/fi';
import {
  getProjectById,
  getProjectMembers,
  removeProjectMember,
  getProjectMilestones,
  getProjectSummary,
  getProjectTimeline,
  getFriendlyErrorMessage,
} from '../services/projectApi';
import { getProjectSprints } from '../../sprints/services/sprintsApi';
import { getProjectIssues, normalizeIssuePage, getIssueHistory } from '../../issues/services/issueApi';
import { getProjectPolls, voteInPoll } from '../../polls/services/pollApi';
import { formatDate, isUserAdmin, getRoleBadge } from '../utils/projectUtils';
import { getPriorityBadge, getStatusBadge as getIssueStatusBadge } from '../../issues/utils/issueUtils';
import EditProjectModal from '../components/EditProjectModal';
import DeleteProjectModal from '../components/DeleteProjectModal';
import AddProjectMemberModal from '../components/AddProjectMemberModal';
import CreateIssueModal from '../../issues/components/CreateIssueModal';
import IssueDetailsModal from '../../issues/components/IssueDetailsModal';
import MeetingModal from '../../calendar/components/MeetingModal';
import { ProjectPollsSection } from '../../polls/components';
import defaultAvatar from '../../../assets/profile-avatar.png';

const AVATAR_COLORS = ['#86198f', '#0369a1', '#15803d', '#6b21a8', '#b45309', '#be123c'];

const getInitials = (name = '') => {
  return (
    name
      .trim()
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join('') || 'U'
  );
};

const getAvatarColor = (name = '') => {
  const hash = [...(name || 'User')].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const formatMilestoneDate = (dateStr) => {
  if (!dateStr) return 'TBD';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getMilestoneStatusInfo = (status) => {
  const norm = String(status || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (['COMPLETED', 'ON_TRACK', 'RESOLVED'].includes(norm)) {
    return {
      label: 'On track',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
      dotClass: 'bg-emerald-400 ring-4 ring-emerald-950/60',
    };
  }
  if (['IN_PROGRESS', 'ACTIVE'].includes(norm)) {
    return {
      label: 'In progress',
      badgeClass: 'bg-sky-500/20 text-sky-300 border border-sky-500/30',
      dotClass: 'bg-sky-400 ring-4 ring-sky-950/60',
    };
  }
  return {
    label: 'Upcoming',
    badgeClass: 'bg-slate-700/50 text-slate-300 border border-slate-600/50',
    dotClass: 'bg-purple-300 ring-4 ring-purple-950/60',
  };
};

const getSprintStatusBadge = (status) => {
  const norm = String(status || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (['COMPLETED', 'CLOSED', 'DONE'].includes(norm)) {
    return 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400';
  }
  if (['ACTIVE', 'IN_PROGRESS', 'STARTED'].includes(norm)) {
    return 'border-sky-500/30 bg-sky-500/15 text-sky-400';
  }
  return 'border-purple-500/30 bg-purple-500/15 text-purple-400';
};

const ProjectDetailsView = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const outletContext = useOutletContext() || {};
  const { currentUserProfile } = outletContext;

  const currentUserId =
    currentUserProfile?.id ||
    currentUserProfile?._id ||
    currentUserProfile?.userId ||
    currentUserProfile?.user?.id;
  const currentUserEmail = String(
    currentUserProfile?.email || currentUserProfile?.user?.email || ''
  )
    .toLowerCase()
    .trim();

  const [project, setProject] = useState(null);
  const [summary, setSummary] = useState(null);
  const [members, setMembers] = useState([]);
  const [issues, setIssues] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [polls, setPolls] = useState([]);
  const [activities, setActivities] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [viewingAllPolls, setViewingAllPolls] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState(null);

  // Modals
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isCreateIssueOpen, setIsCreateIssueOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [toastNotice, setToastNotice] = useState(null);

  const isAdmin = isUserAdmin();

  const showToast = useCallback((type, message) => {
    setToastNotice({ type, message });
    window.setTimeout(() => setToastNotice(null), 4000);
  }, []);

  const loadAllProjectDataCore = useCallback(async (pId) => {
    if (!pId) return null;
    const now = Date.now();

    // 1. Fetch project core & summary in parallel
    const [projectRes, summaryRes, membersRes, sprintsRes, issuesRes, pollsRes] =
      await Promise.allSettled([
        getProjectById(pId),
        getProjectSummary(pId).catch(() => null),
        getProjectMembers(pId).catch(() => []),
        getProjectSprints(pId).catch(() => []),
        getProjectIssues(pId, { page: 0, size: 50 }).catch(() => ({ items: [] })),
        getProjectPolls(pId).catch(() => []),
      ]);

    const projectData = projectRes.status === 'fulfilled' ? projectRes.value : null;
    const summaryData = summaryRes.status === 'fulfilled' ? summaryRes.value : null;
    const membersData =
      membersRes.status === 'fulfilled' && Array.isArray(membersRes.value)
        ? membersRes.value
        : [];
    const sprintsData =
      sprintsRes.status === 'fulfilled' && Array.isArray(sprintsRes.value)
        ? sprintsRes.value
        : [];
    const issuesData =
      issuesRes.status === 'fulfilled'
        ? normalizeIssuePage(issuesRes.value).items
        : [];
    const pollsData =
      pollsRes.status === 'fulfilled' && Array.isArray(pollsRes.value) ? pollsRes.value : [];

    // 2. Fetch milestones from project milestones API with timeline fallback
    let milestoneList = [];
    try {
      const msRes = await getProjectMilestones(pId).catch(() => null);
      if (msRes) {
        milestoneList = Array.isArray(msRes)
          ? msRes
          : msRes.milestones || msRes.items || msRes.data || [];
      }
      if (milestoneList.length === 0) {
        const tlRes = await getProjectTimeline(pId).catch(() => null);
        const groups = tlRes?.groups || (Array.isArray(tlRes) ? tlRes : []);
        const msGroups = groups.filter((g) => String(g?.type || '').toUpperCase() === 'MILESTONE');
        if (msGroups.length > 0) {
          milestoneList = msGroups.map((g) => ({
            id: g.id || g.groupId,
            name: g.name || g.title,
            targetDate: g.endDate || g.date || g.startDate,
            status: g.status || 'PLANNED',
          }));
        }
      }
    } catch {
      milestoneList = [];
    }

    // 3. Fetch activity history from recent issues
    const recentIssues = [...issuesData]
      .sort(
        (a, b) =>
          new Date(b.updatedAt || b.createdAt || 0).getTime() -
          new Date(a.updatedAt || a.createdAt || 0).getTime()
      )
      .slice(0, 5);

    const historyPromises = recentIssues.map((iss) => {
      const issId = iss?.id || iss?._id;
      return issId
        ? getIssueHistory(issId, { page: 0, size: 5 }).catch(() => null)
        : Promise.resolve(null);
    });

    const historyResults = await Promise.allSettled(historyPromises);
    const gatheredActivities = [];

    historyResults.forEach((res, idx) => {
      if (res.status === 'fulfilled' && res.value) {
        const histData = res.value;
        const histItems = Array.isArray(histData)
          ? histData
          : histData?.items || histData?.history || histData?.content || [];
        const relatedIssue = recentIssues[idx];
        const issueKey =
          relatedIssue?.key ||
          relatedIssue?.code ||
          `#${relatedIssue?.number || (relatedIssue?.id ? String(relatedIssue.id).slice(0, 4) : '1')}`;

        histItems.forEach((entry) => {
          const timestamp = entry.createdAt || entry.timestamp || relatedIssue?.updatedAt;
          gatheredActivities.push({
            id: entry.id || entry._id || Math.random(),
            actor: entry.actor?.name || entry.user?.name || entry.actorName || 'Team Member',
            action: entry.description || entry.action || entry.message || `Updated ${issueKey}`,
            timestamp,
          });
        });
      }
    });

    // Supplement with milestone/issue lifecycle if history is brief
    if (gatheredActivities.length < 4) {
      issuesData.slice(0, 6).forEach((iss) => {
        const issueKey =
          iss.key ||
          iss.code ||
          `#${iss.number || (iss.id ? String(iss.id).slice(0, 4) : '1')}`;
        const assignee = iss.assignee?.name || iss.assignedTo?.name || 'Collaborator';
        const isDone = ['RESOLVED', 'CLOSED', 'DONE'].includes(
          String(iss.status || '').toUpperCase()
        );

        if (isDone && iss.updatedAt) {
          gatheredActivities.push({
            id: `done-${iss.id}`,
            actor: assignee,
            action: `Completed task ${issueKey}`,
            timestamp: iss.updatedAt,
          });
        } else if (iss.createdAt) {
          gatheredActivities.push({
            id: `created-${iss.id}`,
            actor: iss.reporter?.name || iss.creator?.name || assignee,
            action: `Created task ${issueKey}: ${iss.title || ''}`,
            timestamp: iss.createdAt,
          });
        }
      });
    }

    const formattedActivities = gatheredActivities
      .filter((a) => a.timestamp)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 4)
      .map((act) => {
        const d = new Date(act.timestamp);
        const diffMin = Math.max(1, Math.floor((now - d.getTime()) / 60000));
        let timeStr = `${diffMin}m`;
        if (diffMin >= 60) {
          const hours = Math.floor(diffMin / 60);
          timeStr = hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
        }
        return {
          ...act,
          time: timeStr,
          initials: getInitials(act.actor),
          avatarColor: getAvatarColor(act.actor),
        };
      });

    return {
      project: projectData,
      summary: summaryData,
      members: membersData,
      sprints: sprintsData,
      issues: issuesData,
      milestones: milestoneList,
      polls: pollsData,
      activities: formattedActivities,
    };
  }, []);

  const reloadData = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setPageError('');
    try {
      const data = await loadAllProjectDataCore(projectId);
      if (data) {
        setProject(data.project);
        setSummary(data.summary);
        setMembers(data.members);
        setSprints(data.sprints);
        setIssues(data.issues);
        setMilestones(data.milestones);
        setPolls(data.polls);
        setActivities(data.activities);
      }
    } catch (err) {
      setPageError(getFriendlyErrorMessage(err, 'project'));
    } finally {
      setIsLoading(false);
    }
  }, [projectId, loadAllProjectDataCore]);

  useEffect(() => {
    let isMounted = true;
    if (!projectId) return;

    loadAllProjectDataCore(projectId)
      .then((data) => {
        if (!isMounted || !data) return;
        setProject(data.project);
        setSummary(data.summary);
        setMembers(data.members);
        setSprints(data.sprints);
        setIssues(data.issues);
        setMilestones(data.milestones);
        setPolls(data.polls);
        setActivities(data.activities);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setPageError(getFriendlyErrorMessage(err, 'project'));
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [projectId, loadAllProjectDataCore]);

  // Calculations for Hero Summary
  const overallProgress = useMemo(() => {
    if (summary?.totalIssues && summary.totalIssues > 0) {
      const closed = (summary.resolvedIssues || 0) + (summary.closedIssues || 0);
      return Math.min(100, Math.round((closed / summary.totalIssues) * 100));
    }
    if (issues.length > 0) {
      const closed = issues.filter((iss) =>
        ['RESOLVED', 'CLOSED', 'DONE'].includes(String(iss.status || '').toUpperCase())
      ).length;
      return Math.min(100, Math.round((closed / issues.length) * 100));
    }
    return 0;
  }, [summary, issues]);

  const activeSprintsCount = useMemo(() => {
    if (summary?.activeSprints !== undefined && summary.activeSprints !== null) {
      return summary.activeSprints;
    }
    return sprints.filter((s) => String(s.status || '').toUpperCase() === 'ACTIVE').length;
  }, [summary, sprints]);

  const activeIssuesCount = useMemo(() => {
    if (summary?.inProgressIssues !== undefined && summary.inProgressIssues !== null) {
      return (summary.inProgressIssues || 0) + (summary.openIssues || 0);
    }
    return issues.filter(
      (iss) =>
        !['RESOLVED', 'CLOSED', 'DONE'].includes(String(iss.status || '').toUpperCase())
    ).length;
  }, [summary, issues]);

  const myTasksCount = useMemo(() => {
    if (!currentUserId && !currentUserEmail) return 0;
    return issues.filter((iss) => {
      const aId = String(
        iss.assigneeId || iss.assignee?.id || iss.assignedTo?.id || iss.assignedTo || ''
      ).toLowerCase();
      const aEmail = String(iss.assignee?.email || iss.assignedTo?.email || '')
        .toLowerCase()
        .trim();
      return (
        (currentUserId && aId === String(currentUserId).toLowerCase()) ||
        (currentUserEmail && aEmail === currentUserEmail)
      );
    }).length;
  }, [issues, currentUserId, currentUserEmail]);

  // Sprint Overview Gauge Data
  const sprintGaugeMetrics = useMemo(() => {
    let completed = summary?.resolvedIssues || 0;
    let inProgress = summary?.inProgressIssues || 0;
    let pending = summary?.openIssues || 0;

    if (!summary?.totalIssues && issues.length > 0) {
      completed = issues.filter((i) =>
        ['RESOLVED', 'CLOSED', 'DONE'].includes(String(i.status || '').toUpperCase())
      ).length;
      inProgress = issues.filter((i) =>
        ['IN_PROGRESS', 'STARTED', 'IN_REVIEW'].includes(String(i.status || '').toUpperCase())
      ).length;
      pending = Math.max(0, issues.length - completed - inProgress);
    }

    const total = completed + inProgress + pending;
    const progressRate = total > 0 ? Math.round((completed / total) * 100) : overallProgress;

    const chartData = [
      { name: 'Completed', value: completed || (total === 0 ? 0 : 0.01), color: '#38bdf8' },
      { name: 'In Progress', value: inProgress || (total === 0 ? 0 : 0.01), color: '#0284c7' },
      { name: 'Pending', value: pending || (total === 0 ? 1 : 0.01), color: '#334155' },
    ];

    const statusLabel =
      activeSprintsCount > 0 ? 'Active Sprint' : project?.status === 'COMPLETED' ? 'Project Ended' : 'In Progress';

    return { progressRate, chartData, statusLabel };
  }, [summary, issues, overallProgress, activeSprintsCount, project?.status]);

  // Recent Poll (First poll in the list)
  const recentPoll = useMemo(() => {
    if (!polls || polls.length === 0) return null;
    return polls[0];
  }, [polls]);

  const handleVoteInRecentPoll = async (pollId, optionId) => {
    if (!pollId || !optionId) return;
    try {
      const updated = await voteInPoll(pollId, optionId);
      showToast('success', 'Your vote was recorded!');
      setPolls((prev) =>
        prev.map((p) => {
          const pid = p.id || p._id || p.pollId;
          return pid === pollId ? { ...p, ...updated } : p;
        })
      );
    } catch (err) {
      showToast('error', getFriendlyErrorMessage(err, 'poll'));
    }
  };

  const handleRemoveMember = async (member) => {
    const memberUserId = member.userId || member.id || member._id;
    const memberName = member.name || member.email || 'this member';

    if (!memberUserId) {
      showToast('error', 'Unable to remove member: missing member user ID.');
      return;
    }

    if (!window.confirm(`Are you sure you want to remove "${memberName}" from this project?`)) {
      return;
    }

    setRemovingMemberId(memberUserId);
    try {
      await removeProjectMember(projectId, memberUserId);
      showToast('success', `"${memberName}" was removed from the project.`);
      reloadData();
    } catch (err) {
      showToast('error', getFriendlyErrorMessage(err, 'project'));
    } finally {
      setRemovingMemberId(null);
    }
  };

  const projectManagerName =
    project?.projectManager?.name ||
    project?.projectManagerName ||
    (project?.projectManagerEmail ? project.projectManagerEmail.split('@')[0] : 'Maya Patel');

  const teamLeadName =
    project?.teamLead?.name ||
    project?.teamLeadName ||
    (project?.teamLeadEmail ? project.teamLeadEmail.split('@')[0] : 'Alex Morgan');

  const projectTags =
    Array.isArray(project?.tags)
      ? project.tags.join(', ')
      : project?.tags || project?.category || 'Web, UX';

  return (
    <div className="w-full min-w-0 text-slate-100 space-y-6 animate-fadeIn pb-16 px-3 sm:px-6 lg:px-8">
      {/* Toast Notice */}
      {toastNotice && (
        <div
          className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm flex items-center justify-between gap-3 shadow-lg ${
            toastNotice.type === 'success'
              ? 'bg-emerald-950/80 border border-emerald-600/40 text-emerald-300'
              : 'bg-rose-950/80 border border-rose-600/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toastNotice.type === 'success' ? (
              <FiCheckCircle className="shrink-0 text-emerald-400" size={17} />
            ) : (
              <FiAlertCircle className="shrink-0 text-rose-400" size={17} />
            )}
            <span className="font-medium">{toastNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastNotice(null)}
            className="text-xs font-semibold underline opacity-80 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Breadcrumb & Controls */}
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/dashboard/projects"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-400 hover:text-white transition"
        >
          <FiArrowLeft size={16} />
          <span>Back to projects</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reloadData}
            disabled={isLoading}
            title="Refresh overview"
            className="p-2 rounded-xl border border-[#35353d] bg-[#222228] text-slate-300 hover:bg-[#2b2b32] transition disabled:opacity-50 cursor-pointer"
          >
            <FiRefreshCw size={15} className={isLoading ? 'animate-spin text-sky-400' : ''} />
          </button>

          {isAdmin && project && (
            <>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                title="Edit Project"
                className="p-2 rounded-xl border border-[#35353d] bg-[#222228] text-slate-300 hover:bg-[#2b2b32] hover:text-sky-400 transition cursor-pointer"
              >
                <FiEdit2 size={15} />
              </button>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                title="Delete Project"
                className="p-2 rounded-xl border border-[#35353d] bg-[#222228] text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
              >
                <FiTrash2 size={15} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {pageError && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs sm:text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FiAlertCircle size={18} className="shrink-0" />
            <span>{pageError}</span>
          </div>
          <button
            type="button"
            onClick={reloadData}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Hero Header and Project Summary */}
      <section className="rounded-3xl border border-[#2d2d34] bg-[#171717] p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          {/* Left: Folder Icon + Title + Description */}
          <div className="flex items-start gap-4 sm:gap-5 min-w-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#241f3d] border border-[#3b325c] flex items-center justify-center text-white shrink-0 shadow-sm">
              <FiFolder size={28} className="text-indigo-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight truncate">
                {isLoading ? 'Loading project...' : project?.name || 'Website redesign'}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
                {project?.description || 'Redesign and rebuild the marketing website with modern UI/UX'}
              </p>
            </div>
          </div>

          {/* Right: Overall Progress Bar */}
          <div className="lg:text-right shrink-0">
            <div className="flex items-center justify-between lg:justify-end gap-3 mb-1.5">
              <span className="text-xs font-semibold text-slate-400">Overall Progress</span>
              <span className="text-xs font-bold text-white">{overallProgress}%</span>
            </div>
            <div className="h-2.5 sm:h-3 w-full sm:w-72 lg:w-80 bg-[#2b2b34] rounded-full overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-[#38bdf8] transition-all duration-500 shadow-[0_0_12px_rgba(56,189,248,0.5)]"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Hero Bottom Row: Schedule a meeting + Project Manager + 4 Metric Cards */}
        <div className="pt-4 border-t border-[#2d2d34] flex flex-col xl:flex-row xl:items-center justify-between gap-5 flex-wrap">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <button
              type="button"
              onClick={() => setIsMeetingModalOpen(true)}
              className="rounded-full bg-[#42b4d6] hover:bg-[#38a0bf] text-slate-950 font-bold text-xs sm:text-sm px-5 py-2.5 shadow-sm transition shrink-0 cursor-pointer"
            >
              Schedule a meeting
            </button>

            {/* Project Manager Avatar and Name */}
            <div className="flex items-center gap-3">
              <img
                src={project?.projectManagerAvatar || project?.projectManager?.avatarUrl || defaultAvatar}
                alt={projectManagerName}
                className="w-11 h-11 rounded-full object-cover border border-slate-700 shrink-0"
              />
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Project manager</span>
                <span className="text-sm font-bold text-white block mt-0.5 leading-tight">
                  {projectManagerName}
                </span>
              </div>
            </div>
          </div>

          {/* 4 Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 shrink-0">
            {/* Active Sprints */}
            <div className="rounded-2xl border border-[#2d2d34] bg-[#171717] px-3.5 py-2.5 flex items-center gap-3 min-w-[110px]">
              <span className="h-7 w-7 rounded-lg bg-[#2f2249] text-purple-400 flex items-center justify-center shrink-0">
                <FiRepeat size={14} />
              </span>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                  Active sprints
                </span>
                <span className="text-base sm:text-lg font-bold text-white leading-tight">
                  {isLoading ? '—' : activeSprintsCount}
                </span>
              </div>
            </div>

            {/* Active Issues */}
            <div className="rounded-2xl border border-[#2d2d34] bg-[#171717] px-3.5 py-2.5 flex items-center gap-3 min-w-[110px]">
              <span className="h-7 w-7 rounded-lg bg-[#2f2249] text-purple-400 flex items-center justify-center shrink-0">
                <FiAlertTriangle size={14} />
              </span>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                  Active issues
                </span>
                <span className="text-base sm:text-lg font-bold text-white leading-tight">
                  {isLoading ? '—' : activeIssuesCount}
                </span>
              </div>
            </div>

            {/* My Tasks */}
            <div className="rounded-2xl border border-[#2d2d34] bg-[#171717] px-3.5 py-2.5 flex items-center gap-3 min-w-[110px]">
              <span className="h-7 w-7 rounded-lg bg-[#2f2249] text-purple-400 flex items-center justify-center shrink-0">
                <FiFolder size={14} />
              </span>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                  My tasks
                </span>
                <span className="text-base sm:text-lg font-bold text-white leading-tight">
                  {isLoading ? '—' : myTasksCount}
                </span>
              </div>
            </div>

            {/* Polls */}
            <div className="rounded-2xl border border-[#2d2d34] bg-[#171717] px-3.5 py-2.5 flex items-center gap-3 min-w-[110px]">
              <span className="h-7 w-7 rounded-lg bg-[#2f2249] text-purple-400 flex items-center justify-center shrink-0">
                <FiBarChart2 size={14} />
              </span>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                  Polls
                </span>
                <span className="text-base sm:text-lg font-bold text-white leading-tight">
                  {isLoading ? '—' : polls.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      {viewingAllPolls ? (
        /* Dedicated Full Polls View when "View all" is clicked */
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewingAllPolls(false)}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition cursor-pointer"
            >
              <FiArrowLeft size={16} />
              <span>Back to Project Overview</span>
            </button>
          </div>
          <ProjectPollsSection
            projectId={projectId}
            projectName={project?.name}
            canManage={isAdmin}
            onShareToChat={() => navigate(`/dashboard/chats?projectId=${projectId}`)}
          />
        </div>
      ) : (
        /* Standard Overview Dashboard */
        <div className="space-y-6">
          {/* Top Row: Project Information + Upcoming Milestones (Recently Assigned Tasks Removed) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Project Information Card */}
            <div className="rounded-3xl border border-[#2d2d34] bg-[#171717] p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white mb-5">
                  Project Information
                </h2>
                <div className="space-y-3.5 text-xs sm:text-sm">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-slate-400 font-medium">Project Name</span>
                    <span className="text-white font-semibold text-right truncate max-w-[220px]">
                      {project?.name || 'Website Refresh'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-slate-400 font-medium">Description</span>
                    <span className="text-white font-semibold text-right truncate max-w-[220px]">
                      {project?.description || 'Website redesign'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-slate-400 font-medium">Status</span>
                    <span className="text-white font-semibold text-right capitalize">
                      {String(project?.status || 'In progress').toLowerCase().replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-slate-400 font-medium">Project manager</span>
                    <span className="text-white font-semibold text-right truncate max-w-[220px]">
                      {projectManagerName}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-slate-400 font-medium">Team leader</span>
                    <span className="text-white font-semibold text-right truncate max-w-[220px]">
                      {teamLeadName}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-slate-400 font-medium">Start date</span>
                    <span className="text-white font-semibold text-right">
                      {formatDate(project?.startDate) || 'Oct 01, 2026'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-slate-400 font-medium">Target end date</span>
                    <span className="text-white font-semibold text-right">
                      {formatDate(project?.deadline) || 'Dec 15, 2026'}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-slate-400 font-medium">Tags</span>
                    <span className="text-white font-semibold text-right truncate max-w-[220px]">
                      {projectTags}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Milestones Card */}
            <div className="rounded-3xl border border-[#2d2d34] bg-[#171717] p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white mb-5">
                  Upcoming Milestones
                </h2>

                {isLoading ? (
                  <div className="space-y-4 py-2">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="h-10 rounded-xl bg-[#27272e] animate-pulse" />
                    ))}
                  </div>
                ) : milestones.length === 0 ? (
                  <div className="py-10 text-center text-slate-400">
                    <p className="text-xs sm:text-sm font-medium text-slate-300">
                      No upcoming milestones
                    </p>
                    <p className="text-xs mt-1">
                      Milestones added to this project will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-700/60">
                    {milestones.slice(0, 4).map((m, idx) => {
                      const statusInfo = getMilestoneStatusInfo(m.status);
                      return (
                        <div
                          key={m.id || idx}
                          className="relative flex items-center justify-between gap-3 text-xs"
                        >
                          <span
                            className={`absolute -left-6 top-1.5 h-2.5 w-2.5 rounded-full ${statusInfo.dotClass}`}
                          />
                          <div className="min-w-0 pr-2">
                            <p className="text-xs sm:text-sm font-semibold text-white truncate">
                              {m.name || m.title || `Milestone ${idx + 1}`}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {formatMilestoneDate(m.targetDate || m.dueDate || m.deadline)}
                            </p>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium border shrink-0 ${statusInfo.badgeClass}`}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Middle Row: Sprint Overview + Recent Activity + Recent Poll */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Sprint Overview Card */}
            <div className="rounded-3xl border border-[#2d2d34] bg-[#171717] p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base sm:text-lg font-bold text-white">Sprint overview</h2>
                  <Link
                    to="/dashboard/sprints"
                    className="text-xs font-semibold text-slate-400 hover:text-white transition flex items-center gap-1"
                  >
                    View all <FiArrowRight size={13} />
                  </Link>
                </div>

                {/* Semi-Circle Gauge */}
                <div className="relative h-[155px] w-full flex items-center justify-center mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sprintGaugeMetrics.chartData}
                        cx="50%"
                        cy="80%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius={65}
                        outerRadius={88}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {sprintGaugeMetrics.chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-end pb-1.5 pointer-events-none">
                    <span className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                      {sprintGaugeMetrics.progressRate}%
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {sprintGaugeMetrics.statusLabel}
                    </span>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-3.5 text-[11px] mt-4 pt-2 border-t border-[#2d2d34]">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-[#38bdf8]" /> Completed
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-[#0284c7]" /> In Progress
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="h-2 w-2 rounded-full bg-[#334155]" /> Pending
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Activity Card */}
            <div className="rounded-3xl border border-[#2d2d34] bg-[#171717] p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white mb-4">Recent Activity</h2>

                {isLoading ? (
                  <div className="space-y-3 py-2">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="h-9 rounded-xl bg-[#27272e] animate-pulse" />
                    ))}
                  </div>
                ) : activities.length === 0 ? (
                  <div className="py-10 text-center text-slate-400">
                    <p className="text-xs sm:text-sm font-medium text-slate-300">
                      No recent activity
                    </p>
                    <p className="text-xs mt-1">Activity logs will appear as team members work.</p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {activities.map((act) => (
                      <div
                        key={act.id}
                        className="flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-[11px] text-white shrink-0 shadow-xs"
                            style={{ backgroundColor: act.avatarColor }}
                          >
                            {act.initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-bold truncate leading-tight">
                              {act.actor}
                            </p>
                            <p className="text-slate-400 text-[11px] truncate max-w-[170px] sm:max-w-xs mt-0.5">
                              {act.action}
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium shrink-0">
                          {act.time}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Poll Card */}
            <div className="rounded-3xl border border-[#2d2d34] bg-[#171717] p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base sm:text-lg font-bold text-white">Recent Poll</h2>
                  <button
                    type="button"
                    onClick={() => setViewingAllPolls(true)}
                    className="text-xs font-semibold text-slate-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
                  >
                    View all <FiArrowRight size={13} />
                  </button>
                </div>

                {isLoading ? (
                  <div className="space-y-2 py-2">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="h-8 rounded-xl bg-[#27272e] animate-pulse" />
                    ))}
                  </div>
                ) : !recentPoll ? (
                  <div className="py-10 text-center text-slate-400">
                    <p className="text-xs sm:text-sm font-medium text-slate-300">No active polls</p>
                    <p className="text-xs mt-1">Create a poll to collect team votes on decisions.</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-white mb-3 leading-snug">
                      Q. {recentPoll.question || 'Which approach should we finalize?'}
                    </p>

                    <div className="space-y-2.5">
                      {(recentPoll.options || []).map((opt, idx) => {
                        const letter = String.fromCharCode(65 + idx);
                        const votes = opt.voteCount ?? opt.votes ?? 0;
                        const totalVotes =
                          recentPoll.totalVotes ||
                          (recentPoll.options || []).reduce(
                            (acc, o) => acc + (o.voteCount ?? o.votes ?? 0),
                            0
                          ) ||
                          1;
                        const barPct = Math.max(
                          Math.round((votes / totalVotes) * 100),
                          votes > 0 ? 8 : 2
                        );
                        const isClosed =
                          recentPoll.status === 'CLOSED' || recentPoll.closed === true;

                        return (
                          <div
                            key={opt.id || opt._id || idx}
                            onClick={() =>
                              !isClosed &&
                              handleVoteInRecentPoll(recentPoll.id || recentPoll._id, opt.id || opt._id)
                            }
                            className={`flex items-center gap-2.5 group ${
                              !isClosed ? 'cursor-pointer' : ''
                            }`}
                          >
                            <span className="text-xs font-bold text-white w-3 text-center shrink-0">
                              {letter}
                            </span>
                            <div className="flex-1 h-3.5 rounded-md bg-[#2a2a32] overflow-hidden p-0.5">
                              <div
                                className={`h-full rounded-sm transition-all duration-300 ${
                                  idx % 2 === 0 ? 'bg-[#7dd3fc]' : 'bg-[#38bdf8]'
                                } group-hover:brightness-110`}
                                style={{ width: `${barPct}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-slate-300 w-4 text-right shrink-0">
                              {votes}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Under Dashboard: Project Sprints (Top 5 + View all) */}
          <section className="rounded-3xl border border-[#2d2d34] bg-[#171717] p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2d2d34] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-950/40 text-purple-400 flex items-center justify-center shrink-0">
                  <FiRepeat size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white">Project Sprints</h3>
                    <span className="rounded-full bg-[#27272e] px-2.5 py-0.5 text-xs font-bold text-slate-300">
                      {sprints.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Planned and active sprint cycles for this project.
                  </p>
                </div>
              </div>

              <Link
                to="/dashboard/sprints"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#35353d] bg-[#26262c] hover:bg-[#32323a] text-xs font-semibold text-slate-300 hover:text-white transition"
              >
                <span>View all</span>
                <FiArrowRight size={13} />
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-11 rounded-xl bg-[#27272e] animate-pulse" />
                ))}
              </div>
            ) : sprints.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <p className="text-xs sm:text-sm font-semibold text-slate-300">
                  No sprints created for this project yet
                </p>
                <p className="text-xs mt-1">
                  Create sprint iterations from the Sprints board to organize issues into cycles.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-xs">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-[#2d2d34]">
                      <th className="py-2.5 px-3">Sprint</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Goal</th>
                      <th className="py-2.5 px-3 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a2a30]">
                    {sprints.slice(0, 5).map((sprint, idx) => (
                      <tr
                        key={sprint.id || sprint._id || idx}
                        onClick={() => navigate('/dashboard/sprints')}
                        className="cursor-pointer hover:bg-[#27272e] transition"
                      >
                        <td className="py-3 px-3">
                          <p className="font-semibold text-white truncate max-w-xs">
                            {sprint.name || `Sprint ${idx + 1}`}
                          </p>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getSprintStatusBadge(
                              sprint.status
                            )}`}
                          >
                            {String(sprint.status || 'PLANNED').replace(/[_-]/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                          {sprint.startDate || sprint.endDate
                            ? `${formatDate(sprint.startDate)} – ${formatDate(sprint.endDate)}`
                            : 'Dates not set'}
                        </td>
                        <td className="py-3 px-3 text-slate-400 truncate max-w-xs">
                          {sprint.goal || sprint.description || '—'}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          <FiChevronRight size={15} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Under Dashboard: Project Issues (Top 5 + View all + Create Issue) */}
          <section className="rounded-3xl border border-[#2d2d34] bg-[#171717] p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2d2d34] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-950/40 text-sky-400 flex items-center justify-center shrink-0">
                  <FiAlertTriangle size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white">Project Issues</h3>
                    <span className="rounded-full bg-[#27272e] px-2.5 py-0.5 text-xs font-bold text-slate-300">
                      {issues.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Tasks and defects logged for {project?.name || 'this project'}.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateIssueOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-xs font-semibold text-white transition cursor-pointer"
                >
                  <FiPlus size={14} />
                  <span>Create Issue</span>
                </button>
                <Link
                  to={`/dashboard/issues?projectId=${projectId}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#35353d] bg-[#26262c] hover:bg-[#32323a] text-xs font-semibold text-slate-300 hover:text-white transition"
                >
                  <span>View all</span>
                  <FiArrowRight size={13} />
                </Link>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-11 rounded-xl bg-[#27272e] animate-pulse" />
                ))}
              </div>
            ) : issues.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <p className="text-xs sm:text-sm font-semibold text-slate-300">
                  No issues in this project yet
                </p>
                <p className="text-xs mt-1">Create issues to track tasks, bugs, and deliverables.</p>
                <button
                  type="button"
                  onClick={() => setIsCreateIssueOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  <FiPlus size={13} /> Create Issue
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-xs">
                  <thead>
                    <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-[#2d2d34]">
                      <th className="py-2.5 px-3">Issue</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Priority</th>
                      <th className="py-2.5 px-3">Due date</th>
                      <th className="py-2.5 px-3 w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a2a30]">
                    {issues.slice(0, 5).map((issue, index) => (
                      <tr
                        key={issue.id || issue._id || issue.issueId || index}
                        className="cursor-pointer hover:bg-[#27272e] transition"
                        onClick={() => setSelectedIssue(issue)}
                      >
                        <td className="py-3 px-3">
                          <span className="font-mono text-[10px] text-slate-500">
                            {issue.issueNumber ? `#${issue.issueNumber}` : ''}
                          </span>
                          <p className="mt-0.5 font-semibold text-white truncate max-w-xs">
                            {issue.title || 'Untitled issue'}
                          </p>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${getIssueStatusBadge(
                              issue.status
                            )}`}
                          >
                            {String(issue.status || 'OPEN').replace(/[_-]/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold ${getPriorityBadge(
                              issue.priority
                            )}`}
                          >
                            {String(issue.priority || 'MEDIUM').replace(/[_-]/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                          {issue.dueDate ? formatDate(issue.dueDate) : '—'}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          <FiChevronRight size={15} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Under Dashboard: Project Members (with Add Member) */}
          <section className="rounded-3xl border border-[#2d2d34] bg-[#171717] p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2d2d34] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-950/40 text-indigo-400 flex items-center justify-center shrink-0">
                  <FiUsers size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white">Project Members</h3>
                    <span className="rounded-full bg-[#27272e] px-2.5 py-0.5 text-xs font-bold text-slate-300">
                      {members.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Collaborators assigned to work on this project.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddMemberModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-700 text-xs sm:text-sm font-semibold text-white shadow-md shadow-sky-600/20 dark:shadow-blue-900/30 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#171717]"
              >
                <FiUserPlus size={15} />
                <span>Add Member</span>
              </button>
            </div>

            {isLoading ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-12 rounded-xl bg-[#27272e] animate-pulse" />
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <p className="text-xs sm:text-sm font-semibold text-slate-300">
                  No members assigned yet
                </p>
                <p className="text-xs mt-1">
                  Add collaborators to this project so they can receive task assignments and participate in sprints.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-700 text-white text-xs font-semibold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#171717]"
                >
                  <FiUserPlus size={14} /> Add First Member
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {members.map((member, idx) => {
                  const memberUserId = member.userId || member.id || member._id;
                  const name = member.name || member.email?.split('@')[0] || 'Member';
                  const email = member.email || '';
                  const role = member.role || 'CONTRIBUTOR';
                  const roleBadgeClass = getRoleBadge(role);
                  const isRemoving = removingMemberId === memberUserId;

                  return (
                    <div
                      key={memberUserId || email || idx}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-[#171717] border border-[#2d2d34] hover:border-[#3d3d46] transition gap-3"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs"
                          style={{ backgroundColor: getAvatarColor(name || email) }}
                        >
                          {getInitials(name || email)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs sm:text-sm font-bold text-white truncate">
                              {name}
                            </p>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${roleBadgeClass}`}
                            >
                              {role}
                            </span>
                          </div>
                          {email && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {email}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Member Actions */}
                      <div className="shrink-0">
                        <button
                          type="button"
                          disabled={isRemoving}
                          onClick={() => handleRemoveMember(member)}
                          title={`Remove ${name} from project`}
                          aria-label={`Remove ${name} from project`}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition cursor-pointer disabled:opacity-50"
                        >
                          {isRemoving ? (
                            <span className="w-3.5 h-3.5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin inline-block" />
                          ) : (
                            <FiTrash2 size={15} />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Modals */}
      {isMeetingModalOpen && (
        <MeetingModal
          isOpen={isMeetingModalOpen}
          onClose={() => setIsMeetingModalOpen(false)}
          projects={project ? [project] : []}
          onMeetingSaved={() => {
            showToast('success', 'Meeting scheduled successfully.');
          }}
        />
      )}

      {isAdmin && project && isEditModalOpen && (
        <EditProjectModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          project={project}
          onProjectUpdated={(updated) => {
            showToast('success', `"${updated?.name || 'Project'}" was updated successfully.`);
            reloadData();
          }}
        />
      )}

      {isAdmin && project && isDeleteModalOpen && (
        <DeleteProjectModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          project={project}
          onProjectDeleted={() => navigate('/dashboard/projects', { replace: true })}
        />
      )}

      {isAddMemberModalOpen && (
        <AddProjectMemberModal
          isOpen={isAddMemberModalOpen}
          onClose={() => setIsAddMemberModalOpen(false)}
          projectId={projectId}
          projectName={project?.name || 'Project'}
          existingMembers={members}
          onMemberAdded={(added) => {
            showToast('success', `${added?.name || added?.email || 'Member'} was added.`);
            reloadData();
          }}
        />
      )}

      <CreateIssueModal
        isOpen={isCreateIssueOpen}
        onClose={() => setIsCreateIssueOpen(false)}
        projects={project ? [project] : []}
        defaultProjectId={projectId}
        onIssueCreated={(created) => {
          showToast('success', `“${created?.title || 'Issue'}” was created.`);
          reloadData();
        }}
      />

      <IssueDetailsModal
        key={`${selectedIssue?.id || selectedIssue?._id || selectedIssue?.issueId || 'none'}-${!!selectedIssue}`}
        isOpen={!!selectedIssue}
        onClose={() => setSelectedIssue(null)}
        issueId={selectedIssue?.id || selectedIssue?._id || selectedIssue?.issueId}
        initialIssue={selectedIssue}
        projectName={project?.name || ''}
        onIssueUpdated={reloadData}
        onIssueDeleted={() => {
          setSelectedIssue(null);
          reloadData();
        }}
      />
    </div>
  );
};

export default ProjectDetailsView;
