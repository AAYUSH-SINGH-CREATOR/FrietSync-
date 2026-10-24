import { useState, useEffect, useMemo, useCallback } from 'react';
import { formatRoleLabel } from '../../../utils/formatRoleLabel';
import { useOutletContext, Link } from 'react-router-dom';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { FiUsers, FiUserPlus, FiSearch, FiRefreshCw, FiSettings, FiCheckSquare, FiClock, FiAlertTriangle, FiCheckCircle, FiActivity, FiPlus, FiAlertCircle, FiCheck, FiLayers } from 'react-icons/fi';
import { getWorkspaceMembers, getMyWorkspace, getFriendlyErrorMessage } from '../services/workspaceApi';
import { getMyProjects } from '../../projects/services/projectApi';
import { getProjectIssues, getIssueHistory } from '../../issues/services/issueApi';
import { formatNotificationTime } from '../services/notificationApi';
import { canSendInvites } from '../../invites/utils/invitePermissions';
import InviteModal from '../../invites/components/InviteModal';

const CHART_COLORS = [ '#d946ef', '#8b5cf6', '#06b6d4','#f59e0b', '#10b981', '#3b82f6','#ec4899','#6366f1'];

const AVATAR_COLORS = ['#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#6366f1'];

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

const formatRole = (role = '') => formatRoleLabel(role || 'CONTRIBUTOR');

const getRoleBadgeStyle = (role = '') => {
  const norm = String(role || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (['OWNER', 'WORKSPACE_ADMIN', 'ADMIN'].includes(norm)) {
    return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40';
  }
  if (['PROJECT_MANAGER', 'TEAM_LEAD', 'LEAD'].includes(norm)) {
    return 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40';
  }
  if (norm === 'REPORTER') {
    return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40';
  }
  return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40';
};

const isIssueAssignedToMember = (issue, member) => {
  if (!issue || !member) return false;
  const memberId = String(member.id || member._id || member.userId || member.user?.id || '').toLowerCase();
  const memberEmail = String(member.email || member.user?.email || '').toLowerCase().trim();
  const memberName = String(member.name || member.fullName || member.userName || member.user?.name || '').toLowerCase().trim();

  if (memberId) {
    if (String(issue.assigneeId || '').toLowerCase() === memberId) return true;
    if (String(issue.assignee?.id || issue.assignee?._id || '').toLowerCase() === memberId) return true;
    if (String(issue.assignedTo?.id || issue.assignedTo?._id || '').toLowerCase() === memberId) return true;
    if (typeof issue.assignedTo === 'string' && issue.assignedTo.toLowerCase() === memberId) return true;
    if (Array.isArray(issue.assigneeIds) && issue.assigneeIds.some((id) => String(id).toLowerCase() === memberId)) return true;
    if (Array.isArray(issue.assignees) && issue.assignees.some((u) => String(u?.id || u?._id || u).toLowerCase() === memberId)) return true;
  }

  if (memberEmail) {
    if (String(issue.assignee?.email || '').toLowerCase().trim() === memberEmail) return true;
    if (String(issue.assignedTo?.email || '').toLowerCase().trim() === memberEmail) return true;
    if (Array.isArray(issue.assignees) && issue.assignees.some((u) => String(u?.email || '').toLowerCase().trim() === memberEmail)) return true;
  }

  if (memberName) {
    if (String(issue.assignee?.name || issue.assignee?.fullName || '').toLowerCase().trim() === memberName) return true;
    if (String(issue.assignedTo?.name || issue.assignedTo?.fullName || '').toLowerCase().trim() === memberName) return true;
  }

  return false;
};

// Accessible dark tooltip for Recharts Doughnut
const PieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs shadow-xl dark:border-[#383840] dark:bg-[#1e1e24] text-slate-900 dark:text-white">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: item.payload?.color || item.color }}
          />
          <span className="font-semibold">{item.name}:</span><span className="font-bold">{item.value} tasks</span>
          {item.payload?.percentage !== undefined && (
            <span className="text-slate-500 dark:text-slate-400">({item.payload.percentage}%)</span>
          )}
        </div>
      </div>
    );
  }
  return null;
};

