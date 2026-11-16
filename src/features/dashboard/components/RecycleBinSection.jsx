import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiArchive, FiRotateCcw, FiRefreshCw, FiAlertCircle, FiFolder, FiCheckCircle, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { getMyProjects } from '../../projects/services/projectApi';
import { getDashboardProjectId } from '../../../utils/dashboardProjectSelection';
import {
  getDeletedIssues,
  getDeletedMilestones,
  getDeletedProjects,
  getDeletedSprints,
  normalizeDeletedItems,
  restoreDeletedIssue,
  restoreDeletedMilestone,
  restoreDeletedProject,
  restoreDeletedSprint,
} from '../services/recycleBinApi';

const TABS = ['Projects', 'Issues', 'Sprints', 'Milestones'];
const unwrapProjects = (value) => {
  const data = value?.data ?? value?.projects ?? value;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.projects)) return data.projects;
  return [];
};
const getItemId = (item, tab) => {
  if (!item) return '';
  if (tab === 'Projects') return item.id || item._id || item.projectId;
  if (tab === 'Issues') return item.id || item.issueId || item._id;
  if (tab === 'Sprints') return item.id || item.sprintId || item._id;
  if (tab === 'Milestones') return item.id || item.milestoneId || item._id;
  return item.id || item._id;
};
const getItemTitle = (item, tab) => item?.name || item?.title || item?.summary || `${tab.slice(0, -1)} ${String(getItemId(item) || '').slice(0, 8)}`;
const formatDeletedAt = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : `Deleted ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
};

const RecycleBinSection = () => {
  const [activeTab, setActiveTab] = useState('Projects');
  const [activeProjects, setActiveProjects] = useState([]);
  const [deletedProjects, setDeletedProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(getDashboardProjectId());
  const [items, setItems] = useState([]);
  const [issuePage, setIssuePage] = useState(0);
  const [issueTotalPages, setIssueTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [restoringId, setRestoringId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const projectOptions = useMemo(() => {
    const unique = new Map();
    [...activeProjects, ...deletedProjects].forEach((project) => {
      const id = getItemId(project);
      if (id) unique.set(String(id), { ...project, id: String(id) });
    });
    return [...unique.values()];
  }, [activeProjects, deletedProjects]);

  const loadProjectOptions = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const [projectsResult, deletedResult] = await Promise.allSettled([getMyProjects(), getDeletedProjects()]);
      const active = projectsResult.status === 'fulfilled' ? unwrapProjects(projectsResult.value) : [];
      const deleted = deletedResult.status === 'fulfilled' ? normalizeDeletedItems(deletedResult.value) : [];
      setActiveProjects(active);
      setDeletedProjects(deleted);
      setSelectedProjectId((current) => {
        const all = [...active, ...deleted];
        if (all.some((project) => String(getItemId(project)) === String(current))) return String(current);
        const dashboardId = getDashboardProjectId();
        if (all.some((project) => String(getItemId(project)) === String(dashboardId))) return String(dashboardId);
        return String(getItemId(all[0]) || '');
      });
      if (deletedResult.status === 'rejected' && projectsResult.status === 'rejected') {
        setError(deletedResult.reason?.response?.data?.message || 'Could not load deleted projects.');
      }
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      if (activeTab === 'Projects') {
        setItems(normalizeDeletedItems(await getDeletedProjects()));
        setIssueTotalPages(0);
      } else if (!selectedProjectId) {
        setItems([]);
        setIssueTotalPages(0);
      } else if (activeTab === 'Issues') {
        const result = await getDeletedIssues(selectedProjectId, issuePage, 20);
        setItems(normalizeDeletedItems(result));
        setIssueTotalPages(Number(result?.totalPages ?? result?.data?.totalPages) || 0);
      } else {
        const result = activeTab === 'Sprints'
          ? await getDeletedSprints(selectedProjectId)
          : await getDeletedMilestones(selectedProjectId);
        setItems(normalizeDeletedItems(result));
        setIssueTotalPages(0);
      }
    } catch (err) {
      setItems([]);
      setError(err.response?.data?.message || err.message || `Could not load deleted ${activeTab.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedProjectId, issuePage]);

  useEffect(() => { loadProjectOptions(); }, [loadProjectOptions]);
  useEffect(() => { loadItems(); }, [loadItems]);

  const selectTab = (tab) => {
    setActiveTab(tab);
    setIssuePage(0);
  };

  const restoreItem = async (item) => {
    const id = getItemId(item, activeTab);
    if (!id || restoringId) return;
    setRestoringId(String(id));
    setError('');
    setNotice('');
    try {
      if (activeTab === 'Projects') await restoreDeletedProject(id);
      else if (activeTab === 'Issues') await restoreDeletedIssue(id);
      else if (activeTab === 'Sprints') await restoreDeletedSprint(id);
      else await restoreDeletedMilestone(id);
      setNotice(`${getItemTitle(item, activeTab)} restored.`);
      await loadItems();
      if (activeTab === 'Projects') await loadProjectOptions();
    } catch (err) {
      setError(err.response?.data?.message || err.message || `Could not restore this ${activeTab.slice(0, -1).toLowerCase()}.`);
    } finally {
      setRestoringId('');
    }
  };

  const projectName = (project) => project?.name || project?.title || `Project ${String(getItemId(project) || '').slice(0, 8)}`;

  return (
    <section className="bg-white dark:bg-[#2a2a2a] rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-6 sm:py-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 rounded-full text-slate-600 dark:text-white flex items-center justify-center shrink-0"><FiArchive size={20} /></div>
          <div className="min-w-0"><h2 className="text-base font-bold text-slate-900 dark:text-white">Recycle Bin</h2><p className="text-xs text-slate-500 dark:text-[#94a3b8] mt-0.5">Restore deleted projects and project items.</p></div>
        </div>
        <button type="button" onClick={() => { loadProjectOptions(); loadItems(); }} disabled={loading || loadingProjects} aria-label="Refresh recycle bin" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-[#404040] dark:text-slate-300 dark:hover:bg-[#303030]"><FiRefreshCw size={14} className={loading || loadingProjects ? 'animate-spin' : ''} /> Refresh</button>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/60 p-4 dark:border-[#383838] dark:bg-[#202020] sm:p-5">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Deleted item type">{TABS.map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => selectTab(tab)} className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${activeTab === tab ? 'bg-slate-900 text-white dark:bg-sky-600' : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-[#2a2a2a] dark:text-slate-300 dark:hover:bg-[#303030]'}`}>{tab}{tab === 'Projects' && deletedProjects.length > 0 ? ` (${deletedProjects.length})` : ''}</button>)}</div>

        {activeTab !== 'Projects' && <div className="mt-4 flex flex-wrap items-center gap-3"><label htmlFor="recycle-bin-project" className="text-xs font-semibold text-slate-600 dark:text-slate-300">Project</label><select id="recycle-bin-project" value={selectedProjectId} onChange={(event) => { setSelectedProjectId(event.target.value); setIssuePage(0); }} disabled={loadingProjects || projectOptions.length === 0} className="min-w-[220px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-sky-400 dark:border-[#404040] dark:bg-[#2a2a2a] dark:text-white">{projectOptions.length === 0 ? <option value="">No projects available</option> : projectOptions.map((project) => <option key={project.id} value={project.id}>{projectName(project)}{project.deletedAt ? ' (deleted)' : ''}</option>)}</select></div>}

        {error && <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300"><FiAlertCircle size={15} className="mt-0.5 shrink-0" />{error}</div>}
        {notice && <div role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"><FiCheckCircle size={15} />{notice}</div>}

        {loading || loadingProjects ? <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-white py-10 text-xs text-slate-500 dark:bg-[#2a2a2a] dark:text-slate-400"><FiRefreshCw size={15} className="animate-spin" />Loading deleted items…</div> : items.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center dark:border-[#404040] dark:bg-[#2a2a2a]"><FiArchive size={23} className="mx-auto text-slate-300 dark:text-slate-600" /><p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Nothing to restore</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Deleted {activeTab.toLowerCase()} will appear here.</p></div> : <div className="mt-4 space-y-2">{items.map((item, index) => { const id = getItemId(item, activeTab) || `${activeTab}-${index}`; return <div key={id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-[#383838] dark:bg-[#2a2a2a]"><div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-[#343434] dark:text-slate-300">{activeTab === 'Projects' ? <FiFolder size={16} /> : <FiArchive size={16} />}</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{getItemTitle(item, activeTab)}</p><p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{formatDeletedAt(item.deletedAt || item.deletedOn || item.updatedAt)}{item.projectName ? ` · ${item.projectName}` : ''}</p></div></div><button type="button" onClick={() => restoreItem(item)} disabled={Boolean(restoringId)} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60">{restoringId === String(id) ? <FiRefreshCw size={13} className="animate-spin" /> : <FiRotateCcw size={13} />}{restoringId === String(id) ? 'Restoring…' : 'Restore'}</button></div>; })}</div>}

        {activeTab === 'Issues' && issueTotalPages > 1 && <div className="mt-4 flex items-center justify-between"><button type="button" onClick={() => setIssuePage((value) => Math.max(0, value - 1))} disabled={issuePage <= 0 || loading} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-40 dark:text-slate-300 dark:hover:bg-[#303030]"><FiChevronLeft size={14} /> Previous</button><span className="text-xs text-slate-500 dark:text-slate-400">Page {issuePage + 1} of {issueTotalPages}</span><button type="button" onClick={() => setIssuePage((value) => Math.min(issueTotalPages - 1, value + 1))} disabled={issuePage >= issueTotalPages - 1 || loading} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-white disabled:opacity-40 dark:text-slate-300 dark:hover:bg-[#303030]">Next <FiChevronRight size={14} /></button></div>}
      </div>
    </section>
  );
};

export default RecycleBinSection;
