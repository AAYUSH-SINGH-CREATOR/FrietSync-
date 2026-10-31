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

import { getMyWorkspace, getFriendlyErrorMessage } from '../services/workspaceApi';
import { getMyProjects, getProjectMembers } from '../../projects/services/projectApi';
import { getProjectProgress } from '../../projects/utils/projectUtils';
import { getProjectIssues } from '../../issues/services/issueApi';
import { getProjectSprints } from '../../sprints/services/sprintsApi';
import IssueDetailsView from '../../issues/components/IssueDetailsView';
import { formatFigmaDate } from '../../issues/utils/issueUtils';
import NoWorkspace from './NoWorkspace';
import LoadingScreen from '../../../components/ui/LoadingScreen';
import { getUserProfile } from '../../auth/services/authApi';
import { getDashboardProjectId, setDashboardProjectId, subscribeToDashboardProjectId } from '../../../utils/dashboardProjectSelection';

const normalize = (v) => String(v || '').toUpperCase().replace(/[\s-]+/g, '_');
const getProjectId = (project) => String(project?.id || project?._id || project?.projectId || '');
const isResolved = (s) => ['RESOLVED', 'CLOSED'].includes(normalize(s));
const isInProgress = (s) => normalize(s) === 'IN_PROGRESS';

const asDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildSprintBurndownPoints = (sprints, projectStart, projectDeadline) => {
  const start = asDate(projectStart);
  const end = asDate(projectDeadline);
  if (!start || !end || end < start || sprints.length === 0) return [];

  const durationDays = Math.max(1, Math.ceil((end - start) / 86400000));
  const useMonths = durationDays > 62;
  const intervalDays = useMonths ? 30 : durationDays > 21 ? 7 : Math.max(1, Math.ceil(durationDays / 7));
  const dates = [new Date(start)];
  for (let offset = intervalDays; offset < durationDays; offset += intervalDays) {
    const date = new Date(start);
    date.setDate(date.getDate() + offset);
    dates.push(date);
  }

  const total = sprints.length;
  
  
  const completionDates = sprints.map((sprint) => {
    if (normalize(sprint.status) !== 'COMPLETED') return null;
    return asDate(sprint.completedAt || sprint.updatedAt || sprint.endDate);
  }).filter(Boolean);
  dates.push(new Date(end));
  dates.push(...completionDates
    .filter((date) => date >= start && date <= end)
    .map((date) => new Date(date)));
  const uniqueDates = [...new Map(dates.map((date) => [date.getTime(), date])).values()]
    .sort((a, b) => a.getTime() - b.getTime());

  return uniqueDates.map((date) => {
    const timestamp = date.getTime();
    const elapsed = Math.min(1, Math.max(0, (timestamp - start.getTime()) / Math.max(1, end.getTime() - start.getTime())));
    const completedByDate = completionDates.filter((completedAt) => completedAt && completedAt.getTime() <= timestamp).length;
    return {
      date: timestamp,
      label: useMonths
        ? date.toLocaleDateString(undefined, { month: 'short' })
        : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      remaining: total - completedByDate,
      ideal: Math.max(0, total - Math.round(total * elapsed)),
    };
  });
};

