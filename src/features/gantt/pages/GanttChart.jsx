import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiCalendar, FiLayers, FiAlertCircle, FiCheckCircle, FiClock,
  FiAlertTriangle, FiPlus, FiTrash2, FiSearch, FiFilter, FiArrowLeft, FiShield
} from 'react-icons/fi';
import {
  getGanttData,
  getCriticalPath,
  captureBaseline,
  deleteBaseline,
  updateSprintGanttDates,
  updateIssueGanttDates
} from '../services/ganttApi';
import { getMyProjects, getFriendlyErrorMessage } from '../../projects/services/projectApi';
import { getStatusStyle } from '../utils/ganttUtils';
import { getDashboardProjectId, setDashboardProjectId } from '../../../utils/dashboardProjectSelection';

const parseDay = (value) => {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDayLabel = (value) => parseDay(value)?.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' }) || '—';

const GanttChart = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [ganttData, setGanttData] = useState({ groups: [], issues: [], milestones: [], timelineDays: [], hasBaseline: false });
  const [criticalPathIds, setCriticalPathIds] = useState(new Set());
  const [showCriticalPathOnly, setShowCriticalPathOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingItem, setEditingItem] = useState(null); // { type: 'sprint' | 'issue', id, startDate, endDate }

  const loadData = async (selectedProjectId = projectId) => {
    if (!selectedProjectId) return;

    setIsLoading(true);
    setError('');

    try {
      const ganttRes = await getGanttData(selectedProjectId);
      const data = ganttRes || {};
      const currentProject = projects.find((item) => String(item.id || item._id || item.projectId) === String(selectedProjectId));
      setProject(currentProject || { id: selectedProjectId, name: data.projectName });
      const sprints = Array.isArray(data.sprints) ? data.sprints : [];
      const items = [
        ...(Array.isArray(data.issues) ? data.issues.map((item) => ({ ...item, itemType: 'issue' })) : []),
        ...(Array.isArray(data.milestones) ? data.milestones.map((item) => ({ ...item, itemType: 'milestone' })) : []),
        ...(Array.isArray(data.releases) ? data.releases.map((item) => ({ ...item, itemType: 'release' })) : []),
      ];
      const sprintGroups = sprints.map((sprint) => ({
        ...sprint,
        id: sprint.id,
        issues: items.filter((item) => item.sprintId === sprint.id || item.groupId === sprint.id || sprint.linkedIssueId === item.id || item.linkedIssueId === sprint.id),
      }));
      const assignedItemIds = new Set(sprintGroups.flatMap((group) => group.issues.map((item) => item.id)));
      const ungroupedItems = items.filter((item) => !assignedItemIds.has(item.id));
      const groups = [...sprintGroups];
      if (ungroupedItems.length) groups.push({ id: 'project-items', name: 'Project Items', status: '', issues: ungroupedItems });
      setGanttData({
        groups,
        issues: items,
        milestones: Array.isArray(data.milestones) ? data.milestones : [],
        timelineDays: buildTimelineDays(data.rangeStart, data.rangeEnd, items, sprints),
        rangeStart: data.rangeStart || data.projectStartDate,
        rangeEnd: data.rangeEnd || data.projectDeadline,
        projectStartDate: data.projectStartDate,
        projectDeadline: data.projectDeadline,
        projectedEndDate: data.projectedEndDate,
        hasBaseline: Boolean(data.hasBaseline),
        baselineCapturedAt: data.baselineCapturedAt,
        links: Array.isArray(data.links) ? data.links : [],
      });
      setCriticalPathIds(new Set(Array.isArray(data.criticalPath) ? data.criticalPath : []));
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'project timeline'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    getMyProjects().then((response) => {
      if (!active) return;
      const list = Array.isArray(response) ? response : response?.projects || response?.items || response?.content || response?.data?.projects || response?.data || [];
      setProjects(list);
      const validRouteProject = list.find((item) => String(item.id || item._id || item.projectId) === String(projectId));
      const savedProject = list.find((item) => String(item.id || item._id || item.projectId) === getDashboardProjectId());
      const selected = validRouteProject || savedProject || list[0];
      if (selected) {
        const selectedId = String(selected.id || selected._id || selected.projectId);
        if (selectedId !== String(projectId || '')) navigate(`/dashboard/projects/${selectedId}/gantt`, { replace: true });
        setDashboardProjectId(selectedId);
        setProject(selected);
      } else {
        setIsLoading(false);
      }
    }).catch((err) => {
      setError(getFriendlyErrorMessage(err, 'projects'));
      setIsLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (projectId) {
      setDashboardProjectId(projectId);
      loadData(projectId);
    }
  }, [projectId]);

  const handleProjectChange = (nextProjectId) => {
    if (!nextProjectId) return;
    setDashboardProjectId(nextProjectId);
    navigate(`/dashboard/projects/${nextProjectId}/gantt`);
  };

  const buildTimelineDays = (rangeStart, rangeEnd, items, sprints) => {
    const starts = [rangeStart, ...items.map((item) => item.startDate), ...sprints.map((sprint) => sprint.startDate)].map(parseDay).filter(Boolean);
    const ends = [rangeEnd, ...items.map((item) => item.endDate), ...sprints.map((sprint) => sprint.endDate)].map(parseDay).filter(Boolean);
    const start = parseDay(rangeStart) || starts.sort((a, b) => a - b)[0] || parseDay(new Date().toISOString());
    const end = parseDay(rangeEnd) || ends.sort((a, b) => b - a)[0] || new Date(start.getTime() + 29 * 86400000);
    const count = Math.max(1, Math.min(180, Math.floor((end - start) / 86400000) + 1));
    const days = [];
    const today = new Date();
    for (let i = 0; i < count; i++) {
      const d = new Date(start.getTime() + i * 86400000);
      days.push({
        date: d.toISOString().split('T')[0],
        dayOfWeek: d.toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' }),
        dayOfMonth: d.getUTCDate(),
        isToday: d.toISOString().slice(0, 10) === today.toISOString().slice(0, 10),
        isWeekend: d.getUTCDay() === 0 || d.getUTCDay() === 6
      });
    }
    return days;
  };

  const handleFetchCriticalPath = async () => {
    try {
      setIsActionLoading(true);
      const res = await getCriticalPath(projectId);
      const ids = Array.isArray(res) ? res : (res?.criticalPathIds || res?.issueIds || res?.issues?.map((item) => item.id) || []);
      setCriticalPathIds(new Set(ids));
      setShowCriticalPathOnly(true);
      setSuccessMessage('Critical path calculated successfully.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'calculating critical path'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCaptureBaseline = async () => {
    try {
      setIsActionLoading(true);
      await captureBaseline(projectId);
      setSuccessMessage('Project baseline captured successfully.');
      setTimeout(() => setSuccessMessage(''), 4000);
      await loadData();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'capturing baseline'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDeleteBaseline = async () => {
    if (!window.confirm('Are you sure you want to delete the project baseline?')) return;
    try {
      setIsActionLoading(true);
      await deleteBaseline(projectId);
      setSuccessMessage('Baseline deleted successfully.');
      setTimeout(() => setSuccessMessage(''), 4000);
      await loadData();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'deleting baseline'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSaveDates = async () => {
    if (!editingItem) return;
    try {
      setIsActionLoading(true);
      const { type, id, startDate, endDate } = editingItem;
      if (type === 'sprint') {
        await updateSprintGanttDates(projectId, id, { startDate, endDate });
      } else if (type === 'issue') {
        await updateIssueGanttDates(projectId, id, { startDate, endDate });
      }
      setEditingItem(null);
      setSuccessMessage('Dates updated successfully.');
      setTimeout(() => setSuccessMessage(''), 4000);
      await loadData();
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'updating dates'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return ganttData.groups.map(group => {
      const groupIssues = (group.issues || []).filter(issue => {
        const matchesQuery = !q ||
          issue.name?.toLowerCase().includes(q) ||
          issue.title?.toLowerCase().includes(q) ||
          issue.issueNumber?.toString().includes(q);
        const matchesStatus = statusFilter === 'all' ||
          issue.status?.toLowerCase() === statusFilter.toLowerCase();
        const matchesCP = !showCriticalPathOnly || criticalPathIds.has(issue.id);

        return matchesQuery && matchesStatus && matchesCP;
      });

      const matchesGroupName = !q || group.name?.toLowerCase().includes(q);

      return {
        ...group,
        issues: groupIssues,
        isVisible: matchesGroupName || groupIssues.length > 0
      };
    }).filter(g => g.isVisible);
  }, [ganttData, searchQuery, statusFilter, showCriticalPathOnly, criticalPathIds]);

  const dayWidth = 32;
  const timelineWidth = Math.max(900, ganttData.timelineDays.length * dayWidth);
  const getBarStyle = (item) => {
    const firstDay = parseDay(ganttData.timelineDays[0]?.date);
    const start = parseDay(item.startDate);
    const end = parseDay(item.endDate) || start;
    if (!firstDay || !start || !end) return null;
    const totalDays = ganttData.timelineDays.length;
    const startOffset = Math.floor((start - firstDay) / 86400000);
    const endOffset = Math.floor((end - firstDay) / 86400000);
    const left = Math.max(0, startOffset);
    const right = Math.min(totalDays - 1, endOffset);
    if (right < left || left >= totalDays || right < 0) return null;
    return { left: `${(left / totalDays) * 100}%`, width: `${(Math.max(1, right - left + 1) / totalDays) * 100}%` };
  };

  const formatAssignees = (assignees = []) => assignees.map((assignee) => assignee.name).filter(Boolean).join(', ');
  const renderTimelineLane = (item, colorClass = 'bg-sky-500') => {
    const barStyle = getBarStyle(item);
    const baselineStyle = getBarStyle({ startDate: item.baselineStartDate, endDate: item.baselineEndDate });
    return (
      <div className="relative h-14 shrink-0 border-l border-slate-100 dark:border-[#303038]" style={{ width: timelineWidth }}>
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${ganttData.timelineDays.length}, ${dayWidth}px)` }}>
          {ganttData.timelineDays.map((day) => (
            <div key={day.date} className={`border-r border-slate-100 dark:border-[#303038] ${day.isWeekend ? 'bg-slate-50/80 dark:bg-white/[0.02]' : ''} ${day.isToday ? 'bg-sky-50/80 dark:bg-sky-900/10' : ''}`} />
          ))}
        </div>
        {baselineStyle && <div className="absolute top-2 h-1.5 rounded-full bg-slate-400/60" style={baselineStyle} title="Baseline schedule" />}
        {barStyle ? (
          <div className={`absolute top-5 h-6 min-w-2 rounded-lg shadow-sm ${colorClass}`} style={barStyle} title={`${item.name || item.title || 'Schedule item'}: ${formatDayLabel(item.startDate)} – ${formatDayLabel(item.endDate || item.startDate)}`} />
        ) : (
          <span className="absolute left-3 top-[19px] text-[11px] italic text-slate-400">Unscheduled</span>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="h-full min-h-[500px] flex items-center justify-center bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="text-center p-10">
          <div className="animate-spin h-8 w-8 mx-auto border-2 border-sky-500 border-t-transparent rounded-full" />
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Loading interactive Gantt chart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[800px] bg-slate-50 dark:bg-[#141416] text-slate-900 dark:text-white p-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <button
            onClick={() => navigate(`/dashboard/projects/${projectId}`)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white mb-2 transition"
          >
            <FiArrowLeft size={16} /> Back to Project Details
          </button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FiCalendar className="text-sky-500" /> Gantt Timeline & Schedule — {project?.name || 'Project'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage sprints, milestone schedules, track critical paths, and compare baselines.
          </p>
          <label className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            Project
            <select
              value={projectId || ''}
              onChange={(event) => handleProjectChange(event.target.value)}
              className="min-w-48 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-[#35353d] dark:bg-[#222228] dark:text-white"
              aria-label="Select project for Gantt chart"
            >
              {!projectId && <option value="">Select a project</option>}
              {projects.map((item) => {
                const id = String(item.id || item._id || item.projectId);
                return <option key={id} value={id}>{item.name || 'Untitled project'}</option>;
              })}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleFetchCriticalPath}
            disabled={isActionLoading}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition ${
              showCriticalPathOnly
                ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                : 'bg-white dark:bg-[#222228] border border-slate-200 dark:border-[#35353d] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#2a2a32]'
            }`}
          >
            <FiShield className={showCriticalPathOnly ? 'text-white' : 'text-amber-500'} />
            {showCriticalPathOnly ? 'Showing Critical Path' : 'Critical Path'}
          </button>

          <button
            onClick={handleCaptureBaseline}
            disabled={isActionLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-[#222228] border border-slate-200 dark:border-[#35353d] text-slate-700 dark:text-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-[#2a2a32] transition"
          >
            <FiPlus className="text-sky-500" /> Capture Baseline
          </button>

          <button
            onClick={handleDeleteBaseline}
            disabled={isActionLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-[#222228] border border-slate-200 dark:border-[#35353d] text-rose-600 dark:text-rose-400 rounded-xl text-sm font-medium hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
          >
            <FiTrash2 /> Reset Baseline
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="mb-4 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center justify-between text-rose-700 dark:text-rose-300">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FiAlertCircle size={18} /> {error}
          </div>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700">&times;</button>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl flex items-center justify-between text-emerald-700 dark:text-emerald-300">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FiCheckCircle size={18} /> {successMessage}
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-500 hover:text-emerald-700">&times;</button>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: 'Project window', value: `${formatDayLabel(ganttData.projectStartDate || ganttData.rangeStart)} – ${formatDayLabel(ganttData.projectDeadline || ganttData.rangeEnd)}`, icon: FiCalendar },
          { label: 'Projected finish', value: formatDayLabel(ganttData.projectedEndDate), icon: FiClock },
          { label: 'Schedule items', value: ganttData.groups.length + ganttData.issues.length, icon: FiLayers },
          { label: 'Baseline', value: ganttData.hasBaseline ? 'Captured' : 'Not captured', icon: ganttData.hasBaseline ? FiCheckCircle : FiAlertTriangle },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[#35353d] dark:bg-[#1f1f23]">
            <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {label}<Icon className="text-sky-500" size={16} />
            </div>
            <div className="mt-2 truncate text-lg font-semibold text-slate-800 dark:text-white">{value}</div>
          </div>
        ))}
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white dark:bg-[#1f1f23] border border-slate-200 dark:border-[#35353d] rounded-2xl p-4 mb-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <FiSearch className="absolute left-3.5 top-3 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search tasks, sprints, or issues by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-[#141416] border border-slate-200 dark:border-[#35353d] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <FiFilter size={14} /> Status:
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 dark:bg-[#141416] border border-slate-200 dark:border-[#35353d] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Gantt Main Container */}
      <div className="bg-white dark:bg-[#1f1f23] border border-slate-200 dark:border-[#35353d] rounded-2xl shadow-sm overflow-hidden">
        {filteredGroups.length === 0 ? (
          <div className="p-16 text-center">
            <FiLayers size={40} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">No Gantt items found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Try adjusting your search filters or add sprints and issues to this project.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ minWidth: `${360 + timelineWidth}px` }}>
              <div className="flex border-b border-slate-200 bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-[#35353d] dark:bg-[#25252b] dark:text-slate-400">
                <div className="flex w-[360px] shrink-0 items-center px-5">Schedule item</div>
                <div className="flex h-[58px] shrink-0" style={{ width: timelineWidth }}>
                  {ganttData.timelineDays.map((day, index) => (
                    <div key={day.date} className={`flex w-8 shrink-0 flex-col items-center justify-center border-l border-slate-200/70 dark:border-[#35353d] ${day.isToday ? 'text-sky-600 dark:text-sky-300' : ''}`}>
                      {(index === 0 || day.dayOfMonth === 1 || index % 7 === 0) && <span className="text-[9px] normal-case">{day.dayOfWeek}</span>}
                      <span>{day.dayOfMonth}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-[#2a2a30]">
                {filteredGroups.map(group => (
                  <section key={group.id}>
                    {group.id !== 'project-items' && <div className="flex border-b border-slate-100 bg-slate-50/80 dark:border-[#2a2a30] dark:bg-[#222228]">
                      <div className="flex w-[360px] shrink-0 items-center gap-3 px-5 py-2.5">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-sky-500" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-slate-800 dark:text-white">{group.name || 'Sprint'}</div>
                          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{group.status || 'Sprint'} · {formatDayLabel(group.startDate)} – {formatDayLabel(group.endDate)}</div>
                        </div>
                        <button onClick={() => setEditingItem({ type: 'sprint', id: group.id, startDate: group.startDate || '', endDate: group.endDate || '' })} className="text-[11px] font-medium text-sky-600 hover:underline dark:text-sky-400">Edit</button>
                      </div>
                      {renderTimelineLane(group, 'bg-gradient-to-r from-sky-500 to-indigo-500')}
                    </div>}
                    {group.id === 'project-items' && <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-[#2a2a30] dark:bg-[#222228] dark:text-slate-400">Issues, milestones & releases</div>}
                    <div className="divide-y divide-slate-50 dark:divide-[#222228]">
                      {group.issues.map((issue) => {
                        const isCritical = criticalPathIds.has(issue.id) || issue.critical;
                        const statusInfo = getStatusStyle(issue.status);
                        const itemLabel = issue.itemType === 'milestone' ? 'Milestone' : issue.itemType === 'release' ? 'Release' : `Issue${issue.issueNumber ? ` #${issue.issueNumber}` : ''}`;
                        const color = isCritical ? 'bg-gradient-to-r from-amber-400 to-orange-500' : issue.itemType === 'milestone' ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500' : issue.itemType === 'release' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-blue-500 to-sky-500';
                        return (
                          <div key={`${issue.itemType}-${issue.id}`} className={`flex border-b border-slate-50 transition hover:bg-slate-50/70 dark:border-[#222228] dark:hover:bg-[#25252b]/60 ${isCritical ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''}`}>
                            <div className="flex w-[360px] shrink-0 items-center gap-3 px-5 py-2">
                              <span className={`h-2 w-2 shrink-0 rounded-full ${isCritical ? 'bg-amber-500' : issue.itemType === 'milestone' ? 'bg-violet-500' : issue.itemType === 'release' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{issue.name || issue.title || itemLabel}</div>
                                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                                  <span>{itemLabel}</span><span>·</span><span>{formatDayLabel(issue.startDate)} – {formatDayLabel(issue.endDate || issue.startDate)}</span>
                                  {formatAssignees(issue.assignees) && <><span>·</span><span className="truncate">{formatAssignees(issue.assignees)}</span></>}
                                </div>
                              </div>
                              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusInfo.badge}`}>{issue.status || issue.priority || 'Open'}</span>
                              {issue.itemType === 'issue' && <button onClick={() => setEditingItem({ type: 'issue', id: issue.id, startDate: issue.startDate || '', endDate: issue.endDate || '' })} className="text-[11px] font-medium text-sky-600 hover:underline dark:text-sky-400">Edit</button>}
                            </div>
                            {renderTimelineLane(issue, color)}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Date Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1f1f23] border border-slate-200 dark:border-[#35353d] rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold mb-4">
              Edit {editingItem.type === 'sprint' ? 'Sprint' : 'Task'} Timeline Dates
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={editingItem.startDate ? editingItem.startDate.split('T')[0] : ''}
                  onChange={(e) => setEditingItem({ ...editingItem, startDate: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#141416] border border-slate-200 dark:border-[#35353d] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={editingItem.endDate ? editingItem.endDate.split('T')[0] : ''}
                  onChange={(e) => setEditingItem({ ...editingItem, endDate: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-[#141416] border border-slate-200 dark:border-[#35353d] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-[#2a2a30] text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDates}
                disabled={isActionLoading}
                className="px-4 py-2 bg-sky-600 text-white rounded-xl text-sm font-medium hover:bg-sky-700 shadow-lg shadow-sky-600/20 transition"
              >
                {isActionLoading ? 'Saving...' : 'Save Dates'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GanttChart;