// Accessible dark tooltip for Recharts BarChart
const BarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl dark:border-[#383840] dark:bg-[#1e1e24] text-slate-900 dark:text-white">
        {label && <p className="font-bold text-slate-700 dark:text-slate-200 mb-1.5">{label}</p>}
        {payload.map((entry, idx) => (
          <div key={`entry-${idx}`} className="flex items-center gap-2 py-0.5">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{ backgroundColor: entry.color || entry.fill }}
            />
            <span className="text-slate-500 dark:text-slate-400 capitalize">{entry.name}:</span>
            <span className="font-bold">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const TeamView = () => {
  const outletContext = useOutletContext() || {};
  const { currentUserProfile } = outletContext;

  const [workspace, setWorkspace] = useState(null);
  const [members, setMembers] = useState([]);
  const [, setProjects] = useState([]);
  const [issues, setIssues] = useState([]);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [toastNotice, setToastNotice] = useState(null);

  const canInvite = !outletContext.isLoadingUserProfile && canSendInvites(currentUserProfile);
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

  const showToast = useCallback((type, message) => {
    setToastNotice({ type, message });
    window.setTimeout(() => setToastNotice(null), 4000);
  }, []);

  const fetchTeamDataCore = useCallback(async () => {
    const ws = await getMyWorkspace();
    const wsId = ws?.id || ws?._id || ws?.workspaceId;

    // 1. Fetch members and projects concurrently
    const [memberList, projectList] = await Promise.all([
      wsId ? getWorkspaceMembers(wsId).catch(() => []) : Promise.resolve([]),
      getMyProjects().catch(() => []),
    ]);

    const safeMembers = Array.isArray(memberList) ? memberList : [];
    const safeProjects = Array.isArray(projectList) ? projectList : [];

    // 2. Fetch issues across user projects
    const issuesPromises = safeProjects.map((p) => {
      const pid = p?.id || p?._id || p?.projectId;
      return pid
        ? getProjectIssues(pid, { page: 0, size: 100 }).catch(() => ({ items: [] }))
        : Promise.resolve({ items: [] });
    });

    const issueResults = await Promise.allSettled(issuesPromises);
    const allIssues = [];
    const currentTimestamp = Date.now();

    issueResults.forEach((res, i) => {
      if (res.status === 'fulfilled' && res.value?.items) {
        const proj = safeProjects[i];
        res.value.items.forEach((issue) => {
          const dueTime = issue.dueDate ? new Date(issue.dueDate).getTime() : NaN;
          const isOverdue = !Number.isNaN(dueTime) && dueTime < currentTimestamp;
          allIssues.push({
            ...issue,
            isOverdue,
            projectName: proj?.name || issue.projectName || 'Project',
            projectKey:
              proj?.key ||
              proj?.code ||
              (proj?.name ? proj.name.slice(0, 3).toUpperCase() : 'PRJ'),
          });
        });
      }
    });

    // 3. Gather recent team activity from issue history and updates
    const recentIssues = [...allIssues]
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
          `${relatedIssue?.projectKey || 'TASK'}-${
            relatedIssue?.number || (relatedIssue?.id ? String(relatedIssue.id).slice(0, 4) : '1')
          }`;

        histItems.forEach((entry) => {
          gatheredActivities.push({
            id: entry.id || entry._id || Math.random(),
            actor: entry.actor?.name || entry.user?.name || entry.actorName || 'Team Member',
            action: entry.description || entry.action || entry.message || 'updated task',
            issueKey,
            issueTitle: relatedIssue?.title,
            timestamp: entry.createdAt || entry.timestamp || relatedIssue?.updatedAt,
            type: 'history',
          });
        });
      }
    });

    // If history entries are sparse, supplement with real issue creation/completion milestones
    if (gatheredActivities.length < 5) {
      allIssues.forEach((iss) => {
        const issueKey = iss.key || iss.code || `${iss.projectKey || 'TASK'}-${iss.number || (iss.id ? String(iss.id).slice(0, 4) : '1')}`;
        const assigneeName = iss.assignee?.name || iss.assignedTo?.name || iss.assigneeName || 'Team Member';
        const isDone = ['RESOLVED', 'CLOSED', 'DONE', 'COMPLETED'].includes(String(iss.status || '').toUpperCase());

        if (isDone && iss.updatedAt) {
          gatheredActivities.push({ id: `done-${iss.id}`, actor: assigneeName, action: 'completed task', issueKey, issueTitle: iss.title, timestamp: iss.updatedAt, type: 'completed' });
        } else if (iss.createdAt) {
          gatheredActivities.push({ id: `created-${iss.id}`, actor: iss.reporter?.name || iss.creator?.name || assigneeName, action: 'created task', issueKey, issueTitle: iss.title, timestamp: iss.createdAt, type: 'created' });
        }
      });
    }

    // Sort activities descending by timestamp and take recent 8
    const sortedActivities = gatheredActivities
      .filter((a) => a.timestamp)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);

    return {
      workspace: ws,
      members: safeMembers,
      projects: safeProjects,
      issues: allIssues,
      activities: sortedActivities,
    };
  }, []);

  const loadTeamData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchTeamDataCore();
      setWorkspace(data.workspace);
      setMembers(data.members);
      setProjects(data.projects);
      setIssues(data.issues);
      setActivities(data.activities);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'workspace'));
    } finally {
      setIsLoading(false);
    }
  }, [fetchTeamDataCore]);

  useEffect(() => {
    let isMounted = true;
    fetchTeamDataCore()
      .then((data) => {
        if (!isMounted) return;
        setWorkspace(data.workspace);
        setMembers(data.members);
        setProjects(data.projects);
        setIssues(data.issues);
        setActivities(data.activities);
        setError('');
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(getFriendlyErrorMessage(err, 'workspace'));
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [fetchTeamDataCore]);

  // Summary Cards Metrics
  const summaryMetrics = useMemo(() => {
    const total = issues.length;
    let active = 0;
    let overdue = 0;
    let completed = 0;

    issues.forEach((iss) => {
      const status = String(iss.status || '').toUpperCase().replace(/[\s-]+/g, '_');
      const isCompleted = ['RESOLVED', 'CLOSED', 'DONE', 'COMPLETED'].includes(status);
      if (isCompleted) {
        completed++;
      } else {
        active++;
        if (iss.isOverdue) {
          overdue++;
        }
      }
    });

    return { total, active, overdue, completed };
  }, [issues]);

  // Per-member workload and progress metrics
  const memberMetrics = useMemo(() => {
    return members.map((member, index) => {
      const assignedIssues = issues.filter((iss) => isIssueAssignedToMember(iss, member));
      const assignedCount = assignedIssues.length;
      let completedCount = 0;
      let activeCount = 0;
      let overdueCount = 0;

      assignedIssues.forEach((iss) => {
        const status = String(iss.status || '').toUpperCase().replace(/[\s-]+/g, '_');
        const isCompleted = ['RESOLVED', 'CLOSED', 'DONE', 'COMPLETED'].includes(status);
        if (isCompleted) {
          completedCount++;
        } else {
          activeCount++;
          if (iss.isOverdue) {
            overdueCount++;
          }
        }
      });

      const progressPct =
        assignedCount > 0 ? Math.round((completedCount / assignedCount) * 100) : 0;
      const name =
        member.name ||
        member.fullName ||
        member.userName ||
        member.user?.name ||
        `Member ${index + 1}`;
      const email = member.email || member.user?.email || '';
      const role = member.role || member.workspaceRole || 'CONTRIBUTOR';
      const avatar =
        member.profilePictureUrl || member.avatarUrl || member.user?.profilePictureUrl;
      const memberId = member.id || member._id || member.userId || member.user?.id || index;

      return {
        id: memberId,
        rawMember: member,
        name,
        shortName: name.split(' ')[0] || name,
        email,
        role,
        avatar,
        assigned: assignedCount,
        completed: completedCount,
        active: activeCount,
        overdue: overdueCount,
        progressPct,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    });
  }, [members, issues]);

  // Doughnut Chart Data (distribution of assigned tasks)
  const workloadDistributionData = useMemo(() => {
    const activeWithTasks = memberMetrics.filter((m) => m.assigned > 0);
    const totalAssigned = activeWithTasks.reduce((acc, m) => acc + m.assigned, 0);

    if (activeWithTasks.length === 0) return [];

    return activeWithTasks.map((m) => ({
      name: m.name,
      value: m.assigned,
      percentage: totalAssigned > 0 ? Math.round((m.assigned / totalAssigned) * 100) : 0,
      color: m.color,
    }));
  }, [memberMetrics]);

  // Grouped Bar Chart Data (assigned vs completed)
  const workloadComparisonData = useMemo(() => {
    return memberMetrics.map((m) => ({
      name: m.name,
      shortName: m.shortName,
      assigned: m.assigned,
      completed: m.completed,
      active: m.active,
    }));
  }, [memberMetrics]);

  // Filtered members list for bottom table
  const filteredMembers = useMemo(() => {
    return memberMetrics.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      const normRole = String(m.role || '').toUpperCase();
      if (roleFilter === 'ALL') return true;
      if (roleFilter === 'MANAGER') return normRole === 'PROJECT_MANAGER';
      if (roleFilter === 'LEADER') return ['TEAM_LEAD', 'LEAD'].includes(normRole);
      if (roleFilter === 'CONTRIBUTOR') return ['CONTRIBUTOR', 'MEMBER'].includes(normRole);
      if (roleFilter === 'REPORTER') return normRole === 'REPORTER';
      return true;
    });
  }, [memberMetrics, searchQuery, roleFilter]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12 px-3 sm:px-6 lg:px-8">
      {/* Toast Notice */}
      {toastNotice && (
        <div
          className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm flex items-center gap-2.5 transition-all ${
            toastNotice.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-[#34D399] border border-emerald-200 dark:border-emerald-800/60'
              : 'bg-red-50 dark:bg-rose-950/40 text-red-700 dark:text-[#F87171] border border-red-200 dark:border-rose-800/60'
          }`}
        >
          {toastNotice.type === 'success' ? (
            <FiCheck className="shrink-0 text-emerald-600 dark:text-[#34D399]" size={17} />
          ) : (
            <FiAlertCircle className="shrink-0 text-red-500 dark:text-[#F87171]" size={17} />
          )}
          <span className="font-medium">{toastNotice.message}</span>
        </div>
      )}

      {/* Page Header matching reference */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">My team</h1>
            {workspace?.name && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40"><FiLayers size={11} /> {workspace.name}</span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94a3b8] mt-1">manage and view your team</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadTeamData}
            disabled={isLoading}
            title="Refresh team data"
            aria-label="Refresh team data"
            className="p-2.5 rounded-full border border-slate-200 dark:border-[#35353a] bg-white dark:bg-[#1e1e22] text-slate-600 dark:text-[#d1d5db] hover:bg-slate-50 dark:hover:bg-[#28282e] transition disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            <FiRefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>

          {canInvite && (
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs transition cursor-pointer"
            >
              <FiUserPlus size={16} />
              <span>Invite Members</span>
            </button>
          )}

          <Link
            to="/dashboard/settings"
            title="Workspace Settings"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-[#35353a] bg-white dark:bg-[#1e1e22] text-slate-600 dark:text-[#d1d5db] hover:bg-slate-50 dark:hover:bg-[#28282e] transition cursor-pointer shadow-2xs"
          >
            <FiSettings size={16} />
          </Link>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FiAlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadTeamData}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg transition cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Four Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Total Tasks */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-[#2d2d32] bg-white dark:bg-[#171717] p-4 sm:p-5 shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-[#94a3b8] uppercase tracking-wider">Total Tasks</span>
            <span className="h-9 w-9 rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 flex items-center justify-center shrink-0">
              <FiCheckSquare size={17} />
            </span>
          </div>
          <div className="mt-2">
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
              {isLoading ? '...' : summaryMetrics.total}
            </p>
            <p className="text-xs text-slate-500 dark:text-[#888] mt-1">Across all projects</p>
          </div>
        </div>

        {/* Active Tasks */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-[#2d2d32] bg-white dark:bg-[#171717] p-4 sm:p-5 shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-[#94a3b8] uppercase tracking-wider">Active Tasks</span>
            <span className="h-9 w-9 rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 flex items-center justify-center shrink-0">
              <FiClock size={17} />
            </span>
          </div>
          <div className="mt-2">
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
              {isLoading ? '...' : summaryMetrics.active}
            </p>
            <p className="text-xs text-sky-600 dark:text-sky-400 font-medium mt-1">In progress</p>
          </div>
        </div>

        {/* Overdue Tasks */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-[#2d2d32] bg-white dark:bg-[#171717] p-4 sm:p-5 shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-[#94a3b8] uppercase tracking-wider">Overdue Tasks</span>
            <span className="h-9 w-9 rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 flex items-center justify-center shrink-0">
              <FiAlertTriangle size={17} />
            </span>
          </div>
          <div className="mt-2">
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
              {isLoading ? '...' : summaryMetrics.overdue}
            </p>
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-1">
              {summaryMetrics.overdue > 0 ? 'Requires attention' : 'On schedule'}
            </p>
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-[#2d2d32] bg-white dark:bg-[#171717] p-4 sm:p-5 shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-[#94a3b8] uppercase tracking-wider">Completed Tasks</span>
            <span className="h-9 w-9 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <FiCheckCircle size={17} />
            </span>
          </div>
          <div className="mt-2">
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
              {isLoading ? '...' : summaryMetrics.completed}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
              Done across projects
            </p>
          </div>
        </div>
      </div>

      {/* Two Workload Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Left: Team Workload Distribution (Doughnut Chart) */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-[#2d2d32] bg-white dark:bg-[#171717] p-3 sm:p-4 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Team workload chart</h2>
          </div>

          {isLoading ? (
            <div className="h-[170px] flex items-center justify-center animate-pulse">
              <div className="h-32 w-32 rounded-full border-4 border-slate-200 dark:border-[#33333a]" />
            </div>
          ) : workloadDistributionData.length === 0 ? (
            <div className="h-[170px] flex flex-col items-center justify-center text-center p-4 text-slate-400 dark:text-[#888]">
              <FiUsers size={32} className="mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">No tasks assigned yet</p>
              <p className="text-xs mt-0.5">Assign issues to team members to visualize task distribution.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-2 sm:gap-3">
              <div className="h-[170px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={workloadDistributionData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={64}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {workloadDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend List */}
              <div className="space-y-1.5 max-h-[170px] overflow-y-auto pr-1">
                <div className="grid grid-cols-[minmax(0,1fr)_40px_36px] gap-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-[#888]"><span /><span className="text-center">Tasks</span><span className="text-center">%</span></div>
                {workloadDistributionData.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[minmax(0,1fr)_40px_36px] items-center gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0 pr-1">
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{item.name}</span>
                    </div>
                    <span className="text-slate-500 dark:text-[#94a3b8] font-semibold text-center">{item.value}</span>
                    <span className="text-slate-500 dark:text-[#94a3b8] font-semibold text-center">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Team Workload Comparison (Grouped Bar Chart) */}
        <div className="rounded-2xl border border-slate-200/90 dark:border-[#2d2d32] bg-white dark:bg-[#171717] p-3 sm:p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">Team workload</h2>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-[#35353d] bg-slate-50 dark:bg-[#25252a] px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Tasks</span>
            </div>
          </div>

          {isLoading ? (
            <div className="h-[170px] flex items-center justify-center animate-pulse">
              <div className="h-full w-full bg-slate-100 dark:bg-[#25252a] rounded-xl" />
            </div>
          ) : workloadComparisonData.length === 0 ? (
            <div className="h-[170px] flex flex-col items-center justify-center text-center p-4 text-slate-400 dark:text-[#888]">
              <FiCheckSquare size={32} className="mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">No workload data available</p>
              <p className="text-xs mt-0.5">Members will appear here once tasks are assigned.</p>
            </div>
          ) : (
            <div className="h-[170px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={workloadComparisonData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(150, 150, 160, 0.15)"
                  />
                  <XAxis
                    dataKey="shortName"
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    axisLine={{ stroke: 'var(--border-default)' }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<BarTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', paddingBottom: '8px', color: 'var(--text-muted)' }}
                  />
                  <Bar
                    dataKey="assigned"
                    name="Assigned"
                    fill="#c026d3"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={24}
                  />
                  <Bar
                    dataKey="completed"
                    name="Completed"
                    fill="#38bdf8"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid: Team Members Table (Left) + Activity Feed (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Left: Team Members Table */}
        <section className="rounded-2xl border border-slate-200/90 dark:border-[#2d2d32] bg-white dark:bg-[#171717] p-4 sm:p-6 shadow-xs flex flex-col space-y-4">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Team members</h2>
                <p className="text-xs text-slate-500 dark:text-[#94a3b8]">{memberMetrics.length} total collaborators in workspace</p>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-48">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search members..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#26262b] border border-slate-200 dark:border-[#383840] text-xs text-slate-800 dark:text-white placeholder:text-slate-400 outline-none focus:border-purple-500 transition"
                />
              </div>
            </div>

            {/* Role Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {['ALL', 'MANAGER', 'LEADER', 'CONTRIBUTOR'].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setRoleFilter(tab)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer shrink-0 ${
                    roleFilter === tab
                    ? 'bg-purple-600 text-white'
                      : 'text-slate-600 dark:text-[#999] hover:bg-slate-100 dark:hover:bg-[#28282e]'
                  }`}
                >
                  {tab === 'ALL'
                    ? 'All'
                    : tab === 'MANAGER'
                      ? 'Manager'
                      : tab === 'LEADER'
                        ? 'Leader'
                        : 'Contributors'}
                </button>
              ))}
            </div>
          </div>

          {/* Members Table */}
          {isLoading ? (
            <div className="space-y-3 py-3">
              {[0, 1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-[#2d2d32] bg-slate-50/50 dark:bg-[#242426] animate-pulse"
                >
                  <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-[#34343a]" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-28 rounded-sm bg-slate-200 dark:bg-[#34343a]" />
                    <div className="h-2 w-40 rounded-sm bg-slate-200 dark:bg-[#34343a]" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-10 text-center text-slate-400 dark:text-[#888] space-y-2">
              <FiUsers className="mx-auto text-slate-300 dark:text-slate-600" size={28} />
                <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">{searchQuery ? 'No matching team members found' : 'No workspace members found'}</p>
              {canInvite && !searchQuery && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 transition cursor-pointer"
                  >
                    <FiUserPlus size={13} /> Invite your first member
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-[#2e2e34] text-[11px] font-bold uppercase text-slate-400 dark:text-[#888]">
                    <th className="py-2.5 px-2">Member</th><th className="py-2.5 px-2">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#26262a]">
                  {filteredMembers.map((member) => {
                    const isCurrent =
                      (currentUserId && String(member.id) === String(currentUserId)) ||
                      (currentUserEmail &&
                        member.email &&
                        member.email.toLowerCase() === currentUserEmail);

                    return (
                      <tr
                        key={member.id}
                        className="hover:bg-slate-50 dark:hover:bg-[#232328] transition"
                      >
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-2.5 min-w-[130px]">
                            {member.avatar ? (
                              <img
                                src={member.avatar}
                                alt={member.name}
                                className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                              />
                            ) : (
                              <div
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white font-bold text-[11px] shadow-2xs"
                                style={{ backgroundColor: getAvatarColor(member.name || member.email) }}
                              >
                                {getInitials(member.name || member.email)}
                              </div>
                            )}
                            <div className="min-w-0 max-w-[110px] sm:max-w-[140px]">
                              <div className="flex items-center gap-1">
                                <span className="font-semibold text-slate-900 dark:text-white truncate">{member.name}</span>
                                {isCurrent && <span className="rounded-full bg-purple-500/10 px-1.5 py-0.2 text-[9px] font-bold text-purple-600 dark:bg-purple-500/20 dark:text-purple-300 shrink-0">You</span>}
                              </div>
                              {member.email && (
                                <p className="text-[10px] text-slate-500 dark:text-[#888] truncate">{member.email}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-2">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getRoleBadgeStyle(
                              member.role
                            )}`}
                          >
                            {formatRole(member.role)}
                          </span>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Right: Team Activity Feed */}
        <section className="rounded-2xl border border-slate-200/90 dark:border-[#2d2d32] bg-white dark:bg-[#171717] p-4 sm:p-6 shadow-xs flex flex-col space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Team activity</h2>
              <span className="text-xs text-slate-500 dark:text-[#888]">Live feed</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#94a3b8]">Recent updates, actions, and milestones</p>
          </div>

          {isLoading ? (
            <div className="space-y-3 py-3">
              {[0, 1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-[#2d2d32] bg-slate-50/50 dark:bg-[#242426] animate-pulse"
                >
                  <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-[#34343a]" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-40 rounded-sm bg-slate-200 dark:bg-[#34343a]" />
                    <div className="h-2 w-20 rounded-sm bg-slate-200 dark:bg-[#34343a]" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-[#888] space-y-2">
              <FiActivity className="mx-auto text-slate-300 dark:text-slate-600" size={28} />
              <p className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">No recent team activity</p>
              <p className="text-xs">Activity from issue changes, task assignments, and reviews will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {activities.map((act) => {
                const isCompleted =
                  act.type === 'completed' || act.action.toLowerCase().includes('complet');
                const isCreated =
                  act.type === 'created' || act.action.toLowerCase().includes('creat');

                return (
                  <div
                    key={act.id}
                    className="flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-[#24242a] transition text-xs"
                  >
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : isCreated
                            ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                      }`}
                    >
                      {isCompleted ? (
                        <FiCheckCircle size={14} />
                      ) : isCreated ? (
                        <FiPlus size={14} />
                      ) : (
                        <FiActivity size={14} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-slate-800 dark:text-slate-200 leading-snug">
                        <strong className="font-semibold text-slate-900 dark:text-white">
                          {act.actor}
                        </strong>{' '}
                        <span>{act.action}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {act.issueKey && (
                          <span className="inline-flex items-center rounded-md bg-purple-500/10 px-1.5 py-0.2 text-[10px] font-mono font-bold text-purple-600 dark:bg-purple-500/20 dark:text-purple-300">
                            {act.issueKey}
                          </span>
                        )}
                        {act.timestamp && (
                          <span className="text-[10px] text-slate-400 dark:text-[#777]">
                            {formatNotificationTime(act.timestamp)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Invite Modal */}
      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onInviteSent={(count) => {
          showToast(
            'success',
            `Sent ${count} team ${count === 1 ? 'invitation' : 'invitations'} successfully!`
          );
          loadTeamData();
        }}
      />
    </div>
  );
};

export default TeamView;
