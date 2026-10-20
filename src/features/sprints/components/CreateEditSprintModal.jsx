import { useState } from 'react';
import { FiX } from 'react-icons/fi';
import { createSprint, updateSprint, getFriendlyErrorMessage } from '../services/sprintsApi';

const SprintModalForm = ({
  onClose,
  projectId,
  projectName,
  sprintToEdit,
  onSprintSaved,
}) => {
  const isEditing = Boolean(sprintToEdit?.id || sprintToEdit?._id);

  const [name, setName] = useState(sprintToEdit?.name || '');
  const [goal, setGoal] = useState(sprintToEdit?.goal || '');
  const [startDate, setStartDate] = useState(
    sprintToEdit?.startDate ? String(sprintToEdit.startDate).slice(0, 10) : ''
  );
  const [endDate, setEndDate] = useState(
    sprintToEdit?.endDate ? String(sprintToEdit.endDate).slice(0, 10) : ''
  );
  const [milestoneId, setMilestoneId] = useState(sprintToEdit?.milestoneId || sprintToEdit?.milestone?.id || '');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const cleanName = name.trim();
    if (!cleanName || !startDate || !endDate) {
      setFormError('Sprint name, start date, and end date are required.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setFormError('End date must be on or after start date.');
      return;
    }

    const payload = {
      name: cleanName,
      goal: goal.trim(),
      startDate,
      endDate,
      ...(milestoneId.trim() ? { milestoneId: milestoneId.trim() } : {}),
    };

    setIsSaving(true);
    try {
      let saved;
      if (isEditing) {
        const id = sprintToEdit.id || sprintToEdit._id;
        saved = await updateSprint(id, payload);
      } else {
        saved = await createSprint(projectId, payload);
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
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-[#303030] dark:bg-[#1a1a1d] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-[#2b2b2e]">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">
              {isEditing ? 'Edit Sprint' : 'Create New Sprint'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#999]">{projectName}</p>
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Sprint Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Sprint 1: Project Setup"
              maxLength={120}
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white dark:border-[#35353a] dark:bg-[#222226] dark:text-white dark:focus:border-sky-400"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Goal <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What are the key goals and delivery outcomes for this sprint?"
              rows={2}
              maxLength={500}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white dark:border-[#35353a] dark:bg-[#222226] dark:text-white dark:focus:border-sky-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white dark:border-[#35353a] dark:bg-[#222226] dark:text-white dark:focus:border-sky-400"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                End Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white dark:border-[#35353a] dark:bg-[#222226] dark:text-white dark:focus:border-sky-400"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Milestone ID <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
              placeholder="e.g., milestone-v1"
              maxLength={80}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white dark:border-[#35353a] dark:bg-[#222226] dark:text-white dark:focus:border-sky-400"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-[#2b2b2e]">
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
              className="rounded-xl bg-sky-600 px-5 py-2 font-semibold text-white hover:bg-sky-700 dark:bg-blue-600 dark:hover:bg-blue-500 cursor-pointer disabled:opacity-50"
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
      projectName={projectName}
      sprintToEdit={sprintToEdit}
      onSprintSaved={onSprintSaved}
    />
  );
};

export default CreateEditSprintModal;
