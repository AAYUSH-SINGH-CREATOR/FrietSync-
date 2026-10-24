import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  FiFolder,
  FiRefreshCw,
  FiUsers,
  FiArrowDown,
  FiChevronRight,
  FiCalendar,
  FiArrowRight,
  FiAlertCircle,
} from 'react-icons/fi';

import { getMyWorkspace, getWorkspaceMembers, getFriendlyErrorMessage } from '../services/workspaceApi';
import { getMyProjects } from '../../projects/services/projectApi';
import { getProjectProgress } from '../../projects/utils/projectUtils';
import { getProjectIssues } from '../../issues/services/issueApi';
import { getProjectSprints } from '../../sprints/services/sprintsApi';
import IssueDetailsView from '../../issues/components/IssueDetailsView';
import { formatFigmaDate } from '../../issues/utils/issueUtils';
import NoWorkspace from './NoWorkspace';

const normalize = (v) => String(v || '').toUpperCase().replace(/[\s-]+/g, '_');
const isResolved = (s) => ['RESOLVED', 'CLOSED'].includes(normalize(s));
const isInProgress = (s) => normalize(s) === 'IN_PROGRESS';

const asDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildBurndownPoints = (sprint, sprintIssues) => {
  const start = asDate(sprint?.startDate);
  const end = asDate(sprint?.endDate);
  if (!start || !end || end < start || sprintIssues.length === 0) return [];

  const durationDays = Math.max(1, Math.ceil((end - start) / 86400000));
  const useMonths = durationDays > 62;
  const intervalDays = useMonths ? 30 : durationDays > 21 ? 7 : Math.max(1, Math.ceil(durationDays / 7));
  const dates = [new Date(start)];
  for (let offset = intervalDays; offset < durationDays; offset += intervalDays) {
    const date = new Date(start);
    date.setDate(date.getDate() + offset);
    dates.push(date);
  }
  if (dates[dates.length - 1].getTime() !== end.getTime()) dates.push(new Date(end));

  const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const total = sprintIssues.length;

  return dates.map((date, index) => {
    const timestamp = date.getTime();
    const remaining = sprintIssues.filter((issue) => {
      const createdAt = asDate(issue.createdAt);
      const createdTime = createdAt?.getTime() ?? startTime;
      const resolvedAt = asDate(issue.resolvedAt || issue.closedAt || issue.completedAt);
      const resolvedTime = resolvedAt?.getTime();
      const isDoneNow = isResolved(issue.status);
      const completionTime = resolvedTime ?? (isDoneNow ? asDate(issue.updatedAt)?.getTime() : null);
      return createdTime <= timestamp && !(completionTime !== null && completionTime <= timestamp);
    }).length;

    const elapsed = Math.min(1, Math.max(0, (timestamp - start.getTime()) / Math.max(1, end.getTime() - start.getTime())));
    const ideal = Math.max(0, Math.round(total * (1 - elapsed)));
    return {
      date: timestamp,
      label: useMonths
        ? date.toLocaleDateString(undefined, { month: 'short' })
        : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      remaining,
      ideal,
    };
  });
};