const DashboardOverview = () => {
  const navigate = useNavigate();
  const outletContext = useOutletContext() || {};
  const { currentUserProfile } = outletContext;

  const [workspace, setWorkspace] = useState(null);
  const [projects, setProjects] = useState([]);
  const [issues, setIssues] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [issueTotalsByProject, setIssueTotalsByProject] = useState({});
  const [selectedProjectId, setSelectedProjectId] = useState(getDashboardProjectId);
  const [selectedProjectMembers, setSelectedProjectMembers] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  
  const [taskFilter, setTaskFilter] = useState('assigned'); 

  
  const [selectedIssueForDetails, setSelectedIssueForDetails] = useState(null);

  const userName =
    currentUserProfile?.name?.trim() ||
    getUserProfile().name ||
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
        projects: [],
        issues: [],
        sprints: [],
        issueTotalsByProject: {},
      };
    }

    const projectsRes = await getMyProjects().then((value) => ({ status: 'fulfilled', value })).catch((reason) => ({ status: 'rejected', reason }));
    const loadedProjects = projectsRes.status === 'fulfilled' && Array.isArray(projectsRes.value) ? projectsRes.value : [];

    let aggregatedIssues = [];
    let aggregatedSprints = [];
    const issueTotals = {};

    
    if (loadedProjects.length > 0) {
      const targetProjects = loadedProjects;
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
            const projectTotal = Number(res.value.totalElements ?? items.length);
            issueTotals[String(pid)] = projectTotal;
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
      projects: loadedProjects,
      issues: aggregatedIssues,
      sprints: aggregatedSprints,
      issueTotalsByProject: issueTotals,
    };
  }, []);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchDashboardDataCore();
      setWorkspace(data.workspace);
      setProjects(data.projects);
      setIssues(data.issues);
      setSprints(data.sprints);
      setIssueTotalsByProject(data.issueTotalsByProject);
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
        setProjects(data.projects);
        setIssues(data.issues);
        setSprints(data.sprints);
        setIssueTotalsByProject(data.issueTotalsByProject);
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

  useEffect(() => {
    if (projects.length === 0) {
      if (selectedProjectId) setSelectedProjectId('');
      setSelectedProjectMembers([]);
      return;
    }
    if (!projects.some((project) => getProjectId(project) === selectedProjectId)) {
      setSelectedProjectId(getProjectId(projects[0]));
    }
  }, [projects, selectedProjectId]);

  useEffect(() => subscribeToDashboardProjectId((projectId) => {
    if (projects.some((project) => getProjectId(project) === projectId)) {
      setSelectedProjectId(projectId);
    }
  }), [projects]);

  useEffect(() => {
    if (!selectedProjectId) {
      setSelectedProjectMembers([]);
      return undefined;
    }

    setDashboardProjectId(selectedProjectId);
    let active = true;
    setSelectedProjectMembers([]);
    getProjectMembers(selectedProjectId)
      .then((projectMembers) => {
        if (active) setSelectedProjectMembers(Array.isArray(projectMembers) ? projectMembers : []);
      })
      .catch(() => {
        if (active) setSelectedProjectMembers([]);
      });
    return () => { active = false; };
  }, [selectedProjectId]);

  const selectedProject = useMemo(
    () => projects.find((project) => getProjectId(project) === selectedProjectId) || null,
    [projects, selectedProjectId]
  );
  const selectedProjectIssues = useMemo(
    () => issues.filter((issue) => String(issue.projectId || issue.project?.id || issue.project?._id) === selectedProjectId),
    [issues, selectedProjectId]
  );
  const selectedProjectIssueTotal = issueTotalsByProject[selectedProjectId] ?? selectedProjectIssues.length;
  const selectedProjectSprints = useMemo(
    () => sprints.filter((sprint) => String(sprint.projectId || sprint.project?.id || sprint.project?._id) === selectedProjectId),
    [sprints, selectedProjectId]
  );

  
  const summaryMetrics = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const totalProjects = projects.length;
    const newProjectsThisMonth = projects.filter((p) => {
      const d = p.createdAt || p.startDate;
      return d && !isNaN(new Date(d).getTime()) && new Date(d) >= startOfMonth;
    }).length;

    
    const totalIssues = selectedProjectIssueTotal;
    const totalSprints = selectedProjectSprints.length;
    const totalMembers = selectedProjectMembers.length;

    return {
      totalProjects,
      newProjectsThisMonth,
      totalIssues,
      totalSprints,
      totalMembers,
    };
  }, [projects, selectedProjectIssues, selectedProjectIssueTotal, selectedProjectSprints, selectedProjectMembers]);

  
  const issueOverviewMetrics = useMemo(() => {
    const total = selectedProjectIssueTotal;
    let completed = 0;
    let inProgress = 0;
    let pending = 0;

    selectedProjectIssues.forEach((i) => {
      if (isResolved(i.status)) completed++;
      else if (isInProgress(i.status)) inProgress++;
      else pending++;
    });

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    
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
  }, [selectedProjectIssues, selectedProjectIssueTotal]);

  
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

    const userTasks = selectedProjectIssues.filter(isAssignedToMe);
    
    const taskPool = userTasks.length > 0 ? userTasks : selectedProjectIssues;

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

    
    return taskPool
      .filter((i) => !isResolved(i.status))
      .slice(0, 8);
  }, [selectedProjectIssues, currentUserProfile, taskFilter]);

  
  const projectProgressList = useMemo(() => {
    const now = new Date();
    return (selectedProject ? [selectedProject] : []).map((p) => {
      const pid = String(p.id || p._id || p.projectId);
      const projectIssuesList = selectedProjectIssues.filter((i) => String(i.projectId) === pid);
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
  }, [selectedProject, selectedProjectIssues]);

  
  const sprintData = useMemo(() => {
    const project = selectedProject;
    const projectSprints = selectedProjectSprints;

    const sprintStartDates = projectSprints.map((sprint) => asDate(sprint.startDate)).filter(Boolean);
    const sprintEndDates = projectSprints.map((sprint) => asDate(sprint.endDate)).filter(Boolean);
    const projectStart = project?.startDate || (sprintStartDates.length
      ? new Date(Math.min(...sprintStartDates.map((date) => date.getTime())))
      : null);
    const projectDeadline = project?.deadline || (sprintEndDates.length
      ? new Date(Math.max(...sprintEndDates.map((date) => date.getTime())))
      : null);
    const totalSprints = projectSprints.length;
    const completedSprints = projectSprints.filter((sprint) => normalize(sprint.status) === 'COMPLETED').length;
    const progressPct = totalSprints > 0 ? Math.round((completedSprints / totalSprints) * 100) : null;
    const burndownPoints = buildSprintBurndownPoints(projectSprints, projectStart, projectDeadline);

    return {
      project,
      progressPct,
      startDate: projectStart,
      endDate: projectDeadline,
      totalSprints,
      completedSprints,
      burndownPoints,
    };
  }, [selectedProjectSprints, selectedProject]);

  
  const recentProjects = useMemo(() => {
    return projects.slice(0, 3);
  }, [projects]);

  
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

    selectedProjectIssues.forEach((i) => {
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

    
    const displayTasks = deadlineTasks.slice(0, 2);

    return {
      donutData,
      displayTasks,
    };
  }, [selectedProjectIssues]);

  if (isLoading && !workspace) {
    return <LoadingScreen fullScreen label="Loading your dashboard" />;
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
      {}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {timeGreeting} {firstName}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#a1a1aa] mt-1 font-medium">
            Here is what is happening with your projects today
          </p>
        </div>
        <label className="flex min-w-[220px] flex-col gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span>Dashboard project</span>
          <select
            value={selectedProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
            disabled={projects.length === 0}
            className="h-10 max-w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-xs outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 disabled:opacity-60 dark:border-[#35353d] dark:bg-[#202026] dark:text-white"
          >
            {projects.length === 0 ? <option value="">No projects available</option> : projects.map((project) => (
              <option key={getProjectId(project)} value={getProjectId(project)}>{project.name || 'Untitled project'}</option>
            ))}
          </select>
        </label>
      </div>

      {}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {}
        <div
          onClick={() => navigate('/dashboard/projects')}
          className="bg-white dark:bg-[#1f1f1f] border border-slate-200/90 dark:border-[#303030] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-sky-500/50 transition cursor-pointer flex items-center gap-4"
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

        {}
        <div
          onClick={() => navigate('/dashboard/issues')}
          className="bg-white dark:bg-[#1f1f1f] border border-slate-200/90 dark:border-[#303030] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-sky-500/50 transition cursor-pointer flex items-center gap-4"
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
              {selectedProject?.name || 'Selected project'}
            </span>
          </div>
        </div>

        {}
        <div
          onClick={() => navigate('/dashboard/sprints')}
          className="bg-white dark:bg-[#1f1f1f] border border-slate-200/90 dark:border-[#303030] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-sky-500/50 transition cursor-pointer flex items-center gap-4"
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
              {selectedProject?.name || 'Selected project'}
            </span>
          </div>
        </div>

        {}
        <div
          onClick={() => navigate('/dashboard/team')}
          className="bg-white dark:bg-[#1f1f1f] border border-slate-200/90 dark:border-[#303030] rounded-2xl p-4 sm:p-5 shadow-xs hover:border-sky-500/50 transition cursor-pointer flex items-center gap-4"
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
            <span className="text-[11px] text-slate-400 dark:text-[#888] mt-1 block truncate">
              {selectedProject?.name || 'Selected project'}
            </span>
          </div>
        </div>
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {}
          <div className="bg-white dark:bg-[#1f1f1f] border border-slate-200/90 dark:border-[#303030] rounded-2xl p-4 sm:p-5 shadow-xs">
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

            {}
            <div className="relative w-full h-40 flex flex-col items-center justify-center [&_svg]:outline-none [&_svg]:focus-visible:outline-none [&_*]:outline-none">
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
                    isAnimationActive={true}
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

            {}
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

          {}
          <div className="bg-white dark:bg-[#1f1f1f] border border-slate-200/90 dark:border-[#303030] rounded-2xl p-4 sm:p-5 shadow-xs">
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

            {}
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

            {}
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

        {}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {}
          <div className="bg-white dark:bg-[#1f1f1f] border border-slate-200/90 dark:border-[#303030] rounded-2xl p-4 sm:p-5 shadow-xs">
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

          {}
          <div className="bg-white dark:bg-[#1f1f1f] border border-slate-200/90 dark:border-[#303030] rounded-2xl p-4 sm:p-5 shadow-xs">
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

            {}
            <div className="flex items-center gap-3 mt-3 mb-3">
              {sprintData.progressPct === null ? (
                <span className="text-xs text-slate-500 dark:text-slate-400">Sprint progress unavailable.</span>
              ) : (
                <>
                  <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-[#27272a] overflow-hidden" role="progressbar" aria-label="Project sprint completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={sprintData.progressPct}>
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

            {}
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Sprint Burndown
            </h3>

            {}
            <div className="flex items-center gap-3">
              <div className="dashboard-burndown-chart h-40 min-w-0 flex-1 [&_svg]:outline-none [&_svg]:focus-visible:outline-none [&_*]:outline-none">
                {sprintData.burndownPoints.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={sprintData.burndownPoints} margin={{ top: 8, right: 8, bottom: 0, left: -6 }}>
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
                        domain={[0, Math.max(1, sprintData.totalSprints)]}
                        ticks={Array.from({ length: sprintData.totalSprints + 1 }, (_, index) => sprintData.totalSprints - index)}
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
                        formatter={(value, name) => [value, name === 'ideal' ? 'Ideal sprints remaining' : 'Sprints remaining']}
                        contentStyle={{ backgroundColor: '#171717', border: '1px solid #3f3f46', borderRadius: 10, color: '#f4f4f5', fontSize: 11 }}
                        labelStyle={{ color: '#d4d4d8' }}
                      />
                      <Line type="monotone" dataKey="ideal" stroke="#71717a" strokeDasharray="5 5" strokeWidth={1.5} dot={false} activeDot={false} isAnimationActive={false} />
                      <Line type="monotone" dataKey="remaining" name="remaining" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 2.5, fill: '#38bdf8', strokeWidth: 0 }} activeDot={{ r: 4 }} isAnimationActive={true} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center px-2 text-center text-xs text-slate-500 dark:text-slate-400">
                    {sprintData.totalSprints === 0
                      ? 'No sprints are available for this project yet.'
                      : 'Add project start and deadline dates to see the burndown.'}
                  </div>
                )}
              </div>

              {}
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

        {}
        <div className="lg:col-span-3 flex flex-col gap-5">
          {}
          <div className="bg-white dark:bg-[#1f1f1f] border border-slate-200/90 dark:border-[#303030] rounded-2xl p-4 sm:p-5 shadow-xs">
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

          {}
          <div className="bg-white dark:bg-[#1f1f1f] border border-slate-200/90 dark:border-[#303030] rounded-2xl p-4 sm:p-5 shadow-xs">
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

            {}
            <div className="flex items-center justify-between gap-2">
              <div className="w-24 h-24 relative flex items-center justify-center shrink-0 [&_svg]:outline-none [&_svg]:focus-visible:outline-none [&_*]:outline-none">
                <ResponsiveContainer width="100%" height={96}>
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
                      isAnimationActive={true}
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

            {}
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
