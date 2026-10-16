import { useCallback, useEffect, useState } from 'react';
import {
  FiAlertCircle,
  FiCalendar,
  FiCheck,
  FiChevronRight,
  FiEdit2,
  FiFlag,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
  FiX,
} from 'react-icons/fi';
import { getMyProjects } from '../../projects/services/projectApi';
import {
  completeSprint,
  createSprint,
  deleteSprint,
  getProjectSprints,
  getSprintById,
  startSprint,
  updateSprint,
} from '../services/sprintsApi';
import { getFriendlyErrorMessage } from '../../../utils/errorHandler';
import DashboardDialog from '../../dashboard/components/DashboardDialog';

const getCollection = (value, keys) => {
  const containers = [value, value?.data, value?.result];
  for (const container of containers) {
    if (Array.isArray(container)) return container;
    if (container && typeof container === 'object') {
      for (const key of keys) {
        if (Array.isArray(container[key])) return container[key];
      }
    }
  }
  return [];
};

const unwrapRecord = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  if (value.sprint) return value.sprint;
  if (value.data && typeof value.data === 'object') return unwrapRecord(value.data);
  return value;
};

const getProjectId = (project) => project?.id || project?.projectId || project?._id;
const getSprintId = (sprint) => sprint?.id || sprint?.sprintId || sprint?._id;
const formatDate = (value) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const panelClass = 'rounded-2xl border border-slate-200 bg-white dark:border-[#293548] dark:bg-[#172033]';
const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100 dark:border-[#334155] dark:bg-[#1E293B] dark:text-[#F1F5F9] dark:placeholder:text-[#64748B] dark:focus:border-[#60A5FA] dark:focus:ring-blue-900/30';
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#334155] dark:text-[#CBD5E1] dark:hover:bg-[#1E293B]';
const primaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500';

const SprintsView = () => {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState('');
  const [sprints, setSprints] = useState([]);
  const [sprintsLoading, setSprintsLoading] = useState(false);
  const [sprintsError, setSprintsError] = useState('');
  const [selectedSprintId, setSelectedSprintId] = useState('');
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingSprintId, setEditingSprintId] = useState('');
  const [form, setForm] = useState({ name: '', goal: '', startDate: '', endDate: '', milestoneId: '' });
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [notice, setNotice] = useState('');
  const [projectRefreshTrigger, setProjectRefreshTrigger] = useState(0);
  const [sprintRefreshTrigger, setSprintRefreshTrigger] = useState(0);
  const [detailRefreshTrigger, setDetailRefreshTrigger] = useState(0);

  const currentProject = projects.find((project) => String(getProjectId(project)) === projectId);

  useEffect(() => {
    let isMounted = true;
    getMyProjects()
      .then((response) => {
        if (!isMounted) return;
        const records = getCollection(response, ['projects', 'items', 'content', 'results']);
        setProjects(records);
        setProjectId((currentId) =>
          currentId && records.some((project) => String(getProjectId(project)) === currentId)
            ? currentId
            : getProjectId(records[0])
            ? String(getProjectId(records[0]))
            : ''
        );
        setProjectsError('');
      })
      .catch((error) => {
        if (!isMounted) return;
        setProjects([]);
        setProjectsError(getFriendlyErrorMessage(error, 'project'));
      })
      .finally(() => {
        if (isMounted) setProjectsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [projectRefreshTrigger]);

  useEffect(() => {
    if (!projectId) return;

    let isMounted = true;
    getProjectSprints(projectId)
      .then((response) => {
        if (!isMounted) return;
        setSprints(getCollection(response, ['sprints', 'items', 'content', 'results']));
        setSprintsError('');
      })
      .catch((error) => {
        if (!isMounted) return;
        setSprints([]);
        setSprintsError(getFriendlyErrorMessage(error, 'sprint'));
      })
      .finally(() => {
        if (isMounted) setSprintsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [projectId, sprintRefreshTrigger]);

  useEffect(() => {
    if (!selectedSprintId) return;

    let isMounted = true;
    getSprintById(selectedSprintId)
      .then((response) => {
        if (!isMounted) return;
        setSelectedSprint(unwrapRecord(response));
        setDetailError('');
      })
      .catch((error) => {
        if (!isMounted) return;
        setDetailError(getFriendlyErrorMessage(error, 'sprint'));
      })
      .finally(() => {
        if (isMounted) setDetailLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedSprintId, detailRefreshTrigger]);

  const loadProjects = useCallback(() => {
    setProjectsLoading(true);
    setProjectRefreshTrigger((v) => v + 1);
  }, []);

  const loadSprints = useCallback(() => {
    setSprintsLoading(true);
    setSprintRefreshTrigger((v) => v + 1);
  }, []);

  const loadSprintDetails = useCallback(() => {
    setDetailLoading(true);
    setDetailRefreshTrigger((v) => v + 1);
  }, []);

  const openCreateForm = () => {
    setEditingSprintId('');
    setForm({ name: '', goal: '', startDate: '', endDate: '', milestoneId: '' });
    setFormError('');
    setFormOpen(true);
  };

  const sprintStatus = String(selectedSprint?.status || selectedSprint?.state || '').trim().toUpperCase();
  const isCompleted = ['COMPLETED', 'CLOSED', 'DONE'].includes(sprintStatus);

  const openEditForm = () => {
    if (!selectedSprint || isCompleted) return;
    setEditingSprintId(selectedSprintId);
    setForm({
      name: selectedSprint.name || '',
      goal: selectedSprint.goal || '',
      startDate: selectedSprint.startDate ? String(selectedSprint.startDate).slice(0, 10) : '',
      endDate: selectedSprint.endDate ? String(selectedSprint.endDate).slice(0, 10) : '',
      milestoneId: selectedSprint.milestoneId || selectedSprint.milestone?.id || '',
    });
    setFormError('');
    setFormOpen(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const name = form.name.trim();
    if (!name || !form.startDate || !form.endDate) {
      setFormError('Name, start date, and end date are required.');
      return;
    }
    if (new Date(form.startDate) > new Date(form.endDate)) {
      setFormError('The end date must be on or after the start date.');
      return;
    }

    const payload = {
      name,
      goal: form.goal.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      ...(form.milestoneId.trim() ? { milestoneId: form.milestoneId.trim() } : {}),
    };

    setIsSaving(true);
    setFormError('');
    try {
      if (editingSprintId) {
        await updateSprint(editingSprintId, payload);
        setSelectedSprint((current) => current ? { ...current, ...payload } : current);
        setNotice('Sprint updated.');
      } else {
        const created = await createSprint(projectId, payload);
        const record = unwrapRecord(created);
        if (getSprintId(record)) setSelectedSprintId(String(getSprintId(record)));
        setNotice('Sprint created.');
      }
      setFormOpen(false);
      await loadSprints();
    } catch (error) {
      setFormError(getFriendlyErrorMessage(error, 'sprint'));
    } finally {
      setIsSaving(false);
    }
  };

  const runLifecycleAction = async (action, successText, confirmText) => {
    if (!selectedSprintId) return;
    if (confirmText && !window.confirm(confirmText)) return;
    setBusyAction('lifecycle');
    setDetailError('');
    try {
      await action(selectedSprintId);
      setNotice(successText);
      await Promise.all([loadSprintDetails(), loadSprints()]);
    } catch (error) {
      setDetailError(getFriendlyErrorMessage(error, 'sprint'));
    } finally {
      setBusyAction('');
    }
  };

  const handleDelete = async () => {
    if (!selectedSprintId || !window.confirm('Delete this sprint? This action cannot be undone.')) return;
    setBusyAction('delete');
    setDetailError('');
    try {
      await deleteSprint(selectedSprintId);
      setSelectedSprintId('');
      setSelectedSprint(null);
      setNotice('Sprint deleted.');
      await loadSprints();
    } catch (error) {
      setDetailError(getFriendlyErrorMessage(error, 'sprint'));
    } finally {
      setBusyAction('');
    }
  };

  return (
    <div className="space-y-5 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">Planning</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-[#F1F5F9] sm:text-3xl">Sprints</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-[#94A3B8]">Plan a focused delivery window for a project.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonClass} onClick={() => Promise.all([loadProjects(), loadSprints()])} disabled={projectsLoading || sprintsLoading}><FiRefreshCw className={projectsLoading || sprintsLoading ? 'animate-spin' : ''} size={15} />Refresh</button>
          <button type="button" className={primaryButtonClass} onClick={openCreateForm} disabled={!projectId}><FiPlus size={15} />New sprint</button>
        </div>
      </header>

      {notice && <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Dismiss message"><FiX size={16} /></button></div>}
      {projectsError && <div className={`${panelClass} flex items-center justify-between gap-3 p-4`} role="alert"><p className="flex items-center gap-2 text-sm text-rose-700 dark:text-rose-300"><FiAlertCircle />{projectsError}</p><button type="button" className={buttonClass} onClick={loadProjects}>Retry</button></div>}

      <section className={`${panelClass} overflow-hidden`}>
        <div className="border-b border-slate-200 p-4 dark:border-[#293548]">
          <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-[#CBD5E1] sm:flex-row sm:items-center">
            Project
            <select className={`${inputClass} sm:w-80`} value={projectId} onChange={(event) => { setProjectId(event.target.value); setSelectedSprintId(''); setSelectedSprint(null); }} disabled={projectsLoading || projects.length === 0} aria-label="Select project">
              {!projects.length && <option value="">No projects available</option>}
              {projects.map((project) => <option key={getProjectId(project)} value={String(getProjectId(project))}>{project.name || 'Untitled project'}</option>)}
            </select>
          </label>
        </div>

        {!projectId && !projectsLoading ? <div className="px-6 py-14 text-center"><h2 className="font-semibold text-slate-800 dark:text-[#F1F5F9]">Create a project to plan sprints</h2><p className="mt-1 text-sm text-slate-500 dark:text-[#94A3B8]">Sprints are organized inside a project.</p></div>
          : sprintsLoading ? <p className="px-6 py-14 text-center text-sm text-slate-500 dark:text-[#94A3B8]" role="status">Loading sprints…</p>
            : sprintsError ? <div className="flex flex-col items-center gap-3 px-6 py-14 text-center" role="alert"><p className="text-sm text-rose-700 dark:text-rose-300">{sprintsError}</p><button type="button" className={buttonClass} onClick={loadSprints}>Retry</button></div>
              : sprints.length === 0 ? <div className="px-6 py-14 text-center"><h2 className="font-semibold text-slate-800 dark:text-[#F1F5F9]">No sprints yet</h2><p className="mt-1 text-sm text-slate-500 dark:text-[#94A3B8]">Create a sprint to plan a project delivery window.</p><button type="button" className={`${primaryButtonClass} mt-4`} onClick={openCreateForm}><FiPlus size={15} />New sprint</button></div>
                : <ul className="divide-y divide-slate-100 dark:divide-[#293548]">
                  {sprints.map((sprint, index) => {
                    const id = getSprintId(sprint);
                    const selected = String(id) === selectedSprintId;
                    return <li key={id || `${index}-${sprint.name || 'sprint'}`}>
                      <button type="button" className={`flex w-full items-start justify-between gap-4 px-4 py-4 text-left transition sm:px-5 ${selected ? 'bg-sky-50/70 dark:bg-[#1E3A5F]/40' : 'hover:bg-slate-50 dark:hover:bg-[#1E293B]/60'}`} onClick={() => { if (id) { setSelectedSprint(sprint); setSelectedSprintId(String(id)); setDetailLoading(true); } }} disabled={!id}>
                        <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900 dark:text-[#F1F5F9]">{sprint.name || 'Untitled sprint'}</span><span className="mt-1 block text-sm text-slate-500 dark:text-[#94A3B8]">{sprint.goal || 'No goal provided.'}</span><span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-[#94A3B8]"><span className="inline-flex items-center gap-1"><FiCalendar size={13} />{formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}</span>{sprint.milestoneName && <span className="inline-flex items-center gap-1"><FiFlag size={13} />{sprint.milestoneName}</span>}</span></span>
                        <span className="flex shrink-0 items-center gap-2">{(sprint.status || sprint.state) && <span className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 dark:border-[#334155] dark:text-[#CBD5E1]">{sprint.status || sprint.state}</span>}<FiChevronRight className="text-slate-400" size={16} /></span>
                      </button>
                    </li>;
                  })}
                </ul>}
      </section>

      <DashboardDialog isOpen={formOpen} onClose={() => setFormOpen(false)} ariaLabel={editingSprintId ? 'Edit sprint' : 'Create sprint'} showHeader={false} size="max-w-2xl" closeDisabled={isSaving}>
      {formOpen && <section className={`${panelClass} p-5 sm:p-6`}>
        <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-900 dark:text-[#F1F5F9]">{editingSprintId ? 'Edit sprint' : 'Create sprint'}</h2><p className="mt-1 text-sm text-slate-500 dark:text-[#94A3B8]">{currentProject?.name || 'Selected project'}</p></div><button type="button" className={buttonClass} onClick={() => setFormOpen(false)} aria-label="Close sprint form" disabled={isSaving}><FiX size={16} /></button></div>
        {formError && <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300" role="alert">{formError}</p>}
        <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-[#CBD5E1]">Sprint name <span className="text-rose-600">*</span></span><input className={inputClass} required maxLength={120} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></label>
          <label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-[#CBD5E1]">Goal</span><textarea className={`${inputClass} resize-y`} rows={3} value={form.goal} onChange={(event) => setForm((current) => ({ ...current, goal: event.target.value }))} /></label>
          <label><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-[#CBD5E1]">Start date <span className="text-rose-600">*</span></span><input type="date" className={inputClass} required value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} /></label>
          <label><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-[#CBD5E1]">End date <span className="text-rose-600">*</span></span><input type="date" className={inputClass} required value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} /></label>
          <label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-[#CBD5E1]">Milestone ID <span className="text-slate-400">(optional)</span></span><input className={inputClass} value={form.milestoneId} onChange={(event) => setForm((current) => ({ ...current, milestoneId: event.target.value }))} /></label>
          <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" className={buttonClass} onClick={() => setFormOpen(false)} disabled={isSaving}>Cancel</button><button type="submit" className={primaryButtonClass} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save sprint'}</button></div>
        </form>
      </section>}
      </DashboardDialog>

      <DashboardDialog isOpen={Boolean(selectedSprintId) && !formOpen} onClose={() => { setSelectedSprintId(''); setSelectedSprint(null); }} ariaLabel={selectedSprint?.name || 'Sprint details'} showHeader={false} size="max-w-3xl" closeDisabled={Boolean(busyAction)}>
      {selectedSprintId && !formOpen && <section className={`${panelClass} overflow-hidden`}>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 dark:border-[#293548] sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-[#94A3B8]">Sprint details</p>
              {isCompleted && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                  Completed
                </span>
              )}
            </div>
            <h2 className="mt-1 break-words text-xl font-semibold text-slate-900 dark:text-[#F1F5F9]">{selectedSprint?.name || 'Loading sprint…'}</h2>
            <p className="mt-1 break-all font-mono text-xs text-slate-500 dark:text-[#94A3B8]">{selectedSprintId}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonClass} onClick={loadSprintDetails} disabled={detailLoading || Boolean(busyAction)}><FiRefreshCw className={detailLoading ? 'animate-spin' : ''} size={14} />Refresh</button>
            {!isCompleted && (
              <>
                <button type="button" className={buttonClass} onClick={openEditForm} disabled={!selectedSprint || Boolean(busyAction)}><FiEdit2 size={14} />Edit</button>
                <button type="button" className={buttonClass} onClick={() => runLifecycleAction(startSprint, 'Sprint started.')} disabled={Boolean(busyAction)}><FiCheck size={14} />{busyAction === 'lifecycle' ? 'Working…' : 'Start'}</button>
                <button type="button" className={buttonClass} onClick={() => runLifecycleAction(completeSprint, 'Sprint completed.', 'Complete this sprint?')} disabled={Boolean(busyAction)}><FiCheck size={14} />Complete</button>
                <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/30" onClick={handleDelete} disabled={Boolean(busyAction)}><FiTrash2 size={14} />Delete</button>
              </>
            )}
            <button type="button" className={buttonClass} onClick={() => { setSelectedSprintId(''); setSelectedSprint(null); }} aria-label="Close sprint details" disabled={Boolean(busyAction)}><FiX size={15} />Close</button>
          </div>
        </div>
        {detailError && <div className="mx-5 mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300" role="alert">{detailError}</div>}
        {detailLoading ? <p className="p-5 text-sm text-slate-500 dark:text-[#94A3B8]" role="status">Loading sprint details…</p> : detailError ? <div className="p-5"><button type="button" className={buttonClass} onClick={loadSprintDetails}>Retry</button></div> : selectedSprint && <div className="grid gap-4 p-5 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-4 dark:bg-[#1E293B]"><p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-[#94A3B8]">Goal</p><p className="mt-2 whitespace-pre-wrap text-sm text-slate-800 dark:text-[#F1F5F9]">{selectedSprint.goal || 'No goal provided.'}</p></div><div className="rounded-xl bg-slate-50 p-4 dark:bg-[#1E293B]"><p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-[#94A3B8]">Schedule</p><p className="mt-2 text-sm text-slate-800 dark:text-[#F1F5F9]">{formatDate(selectedSprint.startDate)} – {formatDate(selectedSprint.endDate)}</p>{selectedSprint.milestoneId && <p className="mt-2 break-all text-xs text-slate-500 dark:text-[#94A3B8]">Milestone: {selectedSprint.milestoneId}</p>}</div>{(selectedSprint.status || selectedSprint.state) && <div className="rounded-xl bg-slate-50 p-4 dark:bg-[#1E293B]"><p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-[#94A3B8]">Status</p><p className="mt-2 text-sm font-medium text-slate-800 dark:text-[#F1F5F9]">{selectedSprint.status || selectedSprint.state}</p></div>}</div>}
      </section>}
      </DashboardDialog>
    </div>
  );
};

export default SprintsView;