const DashboardOverview = () => {
  const navigate = useNavigate();
  const outletContext = useOutletContext() || {};
  const { currentUserProfile } = outletContext;

  const [workspace, setWorkspace] = useState(null);
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [issues, setIssues] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [totalReportedIssues, setTotalReportedIssues] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Task filter state
  const [taskFilter, setTaskFilter] = useState('assigned'); // 'assigned' | 'due_soon' | 'overdue'

  // Selected issue for details modal / slide-over
  const [selectedIssueForDetails, setSelectedIssueForDetails] = useState(null);

  const userName =
    currentUserProfile?.name?.trim() ||
    localStorage.getItem('frietSyncName') ||
    '';
  const firstName = userName ? userName.split(' ')[0] : 'there';

  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const fetchDashboardDataCore = useCallback(async () => {
    const ws = await getMyWorkspace();
    const validWs = ws && (ws.name || ws.id || ws._id) ? ws : null;

    if (!validWs) {
      return {
        workspace: null,
        members: [],
        projects: [],
        issues: [],
        sprints: [],
        totalReportedIssues: 0,
      };
    }

    const wsId = validWs.id || validWs._id || validWs.workspaceId;

    // Parallel fetch workspace members and projects
    const [membersRes, projectsRes] = await Promise.allSettled([
      getWorkspaceMembers(wsId),
      getMyProjects(),
    ]);

    const loadedMembers = membersRes.status === 'fulfilled' && Array.isArray(membersRes.value) ? membersRes.value : [];
    const loadedProjects = projectsRes.status === 'fulfilled' && Array.isArray(projectsRes.value) ? projectsRes.value : [];

    let aggregatedIssues = [];
    let aggregatedSprints = [];
    let totalCount = 0;

    // Fetch issues and sprints for loaded projects (top 10 to keep it fast)
    if (loadedProjects.length > 0) {
      const targetProjects = loadedProjects.slice(0, 10);
      const [issuesSettled, sprintsSettled] = await Promise.allSettled([
        Promise.allSettled(
          targetProjects.map((p) => {
            const pid = p.id || p._id || p.projectId;
            return getProjectIssues(pid, { page: 0, size: 50 }).catch(() => ({ items: [], totalElements: 0 }));
          })
        ),
        Promise.allSettled(
          targetProjects.map((p) => {
            const pid = p.id || p._id || p.projectId;
            return getProjectSprints(pid).catch(() => []);
          })
        ),
      ]);

      if (issuesSettled.status === 'fulfilled') {
        issuesSettled.value.forEach((res, idx) => {
          const proj = targetProjects[idx];
          const pid = proj?.id || proj?._id || proj?.projectId;
          const pname = proj?.name || 'Project';
          if (res.status === 'fulfilled' && res.value) {
            const items = res.value.items || (Array.isArray(res.value) ? res.value : []);
            totalCount += Number(res.value.totalElements ?? items.length);
            items.forEach((item) => {
              aggregatedIssues.push({
                ...item,
                projectId: item.projectId || pid,
                projectName: item.projectName || pname,
              });
            });
          }
        });
      }

      if (sprintsSettled.status === 'fulfilled') {
        sprintsSettled.value.forEach((res, idx) => {
          const proj = targetProjects[idx];
          const pid = proj?.id || proj?._id || proj?.projectId;
          if (res.status === 'fulfilled' && res.value) {
            const list = Array.isArray(res.value) ? res.value : Array.isArray(res.value?.data) ? res.value.data : [];
            list.forEach((s) => {
              aggregatedSprints.push({
                ...s,
                projectId: s.projectId || pid,
                projectName: s.projectName || proj?.name,
              });
            });
          }
        });
      }
    }

    return {
      workspace: validWs,
      members: loadedMembers,
      projects: loadedProjects,
      issues: aggregatedIssues,
      sprints: aggregatedSprints,
      totalReportedIssues: totalCount > 0 ? totalCount : aggregatedIssues.length,
    };
  }, []);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchDashboardDataCore();
      setWorkspace(data.workspace);
      setMembers(data.members);
      setProjects(data.projects);
      setIssues(data.issues);
      setSprints(data.sprints);
      setTotalReportedIssues(data.totalReportedIssues);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'workspace'));
    } finally {
      setIsLoading(false);
    }
  }, [fetchDashboardDataCore]);

  useEffect(() => {
    let isMounted = true;
    fetchDashboardDataCore()
      .then((data) => {
        if (!isMounted) return;
        setWorkspace(data.workspace);
        setMembers(data.members);
        setProjects(data.projects);
        setIssues(data.issues);
        setSprints(data.sprints);
        setTotalReportedIssues(data.totalReportedIssues);
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
  }, [fetchDashboardDataCore]);

  // Derived metrics for Summary Cards
  const summaryMetrics = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    // Total Projects
    const totalProjects = projects.length;
    const newProjectsThisMonth = projects.filter((p) => {
      const d = p.createdAt || p.startDate;
      return d && !isNaN(new Date(d).getTime()) && new Date(d) >= startOfMonth;
    }).length;

    // Total Issues
    const totalIssues = totalReportedIssues > 0 ? totalReportedIssues : issues.length;
    const newIssuesThisWeek = issues.filter((i) => {
      const d = i.createdAt;
      return d && !isNaN(new Date(d).getTime()) && new Date(d) >= startOfWeek;
    }).length;

    // Total Sprints
    const totalSprints = sprints.length;
    const activeSprintsCount = sprints.filter((s) => {
      const norm = normalize(s.status);
      return norm === 'ACTIVE';
    }).length;

    // Team Members
    const totalMembers = members.length;
    const newMembersThisMonth = members.filter((m) => {
      const d = m.joinedAt || m.createdAt;
      return d && !isNaN(new Date(d).getTime()) && new Date(d) >= startOfMonth;
    }).length;

    return {
      totalProjects,
      newProjectsThisMonth,
      totalIssues,
      newIssuesThisWeek,
      totalSprints,
      activeSprintsCount,
      totalMembers,
      newMembersThisMonth,
    };
  }, [projects, issues, sprints, members, totalReportedIssues]);

  // Issue Overview gauge metrics
  const issueOverviewMetrics = useMemo(() => {
    const total = issues.length;
    let completed = 0;
    let inProgress = 0;
    let pending = 0;

    issues.forEach((i) => {
      if (isResolved(i.status)) completed++;
      else if (isInProgress(i.status)) inProgress++;
      else pending++;
    });

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Chart data for semi-circle
    const chartData = [
      { name: 'Completed', value: completed || (total === 0 ? 0 : 0.001), color: '#38bdf8' },
      { name: 'In Progress', value: inProgress || (total === 0 ? 0 : 0.001), color: '#0284c7' },
      { name: 'Pending', value: pending || (total === 0 ? 1 : 0.001), color: '#52525b' },
    ];

    return {
      completed,
      inProgress,
      pending,
      completionRate,
      chartData,
      statusLabel: inProgress > 0 ? 'Active Issues' : total > 0 ? 'Issues Done' : 'No Issues',
    };
  }, [issues]);

  // Current user's tasks
  const myFilteredTasks = useMemo(() => {
    const now = new Date();
    const currentUserId = String(
      currentUserProfile?.id ||
      currentUserProfile?._id ||
      currentUserProfile?.userId ||
      currentUserProfile?.user?.id ||
      ''
    );
    const currentUserEmail = String(
      currentUserProfile?.email ||
      currentUserProfile?.user?.email ||
      ''
    ).toLowerCase();

    // Check if issue is assigned to current user
    const isAssignedToMe = (i) => {
      const userIds = [
        ...(Array.isArray(i.assigneeIds) ? i.assigneeIds : []),
        ...(Array.isArray(i.assignedUserIds) ? i.assignedUserIds : []),
        ...(Array.isArray(i.assignees) ? i.assignees.map((a) => a?.id || a?._id || a?.userId) : []),
        ...(Array.isArray(i.assignedTo) ? i.assignedTo.map((a) => a?.id || a?._id || a?.userId) : []),
        i.assigneeId,
      ]
        .filter(Boolean)
        .map(String);

      if (currentUserId && userIds.includes(currentUserId)) return true;

      if (currentUserEmail) {
        const emails = [
          i.assigneeEmail,
          i.assignee?.email,
          i.assignedTo?.email,
          ...(Array.isArray(i.assignees) ? i.assignees.map((a) => a?.email) : []),
          ...(Array.isArray(i.assignedTo) ? i.assignedTo.map((a) => a?.email) : []),
        ]
          .filter(Boolean)
          .map((e) => String(e).toLowerCase());
        if (emails.includes(currentUserEmail)) return true;
      }
      return false;
    };

    const userTasks = issues.filter(isAssignedToMe);
    // If user has specifically assigned tasks, use them; otherwise use workspace issues
    const taskPool = userTasks.length > 0 ? userTasks : issues;

    if (taskFilter === 'overdue') {
      return taskPool
        .filter((i) => {
          if (isResolved(i.status) || !i.dueDate) return false;
          const d = new Date(i.dueDate);
          return !isNaN(d.getTime()) && d < now;
        })
        .slice(0, 8);
    }

    if (taskFilter === 'due_soon') {
      return taskPool
        .filter((i) => {
          if (isResolved(i.status) || !i.dueDate) return false;
          const d = new Date(i.dueDate);
          if (isNaN(d.getTime())) return false;
          const diffDays = (d - now) / (1000 * 60 * 60 * 24);
          return diffDays >= 0 && diffDays <= 7;
        })
        .slice(0, 8);
    }

    // Default: 'assigned'
    return taskPool
      .filter((i) => !isResolved(i.status))
      .slice(0, 8);
  }, [issues, currentUserProfile, taskFilter]);

  // Project Progress list
  const projectProgressList = useMemo(() => {
    const now = new Date();
    return projects.slice(0, 4).map((p) => {
      const pid = String(p.id || p._id || p.projectId);
      const projectIssuesList = issues.filter((i) => String(i.projectId) === pid);
      const progressPct = getProjectProgress(p);

      const isOverdue = p.deadline && !isNaN(new Date(p.deadline).getTime()) && new Date(p.deadline) < now;
      const overdueIssues = projectIssuesList.filter((i) => {
        return !isResolved(i.status) && i.dueDate && new Date(i.dueDate) < now;
      }).length;

      const isAtRisk = (isOverdue && progressPct !== null && progressPct < 100) || overdueIssues > 0;

      return {
        id: pid,
        name: p.name,
        progressPct,
        isAtRisk,
      };
    });
  }, [projects, issues]);

  // Sprint Progress & Burndown Data
  const sprintData = useMemo(() => {
    const activeSprint = sprints.find((s) => normalize(s.status) === 'ACTIVE') ||
      sprints.find((s) => normalize(s.status) === 'PLANNED') ||
      [...sprints].sort((a, b) => String(b.endDate || '').localeCompare(String(a.endDate || '')))[0] || null;
    const activeSprintId = activeSprint?.id || activeSprint?._id || activeSprint?.sprintId;
    const sprintIssueIds = new Set([
      ...(Array.isArray(activeSprint?.issueIds) ? activeSprint.issueIds : []),
      ...(Array.isArray(activeSprint?.issues) ? activeSprint.issues.map((issue) => issue?.id || issue?._id || issue) : []),
    ].map((id) => String(id?.id || id?._id || id)));

    const sprintIssuesList = activeSprint
      ? issues.filter((issue) => {
          const issueSprintId = issue.sprintId || issue.sprint?.id || issue.sprint?._id;
          const belongsToSprint = String(issueSprintId || '') === String(activeSprintId || '') ||
            sprintIssueIds.has(String(issue.id || issue._id || issue.issueId));
          const belongsToProject = !issue.projectId || String(issue.projectId) === String(activeSprint.projectId);
          const dueDate = asDate(issue.dueDate);
          const sprintStart = asDate(activeSprint.startDate);
          const sprintEnd = asDate(activeSprint.endDate);
          // Current backend timeline grouping associates issues with a sprint by due date.
          const matchesSprintWindow = dueDate && sprintStart && sprintEnd &&
            dueDate >= new Date(sprintStart.getFullYear(), sprintStart.getMonth(), sprintStart.getDate()) &&
            dueDate <= new Date(sprintEnd.getFullYear(), sprintEnd.getMonth(), sprintEnd.getDate(), 23, 59, 59, 999);
          return (belongsToSprint || matchesSprintWindow) && belongsToProject;
        })
      : [];

    const totalIssues = sprintIssuesList.length;
    const completedIssues = sprintIssuesList.filter((i) => isResolved(i.status)).length;
    const progressPct = totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : null;
    const burndownPoints = buildBurndownPoints(activeSprint, sprintIssuesList);

    return {
      activeSprint,
      progressPct,
      startDate: activeSprint?.startDate || null,
      endDate: activeSprint?.endDate || null,
      totalIssues,
      completedIssues,
      burndownPoints,
    };
  }, [sprints, issues]);

  // Recent Projects
  const recentProjects = useMemo(() => {
    return projects.slice(0, 3);
  }, [projects]);

  // Deadlines Donut & Cards
  const deadlinesData = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfWeek = new Date(startOfToday);
    endOfWeek.setDate(startOfToday.getDate() + 7);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    let overdueCount = 0;
    let thisWeekCount = 0;
    let thisMonthCount = 0;
    let laterCount = 0;

    const deadlineTasks = [];

    issues.forEach((i) => {
      if (isResolved(i.status)) return;
      if (!i.dueDate) {
        laterCount++;
        return;
      }
      const d = new Date(i.dueDate);
      if (isNaN(d.getTime())) {
        laterCount++;
        return;
      }

      if (d < startOfToday) {
        overdueCount++;
        deadlineTasks.push({
          ...i,
          isOverdue: true,
          statusLabel: 'Overdue',
          dueRelativeLabel: 'Today',
        });
      } else if (d <= endOfWeek) {
        thisWeekCount++;
        deadlineTasks.push({
          ...i,
          isOverdue: false,
          statusLabel: 'This week',
          dueRelativeLabel: 'This week',
        });
      } else if (d <= endOfMonth) {
        thisMonthCount++;
        deadlineTasks.push({
          ...i,
          isOverdue: false,
          statusLabel: 'This month',
          dueRelativeLabel: formatFigmaDate(i.dueDate),
        });
      } else {
        laterCount++;
        deadlineTasks.push({
          ...i,
          isOverdue: false,
          statusLabel: 'Later',
          dueRelativeLabel: formatFigmaDate(i.dueDate),
        });
      }
    });

    const totalDeadlines = overdueCount + thisMonthCount + thisWeekCount + laterCount;

    const donutData = [
      { name: 'Overdue', value: overdueCount || (totalDeadlines === 0 ? 1 : 0.001), color: '#f87171' },
      { name: 'This month', value: thisMonthCount || (totalDeadlines === 0 ? 1 : 0.001), color: '#38bdf8' },
      { name: 'This week', value: thisWeekCount || (totalDeadlines === 0 ? 1 : 0.001), color: '#4ade80' },
      { name: 'Later', value: laterCount || (totalDeadlines === 0 ? 1 : 0.001), color: '#fde047' },
    ];

    // Pick top 2 deadline tasks matching screenshot layout
    const displayTasks = deadlineTasks.slice(0, 2);

    return {
      donutData,
      displayTasks,
    };
  }, [issues]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[420px]">
        <div className="w-9 h-9 rounded-full border-2 border-sky-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-rose-500 dark:text-rose-400">{error}</p>
        <button
          type="button"
          onClick={loadDashboardData}
          className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!workspace || !(workspace.name || workspace.id || workspace._id)) {
    return <NoWorkspace userName={userName} />;
  }

  // If user clicked an issue, show IssueDetailsView
  if (selectedIssueForDetails) {
    const pid = selectedIssueForDetails.projectId || selectedIssueForDetails.project?.id;
    const projectObj = projects.find((p) => String(p.id || p._id) === String(pid));
    return (
      <section className="min-h-[calc(100vh-7.5rem)] rounded-2xl bg-[#f4f5f7] p-4 text-slate-900 dark:bg-[#141416] dark:text-white sm:p-6 lg:p-7">
        <IssueDetailsView
          issueId={selectedIssueForDetails.id || selectedIssueForDetails._id || selectedIssueForDetails.issueId}
          initialIssue={selectedIssueForDetails}
          projectName={selectedIssueForDetails.projectName || projectObj?.name || 'Project'}
          onBack={() => setSelectedIssueForDetails(null)}
          onIssueUpdated={loadDashboardData}
          onIssueDeleted={() => {
            setSelectedIssueForDetails(null);
            loadDashboardData();
          }}
          currentUserProfile={currentUserProfile}
        />
      </section>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-10 px-3 sm:px-6 lg:px-8 text-slate-900 dark:text-white">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {timeGreeting} {firstName}!
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-[#a1a1aa] mt-1 font-medium">
          Here is what is happening with your projects today
        </p>
      </div>

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Projects */}
        <div
          onClick={() => navigate('/dashboard/projects')}
          className="bg-white dark:bg-[#171717] border border-slate-200/90 dark:border-[#2b2b36] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-sky-500/50 transition cursor-pointer flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-[#2A2346] dark:text-[#A78BFA] flex items-center justify-center shrink-0 shadow-2xs">
            <FiFolder size={22} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500 dark:text-[#94a3b8] block">
              Total Projects
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                {summaryMetrics.totalProjects}
              </span>
            </div>
            {summaryMetrics.newProjectsThisMonth > 0 && (
              <span className="text-[11px] text-slate-400 dark:text-[#888] mt-1 block truncate">
                +{summaryMetrics.newProjectsThisMonth} this month
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Total issues */}
        <div
          onClick={() => navigate('/dashboard/issues')}
          className="bg-white dark:bg-[#171717] border border-slate-200/90 dark:border-[#2b2b36] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-sky-500/50 transition cursor-pointer flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 dark:bg-[#432328] dark:text-[#F87171] flex items-center justify-center shrink-0 shadow-2xs">
            <FiAlertCircle size={22} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500 dark:text-[#94a3b8] block">
              Total issues
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                {summaryMetrics.totalIssues}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 dark:text-[#888] mt-1 block truncate">
              From last week
            </span>
          </div>
        </div>

        {/* Card 3: Total Sprints */}
        <div
          onClick={() => navigate('/dashboard/sprints')}
          className="bg-white dark:bg-[#171717] border border-slate-200/90 dark:border-[#2b2b36] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-sky-500/50 transition cursor-pointer flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 dark:bg-[#2A2346] dark:text-[#A78BFA] flex items-center justify-center shrink-0 shadow-2xs">
            <FiRefreshCw size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500 dark:text-[#94a3b8] block">
              Total Sprints
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                {summaryMetrics.totalSprints}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 dark:text-[#888] mt-1 block truncate">
              From last week
            </span>
          </div>
        </div>

        {/* Card 4: Team members */}
        <div
          onClick={() => navigate('/dashboard/team')}
          className="bg-white dark:bg-[#171717] border border-slate-200/90 dark:border-[#2b2b36] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-sky-500/50 transition cursor-pointer flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-[#1C3A2A] dark:text-[#4ADE80] flex items-center justify-center shrink-0 shadow-2xs">
            <FiUsers size={22} />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-medium text-slate-500 dark:text-[#94a3b8] block">
              Team members
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
                {summaryMetrics.totalMembers}
              </span>
            </div>
            {summaryMetrics.newMembersThisMonth > 0 && (
              <span className="text-[11px] text-slate-400 dark:text-[#888] mt-1 block truncate">
                +{summaryMetrics.newMembersThisMonth} this month
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body 3-Column Layout matching screenshot */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ========================================================
            COLUMN 1 (lg:col-span-4): Issue overview + My tasks
           ======================================================== */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Card 1A: Issue overview */}
          <div className="bg-white dark:bg-[#171717] border border-slate-200/90 dark:border-[#2b2b36] rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Issue overview
              </h2>
              <button
                type="button"
                onClick={() => navigate('/dashboard/issues')}
                className="text-xs font-medium text-slate-500 dark:text-[#a1a1aa] hover:text-sky-500 dark:hover:text-white transition flex items-center gap-1 cursor-pointer"
              >
                <span>View all</span>
                <FiArrowRight size={12} />
              </button>
            </div>

            {/* Gauge semi-circle chart */}
            <div className="relative w-full h-40 flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie
                    data={issueOverviewMetrics.chartData}
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
                    {issueOverviewMetrics.chartData.map((entry, index) => (
                      <Cell key={`gauge-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-[48%] left-1/2 -translate-x-1/2 text-center pointer-events-none">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-none">
                  {issueOverviewMetrics.completionRate}%
                </span>
                <span className="block text-[11px] font-medium text-slate-500 dark:text-[#a1a1aa] mt-0.5">
                  {issueOverviewMetrics.statusLabel}
                </span>
              </div>
            </div>

            {/* Legend below gauge */}
            <div className="flex items-center justify-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-300 mt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
                Completed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" />
                In Progress
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#52525b]" />
                Pending
              </span>
            </div>
          </div>

          {/* Card 1B: My tasks */}
          <div className="bg-white dark:bg-[#171717] border border-slate-200/90 dark:border-[#2b2b36] rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                My tasks
              </h2>
              <button
                type="button"
                onClick={() => navigate('/dashboard/issues')}
                className="text-xs font-medium text-slate-500 dark:text-[#a1a1aa] hover:text-sky-500 dark:hover:text-white transition flex items-center gap-1 cursor-pointer"
              >
                <span>View all</span>
                <FiArrowRight size={12} />
              </button>
            </div>

            {/* Filter pills matching screenshot */}
            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => setTaskFilter('assigned')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                  taskFilter === 'assigned'
                    ? 'bg-[#4338ca] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-[#27272a] text-slate-600 dark:text-[#a1a1aa] hover:text-white'
                }`}
              >
                Assigned
              </button>
              <button
                type="button"
                onClick={() => setTaskFilter('due_soon')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                  taskFilter === 'due_soon'
                    ? 'bg-[#4338ca] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-[#27272a] text-slate-600 dark:text-[#a1a1aa] hover:text-white'
                }`}
              >
                Due soon
              </button>
              <button
                type="button"
                onClick={() => setTaskFilter('overdue')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                  taskFilter === 'overdue'
                    ? 'bg-[#4338ca] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-[#27272a] text-slate-600 dark:text-[#a1a1aa] hover:text-white'
                }`}
              >
                Overdue
              </button>
            </div>

            {/* Task rows */}
            <div className="space-y-1">
              {myFilteredTasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 dark:text-[#888]">
                  No tasks found in this view.
                </div>
              ) : (
                myFilteredTasks.map((task) => {
                  const now = new Date();
                  const isTaskOverdue =
                    task.dueDate &&
                    !isNaN(new Date(task.dueDate).getTime()) &&
                    new Date(task.dueDate) < now &&
                    !isResolved(task.status);

                  return (
                    <div
                      key={task.id || task._id}
                      onClick={() => setSelectedIssueForDetails(task)}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#27272a]/70 transition cursor-pointer group"
                    >
                      <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate pr-3 group-hover:text-sky-500 dark:group-hover:text-white">
                        {task.title}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-xs font-medium ${
                            isTaskOverdue
                              ? 'text-[#f87171] font-semibold'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {formatFigmaDate(task.dueDate)}
                        </span>
                        <FiChevronRight
                          size={14}
                          className="text-slate-400 dark:text-slate-500 group-hover:translate-x-0.5 transition"
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ========================================================
            COLUMN 2 (lg:col-span-5): Project Progress + Sprint Progress
           ======================================================== */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Card 2A: Project Progress */}
          <div className="bg-white dark:bg-[#171717] border border-slate-200/90 dark:border-[#2b2b36] rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Project Progress
              </h2>
              <button
                type="button"
                onClick={() => navigate('/dashboard/projects')}
                className="text-xs font-medium text-slate-500 dark:text-[#a1a1aa] hover:text-sky-500 dark:hover:text-white transition flex items-center gap-1 cursor-pointer"
              >
                <span>View all</span>
                <FiArrowRight size={12} />
              </button>
            </div>

            <div className="space-y-3 mt-4">
              {projectProgressList.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 dark:text-[#888]">
                  No projects available.
                </div>
              ) : (
                projectProgressList.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/dashboard/projects/${p.id}`)}
                    className="flex items-center gap-3 cursor-pointer group py-1"
                  >
                    <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 truncate w-32 shrink-0 group-hover:text-sky-500 dark:group-hover:text-sky-400 transition">
                      {p.name}
                    </span>
                  {p.progressPct === null ? (
                    <span className="flex-1 text-xs text-slate-500 dark:text-slate-400">Progress unavailable</span>
                  ) : (
                    <>
                      <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-[#27272a] overflow-hidden" role="progressbar" aria-label={`${p.name || 'Project'} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={p.progressPct}>
                        <div
                          className="h-full rounded-full bg-[#38bdf8] transition-all duration-500"
                          style={{ width: `${p.progressPct}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300 w-9 text-right shrink-0">
                        {p.progressPct}%
                      </span>
                    </>
                  )}
                    <span
                      className={`text-xs font-semibold w-16 text-right shrink-0 ${
                        p.isAtRisk ? 'text-[#f87171]' : 'text-[#4ade80]'
                      }`}
                    >
                    {p.isAtRisk ? 'At Risk' : p.progressPct === null ? '—' : 'On Track'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card 2B: Sprint Progress with Burndown Chart */}
          <div className="bg-white dark:bg-[#171717] border border-slate-200/90 dark:border-[#2b2b36] rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Sprint Progress
              </h2>
              <button
                type="button"
                onClick={() => navigate('/dashboard/sprints')}
                className="text-xs font-medium text-slate-500 dark:text-[#a1a1aa] hover:text-sky-500 dark:hover:text-white transition flex items-center gap-1 cursor-pointer"
              >
                <span>View all</span>
                <FiArrowRight size={12} />
              </button>
            </div>

            {/* Top overall sprint progress bar */}
            <div className="flex items-center gap-3 mt-3 mb-3">
              {sprintData.progressPct === null ? (
                <span className="text-xs text-slate-500 dark:text-slate-400">Sprint progress unavailable.</span>
              ) : (
                <>
                  <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-[#27272a] overflow-hidden" role="progressbar" aria-label="Sprint issue completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={sprintData.progressPct}>
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#0284c7] to-[#38bdf8] transition-all duration-500"
                      style={{ width: `${sprintData.progressPct}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 min-w-[34px] text-right">
                    {sprintData.progressPct}%
                  </span>
                </>
              )}
            </div>

            {/* Burndown Chart label */}
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Burndown Chart
            </h3>

            {/* Burndown data and sprint dates */}
            <div className="flex items-center gap-3">
              <div className="dashboard-burndown-chart h-40 min-w-0 flex-1">
                {sprintData.burndownPoints.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sprintData.burndownPoints} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                      <CartesianGrid strokeDasharray="4 5" stroke="#71717a" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: '#71717a', fontSize: 10 }}
                        axisLine={{ stroke: '#a1a1aa' }}
                        tickLine={false}
                        minTickGap={8}
                      />
                      <YAxis
                        allowDecimals={false}
                        domain={[0, Math.max(1, sprintData.totalIssues)]}
                        tick={{ fill: '#71717a', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={32}
                      />
                      <Tooltip
                        labelFormatter={(_, payload) => {
                          const timestamp = payload?.[0]?.payload?.date;
                          return timestamp ? new Date(timestamp).toLocaleDateString() : '';
                        }}
                        formatter={(value, name) => [value, name === 'ideal' ? 'Ideal remaining' : 'Issues remaining']}
                        contentStyle={{ backgroundColor: '#171717', border: '1px solid #3f3f46', borderRadius: 10, color: '#f4f4f5', fontSize: 11 }}
                        labelStyle={{ color: '#d4d4d8' }}
                      />
                      <Line type="monotone" dataKey="ideal" stroke="#71717a" strokeDasharray="5 5" strokeWidth={1.5} dot={false} activeDot={false} />
                      <Line type="monotone" dataKey="remaining" name="remaining" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 2.5, fill: '#38bdf8', strokeWidth: 0 }} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center px-2 text-center text-xs text-slate-500 dark:text-slate-400">
                    {!sprintData.activeSprint
                      ? 'No sprint is available yet.'
                      : sprintData.totalIssues === 0
                        ? 'No issues are linked to this sprint yet.'
                        : 'Add valid start and end dates to see the burndown.'}
                  </div>
                )}
              </div>

              {/* Start & End Date boxes with down arrow */}
              <div className="flex flex-col items-center justify-center gap-1.5 shrink-0 px-1">
                <div className="w-full">
                  <span className="text-[11px] text-slate-500 dark:text-[#a1a1aa] font-medium block mb-1">
                    Start date
                  </span>
                  <div className="bg-slate-100 dark:bg-[#27272a] border border-slate-200 dark:border-[#3f3f46]/50 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200 font-medium">
                    <FiCalendar className="text-slate-400 shrink-0" size={13} />
                    <span>{sprintData.startDate ? formatFigmaDate(sprintData.startDate) : '—'}</span>
                  </div>
                </div>

                <FiArrowDown className="text-slate-400 my-0.5" size={16} />

                <div className="w-full">
                  <span className="text-[11px] text-slate-500 dark:text-[#a1a1aa] font-medium block mb-1">
                    End date
                  </span>
                  <div className="bg-slate-100 dark:bg-[#27272a] border border-slate-200 dark:border-[#3f3f46]/50 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200 font-medium">
                    <FiCalendar className="text-slate-400 shrink-0" size={13} />
                    <span>{sprintData.endDate ? formatFigmaDate(sprintData.endDate) : '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            COLUMN 3 (lg:col-span-3): Recent + Deadlines
           ======================================================== */}
        <div className="lg:col-span-3 flex flex-col gap-5">
          {/* Card 3A: Recent */}
          <div className="bg-white dark:bg-[#171717] border border-slate-200/90 dark:border-[#2b2b36] rounded-2xl p-4 sm:p-5 shadow-xs">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-3">
              Recent
            </h2>

            <div className="space-y-2">
              {recentProjects.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400 dark:text-[#888]">
                  No recent projects.
                </div>
              ) : (
                recentProjects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/dashboard/projects/${p.id}`)}
                    className="bg-slate-100 dark:bg-[#27272a] hover:bg-slate-200 dark:hover:bg-[#323238] border border-slate-200/80 dark:border-[#3f3f46]/30 rounded-xl px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition group"
                  >
                    <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 truncate pr-2 group-hover:text-sky-500 dark:group-hover:text-white">
                      {p.name}
                    </span>
                    <FiFolder className="text-slate-400 shrink-0" size={16} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card 3B: Deadlines */}
          <div className="bg-white dark:bg-[#171717] border border-slate-200/90 dark:border-[#2b2b36] rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Deadlines
              </h2>
              <button
                type="button"
                onClick={() => navigate('/dashboard/calendar')}
                className="text-xs font-medium text-slate-500 dark:text-[#a1a1aa] hover:text-sky-500 dark:hover:text-white transition flex items-center gap-1 cursor-pointer"
              >
                <span>View all</span>
                <FiArrowRight size={12} />
              </button>
            </div>

            {/* Donut chart + Legend */}
            <div className="flex items-center justify-between gap-2">
              <div className="w-24 h-24 relative flex items-center justify-center shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deadlinesData.donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={28}
                      outerRadius={44}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {deadlinesData.donutData.map((entry, index) => (
                        <Cell key={`donut-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-col gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#f87171] shrink-0" />
                  <span>Overdue</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#38bdf8] shrink-0" />
                  <span>This month</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#4ade80] shrink-0" />
                  <span>This week</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#fde047] shrink-0" />
                  <span>Later</span>
                </div>
              </div>
            </div>

            {/* Deadline task cards */}
            <div className="space-y-2 mt-4">
              {deadlinesData.displayTasks.length === 0 ? (
                <div className="py-2 text-center text-xs text-slate-400 dark:text-[#888]">
                  All deadlines up to date.
                </div>
              ) : (
                deadlinesData.displayTasks.map((task) => (
                  <div
                    key={task.id || task._id}
                    onClick={() => setSelectedIssueForDetails(task)}
                    className="bg-slate-100 dark:bg-[#27272a] hover:bg-slate-200 dark:hover:bg-[#323238] border border-slate-200/80 dark:border-[#3f3f46]/40 rounded-xl p-2.5 flex items-center justify-between gap-2 transition cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-white dark:bg-[#1e1e24] border border-slate-200 dark:border-[#3f3f46]/40 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                        <FiFolder size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-sky-500 dark:group-hover:text-white">
                          {task.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-[#a1a1aa]">
                          {task.dueRelativeLabel}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium shrink-0 ${
                        task.isOverdue
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60'
                          : 'bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-zinc-700/60'
                      }`}
                    >
                      {task.statusLabel}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
