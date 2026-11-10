import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FiAlertTriangle,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFlag,
  FiLayers,
  FiMaximize2,
  FiMinimize2,
  FiRefreshCw,
  FiSearch,
  FiTarget,
  FiX,
} from 'react-icons/fi';
import { getProjectTimeline, getFriendlyErrorMessage } from '../services/projectApi';

const STAGE_COLORS = [
  { bar: 'bg-blue-700', chip: 'bg-blue-600', icon: 'text-blue-600' },
  { bar: 'bg-blue-500', chip: 'bg-blue-500', icon: 'text-blue-600' },
  { bar: 'bg-sky-400', chip: 'bg-sky-500', icon: 'text-sky-600' },
  { bar: 'bg-indigo-500', chip: 'bg-indigo-500', icon: 'text-indigo-600' },
  { bar: 'bg-violet-500', chip: 'bg-violet-500', icon: 'text-violet-600' },
  { bar: 'bg-violet-400', chip: 'bg-violet-400', icon: 'text-violet-600' },
];

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const startOfDay = (date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const getIssueStatus = (status) => {
  const value = String(status || 'OPEN').toUpperCase().replace(/[\s-]+/g, '_');
  if (['RESOLVED', 'CLOSED', 'DONE', 'COMPLETED'].includes(value)) return 'RESOLVED';
  if (['IN_PROGRESS', 'ACTIVE'].includes(value)) return 'IN_PROGRESS';
  return value === 'REOPENED' ? 'REOPENED' : 'OPEN';
};

const getStageDate = (group, issues, project) => {
  // Prefer dates belonging to this sprint or milestone. Including the project
  // start date in the same list makes every stage inherit that earlier date.
  const stageDates = [group.startDate, group.endDate, ...issues.flatMap((issue) => [issue.startDate, issue.endDate])]
    .map(parseDate)
    .filter(Boolean)
    .sort((left, right) => left - right);
  return stageDates[0] || parseDate(project?.startDate);
};

const formatStageDate = (date) => date
  ? date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
  : 'Date not set';

const statusClasses = {
  RESOLVED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  IN_PROGRESS: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  REOPENED: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  OPEN: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300',
};

const ProjectTimelineRoadmap = ({ isOpen, onClose, projectId, project, onOpenIssue }) => {
  const [timelineData, setTimelineData] = useState({ groups: [], releases: [], issues: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showReleases, setShowReleases] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scrollRef = useRef(null);

  const loadTimeline = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await getProjectTimeline(projectId);
      const data = response?.data || response || {};
      setTimelineData({
        groups: Array.isArray(data.groups) ? data.groups : Array.isArray(data.items) ? data.items : [],
        releases: Array.isArray(data.releases) ? data.releases : [],
        issues: Array.isArray(data.issues) ? data.issues : [],
      });
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, 'project') || 'Failed to load project timeline.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen) loadTimeline();
  }, [isOpen, loadTimeline]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  const stages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const groups = timelineData.groups.map((group, index) => {
      const groupIssues = Array.isArray(group.issues) ? group.issues : [];
      const issues = groupIssues.filter((issue) => {
        const status = getIssueStatus(issue.status);
        const statusMatches = statusFilter === 'ALL'
          || (statusFilter === 'OPEN' && ['OPEN', 'REOPENED'].includes(status))
          || status === statusFilter;
        const queryMatches = !query || `${issue.title || issue.name || ''} ${issue.issueNumber || ''} ${group.name || ''}`.toLowerCase().includes(query);
        return statusMatches && queryMatches;
      });
      const name = group.name || `${group.type === 'SPRINT' ? 'Sprint' : 'Milestone'} ${index + 1}`;
      return {
        id: String(group.id || `group-${index}`),
        name,
        kind: String(group.type || 'MILESTONE').toUpperCase(),
        date: getStageDate(group, issues.length ? issues : groupIssues, project),
        issues,
        raw: group,
      };
      }).filter((stage) => stage.issues.length > 0 || (stage.kind !== 'PROJECT' && !searchQuery && statusFilter === 'ALL'));

    const knownIssueIds = new Set(groups.flatMap((group) => (group.raw.issues || []).map((issue) => String(issue.id || issue.issueId || issue._id))));
    const looseIssues = timelineData.issues.filter((issue) => !knownIssueIds.has(String(issue.id || issue.issueId || issue._id)));
    if (looseIssues.length) {
      const issues = looseIssues.filter((issue) => {
        const status = getIssueStatus(issue.status);
        const statusMatches = statusFilter === 'ALL'
          || (statusFilter === 'OPEN' && ['OPEN', 'REOPENED'].includes(status))
          || status === statusFilter;
        return statusMatches && (!query || `${issue.title || issue.name || ''} ${issue.issueNumber || ''}`.toLowerCase().includes(query));
      });
      if (issues.length) groups.push({ id: 'general-issues', name: 'Project Issues', kind: 'ISSUES', date: getStageDate({}, issues, project), issues, raw: {} });
    }

    const releaseStages = showReleases
      ? timelineData.releases
        .filter((release) => !query || `${release.name || release.title || ''} release`.toLowerCase().includes(query))
        .map((release, index) => ({
          id: String(release.id || release.releaseId || `release-${index}`),
          name: release.name || release.title || `Release ${index + 1}`,
          kind: 'RELEASE',
          date: parseDate(release.releaseDate || release.targetDate || release.createdAt),
          issues: [],
          raw: release,
        }))
      : [];

    return [...groups, ...releaseStages]
      .map((stage, index) => ({ ...stage, sortDate: stage.date?.getTime() ?? Number.MAX_SAFE_INTEGER - (groups.length - index) }))
      .sort((left, right) => left.sortDate - right.sortDate);
  }, [timelineData, project, searchQuery, statusFilter, showReleases]);

  const allIssues = useMemo(() => {
    const grouped = timelineData.groups.flatMap((group) => Array.isArray(group.issues) ? group.issues : []);
    return [...grouped, ...timelineData.issues].filter((issue, index, list) => {
      const id = String(issue.id || issue.issueId || issue._id || `issue-${index}`);
      return list.findIndex((candidate, candidateIndex) => String(candidate.id || candidate.issueId || candidate._id || `issue-${candidateIndex}`) === id) === index;
    });
  }, [timelineData]);

  const counts = useMemo(() => ({
    total: allIssues.length,
    resolved: allIssues.filter((issue) => getIssueStatus(issue.status) === 'RESOLVED').length,
    active: allIssues.filter((issue) => getIssueStatus(issue.status) === 'IN_PROGRESS').length,
    releases: timelineData.releases.length,
  }), [allIssues, timelineData.releases]);

  const scrollToToday = () => {
    if (!stages.length || !scrollRef.current) return;
    const today = startOfDay(new Date()).getTime();
    const closestIndex = stages.reduce((closest, stage, index) => {
      if (!stage.date) return closest;
      if (closest < 0) return index;
      return Math.abs(stage.date.getTime() - today) < Math.abs(stages[closest].date.getTime() - today) ? index : closest;
    }, -1);
    if (closestIndex >= 0) {
      const slot = Math.max(260, scrollRef.current.scrollWidth / stages.length);
      scrollRef.current.scrollTo({ left: Math.max(0, closestIndex * slot - scrollRef.current.clientWidth / 2 + slot / 2), behavior: 'smooth' });
    }
  };

  if (!isOpen) return null;

  const slotWidth = Math.max(260, 1000 / Math.max(1, stages.length));
  const canvasWidth = Math.max(1000, stages.length * 260);
  const stageColors = stages.map((_, index) => STAGE_COLORS[index % STAGE_COLORS.length]);
  const today = startOfDay(new Date());

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-black/70 p-2 backdrop-blur-sm sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="project-roadmap-title" className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-[#303030] dark:bg-[#1f1f1f] ${isFullscreen ? 'h-[98dvh] w-[99vw]' : 'h-[92dvh] w-full max-w-7xl'}`}>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 dark:border-[#303030]">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white"><FiCalendar size={20} /></div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="project-roadmap-title" className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">Project Timeline</h2>
                <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-bold text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">{project?.name || 'Project'}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Milestones, sprints, issues, and release dates</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={scrollToToday} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-[#35353d] dark:bg-[#222228] dark:text-slate-300 dark:hover:bg-[#2b2b32]"><FiTarget className="text-amber-500" size={13} />Today</button>
            <button type="button" onClick={loadTimeline} disabled={isLoading} title="Refresh timeline" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-[#35353d] dark:bg-[#222228] dark:text-slate-300 dark:hover:bg-[#2b2b32]"><FiRefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /></button>
            <button type="button" onClick={() => setIsFullscreen((value) => !value)} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'} className="hidden rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 dark:border-[#35353d] dark:bg-[#222228] dark:text-slate-300 dark:hover:bg-[#2b2b32] sm:inline-flex">{isFullscreen ? <FiMinimize2 size={14} /> : <FiMaximize2 size={14} />}</button>
            <button type="button" onClick={onClose} aria-label="Close timeline" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#292930]"><FiX size={18} /></button>
          </div>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/70 px-5 py-2.5 text-xs dark:border-[#303030] dark:bg-[#222226]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-slate-700 dark:border-[#35353d] dark:bg-[#222228] dark:text-slate-300"><b>{counts.total}</b> Issues</span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-1 font-semibold text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400"><FiCheckCircle size={12} />{counts.resolved} Resolved</span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200/80 bg-sky-50/80 px-2.5 py-1 font-semibold text-sky-700 dark:border-sky-800/40 dark:bg-sky-950/40 dark:text-sky-400"><FiClock size={12} />{counts.active} Active</span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200/70 bg-purple-50/80 px-2.5 py-1 font-medium text-purple-700 dark:border-purple-800/40 dark:bg-purple-950/40 dark:text-purple-300"><FiFlag size={11} />{counts.releases} Releases</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[150px]">
              <FiSearch size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search issues..." className="h-8 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-2.5 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-sky-500 dark:border-[#35353d] dark:bg-[#202026] dark:text-white" />
            </div>
            <div className="flex items-center rounded-xl border border-slate-200 bg-white p-0.5 dark:border-[#35353d] dark:bg-[#202026]">
              {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map((filter) => <button key={filter} type="button" onClick={() => setStatusFilter(filter)} className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${statusFilter === filter ? 'bg-sky-600 text-white' : 'text-slate-600 dark:text-slate-400'}`}>{filter === 'ALL' ? 'All' : filter.replace('_', ' ')}</button>)}
            </div>
            <button type="button" onClick={() => setShowReleases((value) => !value)} className={`rounded-xl border px-2.5 py-1 font-semibold ${showReleases ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800/50 dark:bg-indigo-950/40 dark:text-indigo-300' : 'border-slate-200 bg-white text-slate-500 dark:border-[#35353d] dark:bg-[#202026]'}`}><FiFlag className="mr-1 inline" size={12} />Releases</button>
          </div>
        </div>

        <main ref={scrollRef} className="relative flex-1 overflow-auto bg-white dark:bg-[#1f1f1f]">
          {isLoading ? (
            <div className="flex h-full min-h-80 flex-col items-center justify-center gap-3 text-center"><FiRefreshCw size={28} className="animate-spin text-sky-500" /><p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Loading project timeline…</p></div>
          ) : errorMessage ? (
            <div className="flex h-full min-h-80 flex-col items-center justify-center gap-3 p-8 text-center"><FiAlertTriangle size={26} className="text-rose-500" /><p className="text-sm font-bold text-slate-900 dark:text-white">{errorMessage}</p><button type="button" onClick={loadTimeline} className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700">Retry</button></div>
          ) : stages.length === 0 ? (
            <div className="flex h-full min-h-80 flex-col items-center justify-center gap-3 p-8 text-center"><FiLayers size={26} className="text-slate-400" /><p className="text-sm font-bold text-slate-800 dark:text-white">{allIssues.length ? 'No timeline items match these filters' : 'No milestones or issues to show yet'}</p><p className="max-w-md text-xs text-slate-500 dark:text-slate-400">Add milestones, sprints, issues, or releases to build the project roadmap.</p></div>
          ) : (
            <div className="relative mx-auto min-h-[620px] px-4 py-5" style={{ width: `${canvasWidth}px` }}>
              <div className="absolute inset-x-0 top-[50%] flex h-10 -translate-y-1/2 items-stretch px-2">
                {stages.map((stage, index) => <div key={`arrow-${stage.id}`} className={`relative flex-1 ${stageColors[index].bar} ${index ? '-ml-2' : ''}`} style={{ clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%, 12px 50%)' }} />)}
              </div>
              {stages.map((stage, index) => {
                const color = stageColors[index];
                const above = index % 2 === 0;
                const x = slotWidth * index + slotWidth / 2;
                const status = stage.kind === 'RELEASE' ? 'RELEASE' : stage.kind;
                const Icon = stage.kind === 'RELEASE' ? FiFlag : stage.kind === 'SPRINT' ? FiCalendar : FiLayers;
                const isToday = stage.date && startOfDay(stage.date).getTime() === today.getTime();
                return (
                  <div key={stage.id} className="absolute inset-y-0" style={{ left: `${x}px`, width: '1px' }}>
                    <div className={`absolute left-1/2 z-10 w-[220px] -translate-x-1/2 rounded-xl border-2 border-dashed p-3 shadow-sm ${stage.kind === 'RELEASE' ? 'border-amber-400 bg-amber-50 dark:border-amber-500/70 dark:bg-amber-950/30' : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-[#242428]'}`} style={above ? { top: '26px' } : { top: 'calc(50% + 90px)' }}>
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-[#303038] ${color.icon}`}><Icon size={20} /></div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{status === 'RELEASE' ? 'Release' : status === 'SPRINT' ? 'Sprint' : status === 'MILESTONE' ? 'Milestone' : 'Project work'}</p>
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{stage.name}</p>
                          {stage.date && <p className="text-[10px] text-slate-500 dark:text-slate-400">{stage.date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                        </div>
                      </div>
                      {stage.issues.length > 0 && <div className="mt-2 space-y-1 border-t border-slate-200 pt-2 dark:border-[#3b3b42]">
                        {stage.issues.slice(0, 2).map((issue, issueIndex) => {
                          const issueStatus = getIssueStatus(issue.status);
                          return <button key={issue.id || issue.issueId || issueIndex} type="button" onClick={() => onOpenIssue?.(issue)} title={issue.title || issue.name} className="flex w-full items-center justify-between gap-2 text-left">
                            <span className="truncate text-[10px] font-medium text-slate-700 hover:text-sky-600 dark:text-slate-300 dark:hover:text-sky-300">{issue.issueNumber ? `#${issue.issueNumber} ` : ''}{issue.title || issue.name || 'Untitled issue'}</span>
                            <span className={`shrink-0 rounded border px-1 py-0.5 text-[8px] font-bold ${statusClasses[issueStatus] || statusClasses.OPEN}`}>{issueStatus.replace('_', ' ')}</span>
                          </button>;
                        })}
                        {stage.issues.length > 2 && <p className="text-[9px] text-slate-500 dark:text-slate-400">+{stage.issues.length - 2} more issues</p>}
                      </div>}
                    </div>
                    <div className={`absolute left-0 w-px bg-slate-500/80 dark:bg-slate-400/70 ${above ? 'top-[calc(26px+140px)] h-[calc(50%-186px)]' : 'top-1/2 h-[90px]'}`} />
                    <div className={`absolute left-1/2 top-[calc(50%-10px)] z-20 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 text-xs font-bold text-white shadow-sm ${color.chip}`}>
                      {stage.date ? formatStageDate(stage.date) : stage.kind === 'RELEASE' ? 'Release' : `Stage ${index + 1}`}
                    </div>
                    {isToday && <span className="absolute left-0 top-0 h-full border-l-2 border-dashed border-amber-500" title="Today" />}
                  </div>
                );
              })}
            </div>
          )}
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3 text-xs dark:border-[#303030] dark:bg-[#1f1f1f]">
          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-bold uppercase tracking-wider text-slate-400">Legend:</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-6 rounded-full bg-gradient-to-r from-sky-500 to-blue-600" />In Progress</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-6 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600" />Resolved</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-6 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600" />Open</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-3 border-l-2 border-dashed border-purple-500" />Release marker</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-amber-500" />Today</span>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-[#35353d] dark:bg-[#202026] dark:text-slate-300 dark:hover:bg-[#2b2b32]">Close</button>
        </footer>
      </section>
    </div>
  );
};

export default ProjectTimelineRoadmap;
