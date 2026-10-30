import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  FiX,
  FiCalendar,
  FiRefreshCw,
  FiChevronRight,
  FiChevronDown,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiLayers,
  FiSearch,
  FiMaximize2,
  FiMinimize2,
  FiFilter,
  FiFlag,
  FiLink2,
  FiInfo,
  FiArrowRight,
  FiTarget,
} from 'react-icons/fi';
import { getProjectTimeline, getFriendlyErrorMessage } from '../services/projectApi';
import { formatDate } from '../utils/projectUtils';
import { getPriorityBadge, getStatusBadge } from '../../issues/utils/issueUtils';

const DAY_MS = 24 * 60 * 60 * 1000;

const TIME_SCALES = {
  days: { id: 'days', label: 'Days', dayWidth: 42, tickStep: 1 },
  weeks: { id: 'weeks', label: 'Weeks', dayWidth: 20, tickStep: 7 },
  months: { id: 'months', label: 'Months', dayWidth: 8, tickStep: 30 },
};

const parseDateOrNull = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
};

const normalizeDateOnly = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDayLabel = (date) => {
  return date.toLocaleDateString(undefined, { day: 'numeric' });
};

const formatMonthLabel = (date) => {
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
};

const getStatusStyle = (status) => {
  const norm = String(status || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (['RESOLVED', 'CLOSED', 'DONE', 'COMPLETED'].includes(norm)) {
    return {
      bar: 'from-emerald-500 to-teal-600 text-white shadow-emerald-500/20',
      badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40',
      icon: FiCheckCircle,
      label: 'Resolved',
    };
  }
  if (['IN_PROGRESS', 'ACTIVE'].includes(norm)) {
    return {
      bar: 'from-sky-500 to-blue-600 text-white shadow-sky-500/20',
      badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-800/40',
      icon: FiClock,
      label: 'In Progress',
    };
  }
  if (['REOPENED'].includes(norm)) {
    return {
      bar: 'from-amber-500 to-orange-600 text-white shadow-amber-500/20',
      badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/40',
      icon: FiAlertTriangle,
      label: 'Reopened',
    };
  }
  return {
    bar: 'from-indigo-500 to-purple-600 text-white shadow-purple-500/20',
    badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800/40',
    icon: FiLayers,
    label: 'Open',
  };
};

const ProjectTimelineModal = ({
  isOpen,
  onClose,
  projectId,
  project,
  onOpenIssue,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [timelineData, setTimelineData] = useState({ groups: [], dependencies: [], releases: [] });
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [timeScale, setTimeScale] = useState('weeks');
  const [showDependencies, setShowDependencies] = useState(true);
  const [showReleases, setShowReleases] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set());
  const [hoveredIssueId, setHoveredIssueId] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tooltipState, setTooltipState] = useState(null);

  const scrollContainerRef = useRef(null);
  const sidebarContainerRef = useRef(null);

  // Fetch timeline data from backend
  const loadTimeline = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await getProjectTimeline(projectId);
      const rawData = response?.data || response || {};
      const groups = Array.isArray(rawData?.groups)
        ? rawData.groups
        : Array.isArray(rawData?.items)
          ? rawData.items
          : [];
      const dependencies = Array.isArray(rawData?.dependencies) ? rawData.dependencies : [];
      const releases = Array.isArray(rawData?.releases) ? rawData.releases : [];

      setTimelineData({
        groups,
        dependencies,
        releases,
        rawIssues: Array.isArray(rawData?.issues) ? rawData.issues : [],
      });
    } catch (err) {
      setErrorMessage(getFriendlyErrorMessage(err, 'project') || 'Failed to load project timeline.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen) {
      loadTimeline();
    }
  }, [isOpen, loadTimeline]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return undefined;
    const oldBodyOverflow = document.body.style.overflow;
    const oldRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = oldBodyOverflow;
      document.documentElement.style.overflow = oldRootOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Synchronize vertical scroll between frozen sidebar and timeline body
  const handleScrollTimeline = (e) => {
    if (sidebarContainerRef.current) {
      sidebarContainerRef.current.scrollTop = e.target.scrollTop;
    }
  };

  const handleScrollSidebar = (e) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = e.target.scrollTop;
    }
  };

  // Toggle group collapse
  const toggleGroupCollapse = (groupId) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Parse and organize groups & issues
  const parsedGroups = useMemo(() => {
    const rawGroups = timelineData.groups || [];
    const topLevelIssues = timelineData.rawIssues || [];

    const result = rawGroups.map((group, groupIndex) => {
      const groupId = group.id || `group-${groupIndex}`;
      const groupName = group.name || (group.type === 'SPRINT' ? `Sprint ${groupIndex + 1}` : `Milestone ${groupIndex + 1}`);
      const rawIssues = Array.isArray(group.issues) ? group.issues : [];

      const parsedGroupStart = parseDateOrNull(group.startDate);
      const parsedGroupEnd = parseDateOrNull(group.endDate);

      const parsedIssues = rawIssues.map((issue, issueIndex) => {
        const id = issue.id || issue._id || issue.issueId || `issue-${groupIndex}-${issueIndex}`;
        const issueNumber = issue.issueNumber ?? (issueIndex + 1);
        const title = issue.title || issue.name || 'Untitled task';
        const status = issue.status || 'OPEN';
        const priority = issue.priority || 'MEDIUM';
        const atRisk = Boolean(issue.atRisk);

        // Fallbacks for start and end dates
        const start = parseDateOrNull(issue.startDate) ||
          parsedGroupStart ||
          parseDateOrNull(project?.startDate) ||
          new Date();

        let end = parseDateOrNull(issue.endDate);
        if (!end || end < start) {
          end = parsedGroupEnd && parsedGroupEnd >= start
            ? parsedGroupEnd
            : new Date(start.getTime() + 2 * DAY_MS);
        }

        return {
          id: String(id),
          issueNumber,
          title,
          status,
          priority,
          atRisk,
          startDate: normalizeDateOnly(start),
          endDate: normalizeDateOnly(end),
          groupId,
          groupName,
          raw: issue,
        };
      });

      return {
        id: String(groupId),
        name: groupName,
        type: group.type || 'GROUP',
        startDate: parsedGroupStart ? normalizeDateOnly(parsedGroupStart) : null,
        endDate: parsedGroupEnd ? normalizeDateOnly(parsedGroupEnd) : null,
        issues: parsedIssues,
      };
    });

    // If there are top-level issues not contained in any group, create an Ungrouped category
    if (topLevelIssues.length > 0) {
      const existingIssueIds = new Set(result.flatMap((g) => g.issues.map((i) => i.id)));
      const ungrouped = topLevelIssues.filter((i) => !existingIssueIds.has(String(i.id)));
      if (ungrouped.length > 0) {
        result.push({
          id: 'ungrouped',
          name: 'General Issues',
          type: 'BACKLOG',
          startDate: null,
          endDate: null,
          issues: ungrouped.map((issue, idx) => {
            const start = parseDateOrNull(issue.startDate) || new Date();
            const end = parseDateOrNull(issue.endDate) || new Date(start.getTime() + 2 * DAY_MS);
            return {
              id: String(issue.id || `ungrouped-${idx}`),
              issueNumber: issue.issueNumber ?? (idx + 1),
              title: issue.title || 'Untitled task',
              status: issue.status || 'OPEN',
              priority: issue.priority || 'MEDIUM',
              atRisk: Boolean(issue.atRisk),
              startDate: normalizeDateOnly(start),
              endDate: normalizeDateOnly(end),
              groupId: 'ungrouped',
              groupName: 'General Issues',
              raw: issue,
            };
          }),
        });
      }
    }

    return result;
  }, [timelineData, project]);

  // Flattened and filtered visible rows
  const { visibleRows, allFlattenedIssues, atRiskCount, statusCounts } = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const rows = [];
    const flattened = [];
    let riskTotal = 0;
    const counts = { total: 0, open: 0, inProgress: 0, resolved: 0, atRisk: 0 };

    parsedGroups.forEach((group) => {
      const isCollapsed = collapsedGroups.has(group.id);

      // Filter issues inside the group
      const matchingIssues = group.issues.filter((issue) => {
        flattened.push(issue);
        counts.total += 1;
        if (issue.atRisk) riskTotal += 1;

        const normStatus = String(issue.status || '').toUpperCase().replace(/[\s-]+/g, '_');
        if (['RESOLVED', 'CLOSED', 'DONE', 'COMPLETED'].includes(normStatus)) counts.resolved += 1;
        else if (['IN_PROGRESS', 'ACTIVE'].includes(normStatus)) counts.inProgress += 1;
        else counts.open += 1;

        if (statusFilter === 'AT_RISK' && !issue.atRisk) return false;
        if (statusFilter === 'OPEN' && !['OPEN', 'REOPENED', 'PLANNED'].includes(normStatus)) return false;
        if (statusFilter === 'IN_PROGRESS' && !['IN_PROGRESS', 'ACTIVE'].includes(normStatus)) return false;
        if (statusFilter === 'RESOLVED' && !['RESOLVED', 'CLOSED', 'DONE', 'COMPLETED'].includes(normStatus)) return false;

        if (query) {
          const matchTitle = issue.title.toLowerCase().includes(query);
          const matchNumber = String(issue.issueNumber).includes(query);
          return matchTitle || matchNumber;
        }
        return true;
      });

      // Only show swimlanes that have visible tasks; empty groups create
      // timeline rows with nothing useful to display.
      if (matchingIssues.length > 0) {
        rows.push({
          type: 'group',
          id: group.id,
          group,
          isCollapsed,
          issuesCount: matchingIssues.length,
        });

        if (!isCollapsed) {
          matchingIssues.forEach((issue) => {
            rows.push({
              type: 'issue',
              id: issue.id,
              issue,
              groupId: group.id,
            });
          });
        }
      }
    });

    counts.atRisk = riskTotal;

    return {
      visibleRows: rows,
      allFlattenedIssues: flattened,
      atRiskCount: riskTotal,
      statusCounts: counts,
    };
  }, [parsedGroups, collapsedGroups, searchQuery, statusFilter]);

  // Overall Timeline Date Extents
  const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
    const dates = [];

    // Keep the visible range focused on scheduled work, releases, and today.
    parsedGroups.forEach((g) => {
      if (g.issues.length === 0) return;
      if (g.startDate) dates.push(g.startDate);
      if (g.endDate) dates.push(g.endDate);
      g.issues.forEach((i) => {
        if (i.startDate) dates.push(i.startDate);
        if (i.endDate) dates.push(i.endDate);
      });
    });

    (timelineData.releases || []).forEach((rel) => {
      const d = parseDateOrNull(rel.releaseDate);
      if (d) dates.push(normalizeDateOnly(d));
    });

    const today = normalizeDateOnly(new Date());
    dates.push(today);

    if (dates.length === 0) {
      const start = new Date(today.getTime() - 7 * DAY_MS);
      const end = new Date(today.getTime() + 21 * DAY_MS);
      return {
        timelineStart: start,
        timelineEnd: end,
        totalDays: 28,
      };
    }

    const minTime = Math.min(...dates.map((d) => d.getTime()));
    const maxTime = Math.max(...dates.map((d) => d.getTime()));

    // Add padding before & after
    const start = normalizeDateOnly(new Date(minTime - 4 * DAY_MS));
    const end = normalizeDateOnly(new Date(maxTime + 7 * DAY_MS));
    const days = Math.max(14, Math.ceil((end.getTime() - start.getTime()) / DAY_MS));

    return {
      timelineStart: start,
      timelineEnd: end,
      totalDays: days,
    };
  }, [parsedGroups, timelineData.releases]);

  const currentScaleConfig = TIME_SCALES[timeScale] || TIME_SCALES.weeks;
  const dayWidth = currentScaleConfig.dayWidth;
  const totalTimelineWidth = totalDays * dayWidth;

  // Generate calendar days for timeline header
  const timelineDays = useMemo(() => {
    const days = [];
    const curr = new Date(timelineStart);
    const today = normalizeDateOnly(new Date()).getTime();

    for (let i = 0; i < totalDays; i += 1) {
      const d = new Date(curr);
      const isStartOfMonth = d.getDate() === 1;
      const isStartOfWeek = d.getDay() === 1; // Monday
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const isToday = d.getTime() === today;

      days.push({
        index: i,
        date: d,
        timestamp: d.getTime(),
        isStartOfMonth,
        isStartOfWeek,
        isWeekend,
        isToday,
      });

      curr.setDate(curr.getDate() + 1);
    }
    return days;
  }, [timelineStart, totalDays]);

  // Compute Month header segments
  const monthSegments = useMemo(() => {
    const segments = [];
    let currentMonth = -1;
    let currentYear = -1;
    let startIndex = 0;

    timelineDays.forEach((item, idx) => {
      const m = item.date.getMonth();
      const y = item.date.getFullYear();
      if (m !== currentMonth || y !== currentYear) {
        if (currentMonth !== -1) {
          segments.push({
            label: formatMonthLabel(timelineDays[startIndex].date),
            startIndex,
            spanDays: idx - startIndex,
          });
        }
        currentMonth = m;
        currentYear = y;
        startIndex = idx;
      }
    });

    if (startIndex < timelineDays.length) {
      segments.push({
        label: formatMonthLabel(timelineDays[startIndex].date),
        startIndex,
        spanDays: timelineDays.length - startIndex,
      });
    }

    return segments;
  }, [timelineDays]);

  // Compute X position from date
  const getXFromDate = useCallback((date) => {
    if (!date) return 0;
    const target = normalizeDateOnly(date).getTime();
    const start = timelineStart.getTime();
    const diffDays = (target - start) / DAY_MS;
    return Math.max(0, diffDays * dayWidth);
  }, [timelineStart, dayWidth]);

  // Compute issue bar bounds
  const getIssueBarBounds = useCallback((issue) => {
    const startX = getXFromDate(issue.startDate);
    const endX = getXFromDate(issue.endDate);
    const width = Math.max(28, endX - startX + dayWidth);
    return { startX, width, endX: startX + width };
  }, [getXFromDate, dayWidth]);

  // Map issue ID to its visual row index & bounds for dependency SVG drawing
  const issueLayoutMap = useMemo(() => {
    const map = new Map();
    const ROW_HEIGHT = 42; // matches row height

    visibleRows.forEach((row, rowIndex) => {
      if (row.type === 'issue') {
        const bounds = getIssueBarBounds(row.issue);
        map.set(row.issue.id, {
          rowIndex,
          centerY: rowIndex * ROW_HEIGHT + ROW_HEIGHT / 2,
          startX: bounds.startX,
          endX: bounds.endX,
          width: bounds.width,
          issue: row.issue,
        });
      }
    });

    return map;
  }, [visibleRows, getIssueBarBounds]);

  // Render curved dependency lines
  const dependencyLines = useMemo(() => {
    if (!showDependencies) return [];
    const deps = timelineData.dependencies || [];
    const lines = [];

    deps.forEach((dep, idx) => {
      const sourceId = String(dep.sourceIssueId || dep.from || dep.source || '');
      const targetId = String(dep.targetIssueId || dep.to || dep.target || '');

      const source = issueLayoutMap.get(sourceId);
      const target = issueLayoutMap.get(targetId);

      if (!source || !target) return;

      const x1 = source.endX;
      const y1 = source.centerY;
      const x2 = target.startX;
      const y2 = target.centerY;

      const isRelated = hoveredIssueId === sourceId || hoveredIssueId === targetId;

      let pathData = '';
      if (x2 >= x1 + 14) {
        // Forward link: smooth cubic bezier
        const deltaX = (x2 - x1) / 2;
        pathData = `M ${x1} ${y1} C ${x1 + deltaX} ${y1}, ${x2 - deltaX} ${y2}, ${x2} ${y2}`;
      } else {
        // Target is before source or directly above/below: step around
        const offset = 14;
        const midY = (y1 + y2) / 2;
        pathData = `M ${x1} ${y1} L ${x1 + offset} ${y1} L ${x1 + offset} ${midY} L ${x2 - offset} ${midY} L ${x2 - offset} ${y2} L ${x2} ${y2}`;
      }

      lines.push({
        id: `dep-${sourceId}-${targetId}-${idx}`,
        sourceId,
        targetId,
        pathData,
        isRelated,
        sourceNumber: source.issue.issueNumber,
        targetNumber: target.issue.issueNumber,
      });
    });

    return lines;
  }, [showDependencies, timelineData.dependencies, issueLayoutMap, hoveredIssueId]);

  // Releases with computed X positions
  const releasesWithPositions = useMemo(() => {
    if (!showReleases) return [];
    return (timelineData.releases || []).map((rel, idx) => {
      const d = parseDateOrNull(rel.releaseDate);
      const x = d ? getXFromDate(d) : 0;
      return {
        id: rel.id || `rel-${idx}`,
        name: rel.name || `Release ${idx + 1}`,
        date: d,
        x,
      };
    }).filter((r) => r.date !== null);
  }, [showReleases, timelineData.releases, getXFromDate]);

  // Today indicator position
  const todayPosition = useMemo(() => {
    const today = normalizeDateOnly(new Date());
    if (today < timelineStart || today > timelineEnd) return null;
    return getXFromDate(today);
  }, [timelineStart, timelineEnd, getXFromDate]);

  // Scroll to Today position
  const handleScrollToToday = () => {
    if (todayPosition !== null && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        left: Math.max(0, todayPosition - 280),
        behavior: 'smooth',
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-black/60 p-2 sm:p-4 backdrop-blur-xs"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="gantt-timeline-modal-title"
        className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all duration-300 dark:border-[#303030] dark:bg-[#1f1f1f] ${
          isFullscreen ? 'h-[98dvh] w-[99vw]' : 'h-[92dvh] w-full max-w-7xl'
        }`}
      >
        {/* Modal Top Bar */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5 dark:border-[#303030]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-sm">
              <FiCalendar size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="gantt-timeline-modal-title" className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">
                  Project Timeline & Gantt Chart
                </h2>
                <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-bold text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                  {project?.name || 'Project'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visual delivery roadmap, task dependencies, sprints, and release milestones
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {todayPosition !== null && (
              <button
                type="button"
                onClick={handleScrollToToday}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-[#35353d] dark:bg-[#222228] dark:text-slate-300 dark:hover:bg-[#2b2b32] cursor-pointer"
                title="Scroll view to current date"
              >
                <FiTarget size={13} className="text-amber-500" />
                <span>Today</span>
              </button>
            )}

            <button
              type="button"
              onClick={loadTimeline}
              disabled={isLoading}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-2xs transition hover:bg-slate-50 disabled:opacity-50 dark:border-[#35353d] dark:bg-[#222228] dark:text-slate-300 dark:hover:bg-[#2b2b32] cursor-pointer"
              title="Refresh timeline data"
            >
              <FiRefreshCw size={14} className={isLoading ? 'animate-spin text-sky-500' : ''} />
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="hidden sm:inline-flex rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-2xs transition hover:bg-slate-50 dark:border-[#35353d] dark:bg-[#222228] dark:text-slate-300 dark:hover:bg-[#2b2b32] cursor-pointer"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <FiMinimize2 size={14} /> : <FiMaximize2 size={14} />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-[#292930] dark:hover:text-white cursor-pointer"
              aria-label="Close timeline"
            >
              <FiX size={18} />
            </button>
          </div>
        </header>

        {/* Timeline Controls & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/70 px-5 py-2.5 text-xs dark:border-[#303030] dark:bg-[#222226]">
          {/* Quick Metrics Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1 text-slate-700 shadow-2xs dark:border-[#35353d] dark:bg-[#222228] dark:text-slate-300">
              <span className="font-bold">{statusCounts.total}</span> Tasks
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-1 font-semibold text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400">
              <FiCheckCircle size={12} />
              <span>{statusCounts.resolved} Resolved</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200/80 bg-sky-50/80 px-2.5 py-1 font-semibold text-sky-700 dark:border-sky-800/40 dark:bg-sky-950/40 dark:text-sky-400">
              <FiClock size={12} />
              <span>{statusCounts.inProgress} Active</span>
            </span>

            {atRiskCount > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter(statusFilter === 'AT_RISK' ? 'ALL' : 'AT_RISK')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold transition cursor-pointer ${
                  statusFilter === 'AT_RISK'
                    ? 'border border-rose-300 bg-rose-600 text-white shadow-xs'
                    : 'border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400'
                }`}
                title="Filter by At-Risk tasks"
              >
                <FiAlertTriangle size={12} className={statusFilter === 'AT_RISK' ? 'text-white' : 'text-rose-500 animate-pulse'} />
                <span>{atRiskCount} At Risk</span>
              </button>
            )}

            {timelineData.releases?.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-purple-200/70 bg-purple-50/80 px-2.5 py-1 text-purple-700 dark:border-purple-800/40 dark:bg-purple-950/40 dark:text-purple-300 font-medium">
                <FiFlag size={11} />
                <span>{timelineData.releases.length} Releases</span>
              </span>
            )}
          </div>

          {/* Interactive Filters & Zoom Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Box */}
            <div className="relative min-w-[140px] sm:min-w-[180px]">
              <FiSearch size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search issues..."
                className="h-8 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-2.5 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-sky-500 dark:border-[#35353d] dark:bg-[#202026] dark:text-white"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs dark:border-[#35353d] dark:bg-[#202026]">
              {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map((filterKey) => (
                <button
                  key={filterKey}
                  type="button"
                  onClick={() => setStatusFilter(filterKey)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                    statusFilter === filterKey
                      ? 'bg-sky-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {filterKey === 'ALL' ? 'All' : filterKey.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Time Scale Zoom Segment */}
            <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 shadow-2xs dark:border-[#35353d] dark:bg-[#202026]">
              {Object.values(TIME_SCALES).map((scale) => (
                <button
                  key={scale.id}
                  type="button"
                  onClick={() => setTimeScale(scale.id)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                    timeScale === scale.id
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {scale.label}
                </button>
              ))}
            </div>

            {/* Dependency Toggle */}
            <button
              type="button"
              onClick={() => setShowDependencies((prev) => !prev)}
              className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 font-semibold transition cursor-pointer ${
                showDependencies
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800/50 dark:bg-indigo-950/40 dark:text-indigo-300'
                  : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 dark:border-[#35353d] dark:bg-[#202026] dark:text-slate-400'
              }`}
              title="Toggle dependency arrows"
            >
              <FiLink2 size={12} />
              <span className="hidden sm:inline">Links</span>
            </button>
          </div>
        </div>

        {/* Main Timeline Body */}
        <div className="relative flex flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex h-full w-full flex-col items-center justify-center space-y-3 p-8 text-center">
              <FiRefreshCw size={28} className="animate-spin text-sky-500" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Loading project timeline...</p>
              <p className="text-xs text-slate-400">Rendering task swimlanes, milestones, and dependencies</p>
            </div>
          ) : errorMessage ? (
            <div className="flex h-full w-full flex-col items-center justify-center space-y-3 p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
                <FiAlertTriangle size={24} />
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{errorMessage}</p>
              <button
                type="button"
                onClick={loadTimeline}
                className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700 cursor-pointer"
              >
                Retry Loading
              </button>
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="flex h-full w-full flex-col items-center justify-center space-y-3 p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-[#25252c] dark:text-slate-500">
                <FiLayers size={24} />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-white">
                {allFlattenedIssues.length === 0 ? 'No tasks to show yet' : 'No tasks matching the selected filters'}
              </p>
              <p className="max-w-md text-xs text-slate-500 dark:text-slate-400">
                {allFlattenedIssues.length === 0
                  ? 'Add issues to this project to see them plotted on the timeline.'
                  : 'Try clearing search terms or selecting "All" in the status filter to see other project activities.'}
              </p>
              {(searchQuery || statusFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-[#35353d] dark:bg-[#222228] dark:text-slate-300 cursor-pointer"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="flex h-full w-full overflow-hidden">
              {/* Left Column: Task & Group Hierarchy (Sidebar) */}
              <div
                ref={sidebarContainerRef}
                onScroll={handleScrollSidebar}
                className="w-[260px] sm:w-[320px] shrink-0 overflow-y-auto border-r border-slate-200 bg-white select-none dark:border-[#303030] dark:bg-[#1f1f1f]"
              >
                {/* Header row aligning with calendar */}
                <div className="sticky top-0 z-30 flex h-[62px] items-center border-b border-slate-200 bg-slate-50 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 shadow-2xs dark:border-[#303030] dark:bg-[#222226] dark:text-slate-400">
                  <div className="flex-1">Task / Swimlane</div>
                  <div className="w-16 text-right">Status</div>
                </div>

                {/* Rows matching Timeline Canvas */}
                <div className="divide-y divide-slate-100 dark:divide-[#303030]">
                  {visibleRows.map((row) => {
                    if (row.type === 'group') {
                      return (
                        <div
                          key={`sidebar-group-${row.id}`}
                          onClick={() => toggleGroupCollapse(row.id)}
                          className="flex h-[42px] cursor-pointer items-center justify-between gap-2 bg-slate-50/80 px-3 transition hover:bg-slate-100 dark:bg-[#222226] dark:hover:bg-[#2b2b30]"
                        >
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span className="text-slate-400">
                              {row.isCollapsed ? <FiChevronRight size={14} /> : <FiChevronDown size={14} />}
                            </span>
                            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                              {row.group.type}
                            </span>
                            <span className="truncate text-xs font-bold text-slate-800 dark:text-white" title={row.group.name}>
                              {row.group.name}
                            </span>
                          </div>
                          <span className="shrink-0 rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-[#2d2d36] dark:text-slate-300">
                            {row.issuesCount}
                          </span>
                        </div>
                      );
                    }

                    const issue = row.issue;
                    const statusInfo = getStatusStyle(issue.status);
                    const StatusIcon = statusInfo.icon;
                    const isHovered = hoveredIssueId === issue.id;

                    return (
                      <div
                        key={`sidebar-issue-${issue.id}`}
                        onMouseEnter={() => setHoveredIssueId(issue.id)}
                        onMouseLeave={() => setHoveredIssueId(null)}
                        onClick={() => onOpenIssue?.(issue.raw || issue)}
                        className={`flex h-[42px] cursor-pointer items-center justify-between gap-2 px-3 pl-8 text-xs transition ${
                          isHovered
                            ? 'bg-sky-50/70 dark:bg-sky-950/20'
                            : 'hover:bg-slate-50 dark:hover:bg-[#1e1e24]'
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-sky-600 dark:text-sky-400">
                            #{issue.issueNumber}
                          </span>
                          <span className="truncate font-medium text-slate-800 dark:text-slate-200" title={issue.title}>
                            {issue.title}
                          </span>
                          {issue.atRisk && (
                            <span
                              className="inline-flex shrink-0 items-center text-rose-500"
                              title="Task is marked as At Risk"
                            >
                              <FiAlertTriangle size={12} className="animate-pulse" />
                            </span>
                          )}
                        </div>

                        <span
                          className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${statusInfo.badge}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Timeline Grid & Interactive Bars (Canvas) */}
              <div
                ref={scrollContainerRef}
                onScroll={handleScrollTimeline}
                className="relative flex-1 overflow-x-auto overflow-y-auto bg-slate-50/40 dark:bg-[#1b1b1f]"
              >
                <div style={{ width: `${totalTimelineWidth}px`, minWidth: '100%' }} className="relative min-h-full">
                  {/* Sticky Timeline Axis Header */}
                  <div className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-2xs dark:border-[#303030] dark:bg-[#1f1f1f]">
                    {/* Top Tier: Months */}
                    <div className="flex h-7 border-b border-slate-100 text-[11px] font-bold text-slate-700 dark:border-[#26262d] dark:text-slate-300">
                      {monthSegments.map((seg, idx) => (
                        <div
                          key={`month-segment-${idx}`}
                          style={{ width: `${seg.spanDays * dayWidth}px` }}
                          className="flex items-center border-r border-slate-100 px-2.5 truncate dark:border-[#26262d]"
                        >
                          {seg.label}
                        </div>
                      ))}
                    </div>

                    {/* Bottom Tier: Days / Ticks */}
                    <div className="flex h-8 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                      {timelineDays.map((day) => {
                        const showTickLabel = timeScale === 'days' || (timeScale === 'weeks' && day.isStartOfWeek) || day.isStartOfMonth;
                        return (
                          <div
                            key={`tick-${day.index}`}
                            style={{ width: `${dayWidth}px` }}
                            className={`flex flex-col items-center justify-center border-r border-slate-100/80 transition-colors dark:border-[#25252c] ${
                              day.isToday
                                ? 'bg-amber-100/60 font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                : day.isWeekend
                                  ? 'bg-slate-100/40 dark:bg-[#19191d]'
                                  : ''
                            }`}
                          >
                            {showTickLabel && (
                              <span>
                                {timeScale === 'days' ? formatDayLabel(day.date) : day.date.getDate()}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Vertical Day Grid Lines Layer */}
                  <div className="pointer-events-none absolute inset-0 top-[62px] flex">
                    {timelineDays.map((day) => (
                      <div
                        key={`grid-line-${day.index}`}
                        style={{ width: `${dayWidth}px` }}
                        className={`h-full border-r border-slate-100/70 dark:border-[#202026] ${
                          day.isWeekend ? 'bg-slate-100/20 dark:bg-[#16161a]/60' : ''
                        }`}
                      />
                    ))}
                  </div>

                  {/* Vertical Release Lines Layer */}
                  {releasesWithPositions.map((rel) => (
                    <div
                      key={`rel-line-${rel.id}`}
                      style={{ left: `${rel.x}px` }}
                      className="pointer-events-none absolute bottom-0 top-[30px] z-20 flex flex-col items-center"
                    >
                      <div className="rounded-full border border-purple-300 bg-purple-600 px-2 py-0.5 text-[9px] font-bold text-white shadow-md dark:border-purple-400 whitespace-nowrap">
                        🚀 {rel.name}
                      </div>
                      <div className="h-full w-0.5 border-l-2 border-dashed border-purple-500/80 dark:border-purple-400/80" />
                    </div>
                  ))}

                  {/* Vertical Today Line Layer */}
                  {todayPosition !== null && (
                    <div
                      style={{ left: `${todayPosition}px` }}
                      className="pointer-events-none absolute bottom-0 top-[32px] z-20 flex flex-col items-center"
                    >
                      <div className="rounded-full bg-amber-500 px-1.5 py-0.2 text-[8px] font-extrabold uppercase text-white shadow-xs tracking-wider">
                        Today
                      </div>
                      <div className="h-full w-[2px] bg-amber-500/80 shadow-xs" />
                    </div>
                  )}

                  {/* SVG Dependency Arrows Layer */}
                  {showDependencies && dependencyLines.length > 0 && (
                    <svg
                      className="pointer-events-none absolute inset-0 top-[62px] z-15 h-full w-full"
                      style={{ overflow: 'visible' }}
                    >
                      <defs>
                        <marker
                          id="gantt-arrow-default"
                          markerWidth="6"
                          markerHeight="6"
                          refX="5"
                          refY="3"
                          orient="auto"
                        >
                          <polygon points="0 0, 6 3, 0 6" fill="currentColor" className="text-slate-400 dark:text-slate-600" />
                        </marker>
                        <marker
                          id="gantt-arrow-active"
                          markerWidth="7"
                          markerHeight="7"
                          refX="6"
                          refY="3.5"
                          orient="auto"
                        >
                          <polygon points="0 0, 7 3.5, 0 7" fill="#0284c7" />
                        </marker>
                      </defs>

                      {dependencyLines.map((line) => (
                        <path
                          key={line.id}
                          d={line.pathData}
                          fill="none"
                          stroke={line.isRelated ? '#0284c7' : 'currentColor'}
                          strokeWidth={line.isRelated ? 2.5 : 1.4}
                          strokeDasharray={line.isRelated ? 'none' : '3 3'}
                          markerEnd={line.isRelated ? 'url(#gantt-arrow-active)' : 'url(#gantt-arrow-default)'}
                          className={`transition-colors duration-200 ${
                            line.isRelated
                              ? 'opacity-100 drop-shadow-sm'
                              : 'text-slate-400/70 dark:text-slate-600/70'
                          }`}
                        />
                      ))}
                    </svg>
                  )}

                  {/* Timeline Rows & Task Bars */}
                  <div className="relative z-10 divide-y divide-slate-100/60 dark:divide-[#222228]">
                    {visibleRows.map((row, rowIndex) => {
                      if (row.type === 'group') {
                        // Group swimlane bar
                        const groupStart = row.group.startDate;
                        const groupEnd = row.group.endDate;
                        let groupBounds = null;

                        if (groupStart && groupEnd) {
                          const gx1 = getXFromDate(groupStart);
                          const gx2 = getXFromDate(groupEnd);
                          groupBounds = {
                            left: gx1,
                            width: Math.max(30, gx2 - gx1 + dayWidth),
                          };
                        }

                        return (
                          <div
                            key={`canvas-group-${row.id}`}
                            className="relative h-[42px] bg-slate-100/40 dark:bg-[#1a1a20]/40"
                          >
                            {groupBounds && (
                              <div
                                style={{
                                  left: `${groupBounds.left}px`,
                                  width: `${groupBounds.width}px`,
                                }}
                                className="absolute top-2.5 h-4.5 rounded-lg border border-indigo-200/70 bg-indigo-50/70 dark:border-indigo-800/40 dark:bg-indigo-950/30"
                                title={`${row.group.name}: ${formatDate(groupStart)} — ${formatDate(groupEnd)}`}
                              />
                            )}
                          </div>
                        );
                      }

                      // Issue Task Bar
                      const issue = row.issue;
                      const bounds = getIssueBarBounds(issue);
                      const statusInfo = getStatusStyle(issue.status);
                      const isHovered = hoveredIssueId === issue.id;

                      const durationDays = Math.max(
                        1,
                        Math.round((issue.endDate.getTime() - issue.startDate.getTime()) / DAY_MS)
                      );

                      return (
                        <div
                          key={`canvas-issue-${issue.id}`}
                          className={`relative h-[42px] transition-colors ${
                            isHovered ? 'bg-sky-50/40 dark:bg-sky-950/10' : ''
                          }`}
                        >
                          <div
                            style={{
                              left: `${bounds.startX}px`,
                              width: `${bounds.width}px`,
                            }}
                            onMouseEnter={(e) => {
                              setHoveredIssueId(issue.id);
                              const rect = e.currentTarget.getBoundingClientRect();
                              setTooltipState({
                                issue,
                                durationDays,
                                statusInfo,
                                x: rect.left + rect.width / 2,
                                y: rect.top,
                              });
                            }}
                            onMouseLeave={() => {
                              setHoveredIssueId(null);
                              setTooltipState(null);
                            }}
                            onClick={() => onOpenIssue?.(issue.raw || issue)}
                            className={`group absolute top-2 h-7.5 cursor-pointer rounded-xl bg-gradient-to-r px-2.5 shadow-sm transition-all duration-200 flex items-center justify-between gap-1.5 select-none ${
                              statusInfo.bar
                            } ${
                              issue.atRisk
                                ? 'border-2 border-rose-500 ring-2 ring-rose-400/40 shadow-rose-500/30'
                                : 'border border-white/20'
                            } ${isHovered ? 'scale-[1.02] -translate-y-0.5 z-25 shadow-md' : 'hover:scale-[1.01]'}`}
                          >
                            <div className="flex min-w-0 items-center gap-1.5">
                              {issue.atRisk && (
                                <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white font-bold text-[9px] shadow-xs">
                                  !
                                </span>
                              )}
                              <span className="truncate text-xs font-bold leading-none">
                                #{issue.issueNumber} {issue.title}
                              </span>
                            </div>

                            <div className="flex shrink-0 items-center gap-1 text-[10px] opacity-90">
                              <span className="hidden sm:inline font-mono font-medium">
                                {durationDays}d
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Floating Rich Tooltip */}
        {tooltipState && (
          <div
            style={{
              position: 'fixed',
              left: `${tooltipState.x}px`,
              top: `${tooltipState.y - 12}px`,
              transform: 'translate(-50%, -100%)',
            }}
            className="pointer-events-none z-[80] w-72 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xl transition-opacity animate-fadeIn dark:border-[#35353d] dark:bg-[#1a1a20] text-slate-800 dark:text-slate-100"
          >
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2 dark:border-[#282830]">
              <div className="min-w-0 flex-1">
                <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
                  #{tooltipState.issue.issueNumber}
                </span>
                <h4 className="mt-0.5 truncate text-sm font-bold text-slate-900 dark:text-white">
                  {tooltipState.issue.title}
                </h4>
              </div>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${tooltipState.statusInfo.badge}`}>
                {tooltipState.statusInfo.label}
              </span>
            </div>

            <div className="mt-2.5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Swimlane:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                  {tooltipState.issue.groupName}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Timeline:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatDate(tooltipState.issue.startDate)} — {formatDate(tooltipState.issue.endDate)}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Duration:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {tooltipState.durationDays} {tooltipState.durationDays === 1 ? 'day' : 'days'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Priority:</span>
                <span className={`rounded px-1.5 py-0.2 text-[10px] font-semibold uppercase ${getPriorityBadge(tooltipState.issue.priority)}`}>
                  {tooltipState.issue.priority}
                </span>
              </div>

              {tooltipState.issue.atRisk && (
                <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 p-2 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                  <div className="flex items-center gap-1.5 font-bold">
                    <FiAlertTriangle size={13} />
                    <span>Task At Risk</span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug">
                    This task has experienced delays or deadline risk relative to target milestone milestones.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-2 border-t border-slate-100 pt-1.5 text-center text-[10px] text-slate-400 dark:border-[#282830]">
              Click bar to open full task details
            </div>
          </div>
        )}

        {/* Modal Footer / Legend */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3 dark:border-[#303030] dark:bg-[#1f1f1f] text-xs">
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-bold uppercase tracking-wider text-slate-400">Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-6 rounded-md bg-gradient-to-r from-sky-500 to-blue-600" />
              <span>In Progress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-6 rounded-md bg-gradient-to-r from-emerald-500 to-teal-600" />
              <span>Resolved</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-6 rounded-md bg-gradient-to-r from-indigo-500 to-purple-600" />
              <span>Open</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-6 rounded-md border-2 border-rose-500 bg-gradient-to-r from-indigo-500 to-purple-600 ring-2 ring-rose-400/40" />
              <span className="font-semibold text-rose-600 dark:text-rose-400">At Risk</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="border-l-2 border-dashed border-purple-500 h-3 inline-block" />
              <span>Release Marker</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span>Today</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-[#35353d] dark:bg-[#202026] dark:text-slate-300 dark:hover:bg-[#2b2b32] cursor-pointer"
          >
            Close
          </button>
        </footer>
      </section>
    </div>
  );
};

export default ProjectTimelineModal;
