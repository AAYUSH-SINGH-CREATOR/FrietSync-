import { useEffect, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { createSprint, updateSprint, getFriendlyErrorMessage } from '../services/sprintsApi';
import { getProjectIssues, normalizeIssuePage, updateIssue } from '../../issues/services/issueApi';

const getTodayDateValue = () => {
  const today = new Date();
  return new Date(today.getTime() - today.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

const formatProjectDate = (dateValue) => {
  if (!dateValue) return 'Not set';
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? 'Not set' : date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const SprintModalForm = ({
  onClose,
  projectId,
  projects = [],
  projectName,
  sprintToEdit,
  onSprintSaved,
}) => {
  const isEditing = Boolean(sprintToEdit?.id || sprintToEdit?._id);
  const [formProjectId, setFormProjectId] = useState(projectId || '');
  const selectedProject = projects.find((project) => String(project.id || project.projectId || project._id) === String(formProjectId));

  const [name, setName] = useState(sprintToEdit?.name || '');
  const [goal, setGoal] = useState(sprintToEdit?.goal || '');
  const [startDate, setStartDate] = useState(
    sprintToEdit?.startDate ? String(sprintToEdit.startDate).slice(0, 10) : getTodayDateValue()
  );
  const [endDate, setEndDate] = useState(
    sprintToEdit?.endDate ? String(sprintToEdit.endDate).slice(0, 10) : ''
  );
  const [projectIssues, setProjectIssues] = useState([]);
  const [selectedIssueId, setSelectedIssueId] = useState('');
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setFormProjectId(projectId || '');
  }, [projectId]);

  useEffect(() => {
    if (!formProjectId) {
      setProjectIssues([]);
      return;
    }
    let isCurrent = true;
    setIsLoadingIssues(true);
    getProjectIssues(formProjectId, { page: 0, size: 50 })
      .then((response) => {
        if (isCurrent) setProjectIssues(normalizeIssuePage(response, { page: 0, size: 50 }).items);
      })
      .catch(() => { if (isCurrent) setProjectIssues([]); })
      .finally(() => {
        if (isCurrent) setIsLoadingIssues(false);
      });
    return () => { isCurrent = false; };
  }, [formProjectId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const cleanName = name.trim();
    const cleanGoal = goal.trim();
    if (!isEditing && !formProjectId) {
      setFormError('Select a project before creating a sprint.');
      return;
    }
    if (!cleanName || !cleanGoal || !startDate || !endDate) {
      setFormError('Please fill in the sprint name, goal, and dates.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setFormError('End date must be on or after start date.');
      return;
    }

    const payload = {
      name: cleanName,
      goal: cleanGoal,
      startDate,
      endDate,
    };
    const retainedMilestoneId = sprintToEdit?.milestoneId || sprintToEdit?.milestone?.id;
    if (isEditing && retainedMilestoneId) payload.milestoneId = retainedMilestoneId;

    setIsSaving(true);
    try {
      let saved;
      if (isEditing) {
        const id = sprintToEdit.id || sprintToEdit._id;
        saved = await updateSprint(id, payload);
      } else {
        saved = await createSprint(formProjectId, payload);
        const createdSprint = saved?.sprint || saved?.data || saved;
        const createdSprintId = createdSprint?.id || createdSprint?.sprintId || createdSprint?._id;
        if (selectedIssueId && createdSprintId) {
          await updateIssue(selectedIssueId, { sprintId: createdSprintId });
        }
      }
      onSprintSaved?.(saved);
      onClose();
    } catch (err) {
      setFormError(getFriendlyErrorMessage(err, 'sprint'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-7xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-[#303030] dark:bg-[#1a1a1d] max-h-[94vh] overflow-y-auto sm:p-7 lg:p-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-[#2b2b2e]">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">
              {isEditing ? 'Edit Sprint' : 'Create New Sprint'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#999]">{selectedProject?.name || projectName}</p>
          </div>
          <button type="button" onClick={onClose} disabled={isSaving} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#252528] cursor-pointer">
            <FiX size={18} />
          </button>
        </div>

        {formError && (
          <div className="mt-3 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-5 text-xs">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:gap-6">
          <section className="rounded-2xl bg-slate-50/80 p-4 sm:p-5 dark:bg-[#202024]">
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">Project and issues</h4>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Choose a project, then select an issue to include in this sprint.</p>
            </div>
          {!isEditing && projects.length > 0 && (
            <div>
              <label className="mb-1.5 mt-4 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Project
              </label>
              <select
                value={formProjectId}
                onChange={(event) => {
                  setFormProjectId(event.target.value);
                  setSelectedIssueId('');
                  setFormError('');
                }}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 dark:border-[#35353a] dark:bg-[#1b1b1f] dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
              >
                <option value="" className="bg-white text-slate-900 dark:bg-[#222226] dark:text-white">Select a project</option>
                {projects.map((project) => {
                  const id = project.id || project.projectId || project._id;
                  return id ? <option key={id} value={id} className="bg-white text-slate-900 dark:bg-[#222226] dark:text-white">{project.name || 'Untitled project'}</option> : null;
                })}
              </select>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-white px-3.5 py-3 dark:bg-[#1b1b1f]">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Project start</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-200">{formatProjectDate(selectedProject?.startDate)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Project end</p>
              <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-200">{formatProjectDate(selectedProject?.targetEndDate || selectedProject?.endDate)}</p>
            </div>
          </div>

          <div className="mt-5">
            <h5 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Issues <span className="font-normal text-slate-400">(optional)</span></h5>
            <div className="max-h-48 space-y-2 overflow-y-auto overscroll-contain pr-1">
              {isLoadingIssues ? (
                <div className="space-y-2">{[0, 1].map((index) => <div key={index} className="h-[70px] animate-pulse rounded-xl bg-white dark:bg-[#1b1b1f]" />)}</div>
              ) : projectIssues.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 px-3 py-5 text-center text-xs text-slate-500 dark:border-[#3a3a42] dark:bg-[#1b1b1f] dark:text-slate-400">
                  {formProjectId ? 'No issues found for this project.' : 'Select a project to view its issues.'}
                </div>
              ) : projectIssues.map((issue, index) => {
                const issueId = issue.id || issue._id || issue.issueId;
                const isSelected = String(selectedIssueId) === String(issueId);
                const issueNumber = issue.issueNumber || issue.key || (issueId ? String(issueId).slice(0, 8) : index + 1);
                return (
                  <button
                    key={issueId || index}
                    type="button"
                    onClick={() => setSelectedIssueId(isSelected ? '' : String(issueId))}
                    className={`w-full rounded-xl border px-3.5 py-3 text-left transition ${isSelected ? 'border-sky-400 bg-sky-50 dark:border-sky-500 dark:bg-sky-950/20' : 'border-slate-200 bg-white hover:border-sky-300 dark:border-[#35353d] dark:bg-[#1b1b1f] dark:hover:border-sky-700'}`}
                  >
                    <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200">Issue {issueNumber}</span>
                    <span className="mt-0.5 block truncate text-sm text-slate-600 dark:text-slate-400">{issue.title || issue.name || 'Untitled issue'}</span>
                  </button>
                );
              })}
            </div>
          </div>
          </section>

          <section>
            <div className="mb-4">
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">Sprint details</h4>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Set the sprint name, goal, and schedule.</p>
            </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Sprint Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Sprint 1: Project Setup"
              maxLength={120}
              required
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 dark:border-[#35353a] dark:bg-[#222226] dark:text-white dark:focus:border-sky-400 dark:focus:bg-[#222226] placeholder:text-slate-400 dark:placeholder:text-[#888]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Goal <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What are the key goals and delivery outcomes for this sprint?"
              rows={2}
              maxLength={500}
              required
              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 dark:border-[#35353a] dark:bg-[#222226] dark:text-white dark:focus:border-sky-400 dark:focus:bg-[#222226] placeholder:text-slate-400 dark:placeholder:text-[#888]"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 dark:border-[#35353a] dark:bg-[#222226] dark:text-white dark:focus:border-sky-400 dark:focus:bg-[#222226] [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                End Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 dark:border-[#35353a] dark:bg-[#222226] dark:text-white dark:focus:border-sky-400 dark:focus:bg-[#222226] [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
          </div>

          </section>
          </div>

          <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4 dark:border-[#2b2b2e]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50 dark:border-[#35353a] dark:text-[#bbb] dark:hover:bg-[#252528] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-sky-600 px-5 py-2 font-semibold text-white hover:bg-sky-700 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : isEditing ? 'Update Sprint' : 'Create Sprint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CreateEditSprintModal = ({
  isOpen,
  onClose,
  projectId,
  projects = [],
  projectName = 'Selected project',
  sprintToEdit = null,
  onSprintSaved,
}) => {
  if (!isOpen) return null;

  return (
    <SprintModalForm
      key={sprintToEdit ? sprintToEdit.id || sprintToEdit._id : 'new-sprint'}
      onClose={onClose}
      projectId={projectId}
      projects={projects}
      projectName={projectName}
      sprintToEdit={sprintToEdit}
      onSprintSaved={onSprintSaved}
    />
  );
};

export default CreateEditSprintModal;
