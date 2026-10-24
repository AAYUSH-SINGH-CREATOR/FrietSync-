import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FiX,
  FiPlus,
  FiFolder,
  FiCalendar,
  FiClock,
  FiAlertCircle,
  FiFlag,
  FiCheck,
} from 'react-icons/fi';
import { createIssue } from '../services/issueApi';
import { getMyProjects } from '../../projects/services/projectApi';
import { PRIORITY_OPTIONS } from '../utils/issueUtils';
import { getFriendlyErrorMessage } from '../../../utils/errorHandler';

const CreateIssueModal = ({
  isOpen,
  onClose,
  projects = [],
  defaultProjectId = '',
  onIssueCreated,
}) => {
  const [fetchedProjects, setFetchedProjects] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  const availableProjects = useMemo(() => {
    return projects && projects.length > 0 ? projects : fetchedProjects;
  }, [projects, fetchedProjects]);

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const projectId = selectedProjectId || defaultProjectId || availableProjects[0]?.id || availableProjects[0]?._id || '';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('HIGH');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load projects if not passed via props and modal opens
  useEffect(() => {
    if (!isOpen || (projects && projects.length > 0)) return;

    let isMounted = true;
    getMyProjects()
      .then((list) => {
        if (!isMounted) return;
        setFetchedProjects(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!isMounted) return;
        setFetchedProjects([]);
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoadingProjects(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, projects]);

  const resetForm = useCallback(() => {
    setSelectedProjectId('');
    setTitle('');
    setDescription('');
    setPriority('HIGH');
    setDueDate('');
    setEstimatedHours('');
    setFieldErrors({});
    setErrorMessage('');
    setIsSubmitting(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = {};
    if (!projectId) {
      errors.projectId = 'Please select a project for this issue.';
    }
    if (!title.trim()) {
      errors.title = 'Issue title is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const created = await createIssue(projectId, {
        title: title.trim(),
        description: description.trim(),
        priority,
        dueDate: dueDate || '',
        estimatedHours: estimatedHours !== '' ? Number(estimatedHours) : 0,
      });

      handleClose();

      if (onIssueCreated) {
        onIssueCreated(created, projectId);
      }
    } catch (err) {
      setErrorMessage(getFriendlyErrorMessage(err, 'issue'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/45 dark:bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#171717] rounded-3xl shadow-2xl dark:shadow-black/70 border border-slate-100 dark:border-[#303030] p-6 sm:p-7 max-h-[92vh] overflow-y-auto no-scrollbar transition-all text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-[#303030] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-blue-950/40 text-sky-600 dark:text-[#60A5FA] flex items-center justify-center shadow-2xs shrink-0">
              <FiPlus size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-[#F1F5F9] tracking-tight">
                Create New Issue
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#b3b3b3]">
                Add a task, bug report, or feature request to your project.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close modal"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 dark:text-[#b3b3b3] hover:text-slate-700 dark:hover:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-[#242424] transition cursor-pointer shrink-0 ml-4"
          >
            <FiX size={19} />
          </button>
        </div>

        {/* Global Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-[#F87171] text-xs flex items-center gap-2">
            <FiAlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Selection */}
          <div>
            <label
              htmlFor="issue-project"
              className="block text-xs font-bold text-slate-800 dark:text-[#e0e0e0] uppercase tracking-wider mb-1.5"
            >
              Project <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-[#b3b3b3]">
                <FiFolder size={16} />
              </span>
              <select
                id="issue-project"
                value={projectId}
                disabled={isLoadingProjects || isSubmitting}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  if (fieldErrors.projectId) {
                    setFieldErrors((prev) => ({ ...prev, projectId: '' }));
                  }
                }}
                className={`w-full pl-10 pr-9 py-2.5 rounded-xl border ${
                  fieldErrors.projectId
                    ? 'border-rose-500 dark:border-rose-500'
                    : 'border-slate-200 dark:border-[#3a3a3a]'
                } bg-white dark:bg-[#242424] text-slate-900 dark:text-[#F1F5F9] text-xs sm:text-sm focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950/40 transition appearance-none cursor-pointer`}
              >
                {availableProjects.length === 0 ? (
                  <option value="">
                    {isLoadingProjects ? 'Loading projects...' : 'No projects found'}
                  </option>
                ) : (
                  availableProjects.map((p) => {
                    const pid = p.id || p._id || p.projectId;
                    return (
                      <option key={pid} value={pid} className="dark:bg-[#242424]">
                        {p.name || 'Untitled Project'}
                      </option>
                    );
                  })
                )}
              </select>
            </div>
            {fieldErrors.projectId && (
              <p className="text-[11px] text-rose-500 mt-1">{fieldErrors.projectId}</p>
            )}
          </div>

          {/* Issue Title */}
          <div>
            <label
              htmlFor="issue-title"
              className="block text-xs font-bold text-slate-800 dark:text-[#e0e0e0] uppercase tracking-wider mb-1.5"
            >
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              id="issue-title"
              type="text"
              autoFocus
              required
              placeholder="e.g. Fix login issue with special characters"
              value={title}
              disabled={isSubmitting}
              onChange={(e) => {
                setTitle(e.target.value);
                if (fieldErrors.title) {
                  setFieldErrors((prev) => ({ ...prev, title: '' }));
                }
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl border ${
                fieldErrors.title
                  ? 'border-rose-500 dark:border-rose-500'
                  : 'border-slate-200 dark:border-[#3a3a3a]'
              } bg-white dark:bg-[#242424] text-slate-900 dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder-[#858585] text-xs sm:text-sm focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950/40 transition`}
            />
            {fieldErrors.title && (
              <p className="text-[11px] text-rose-500 mt-1">{fieldErrors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="issue-description"
              className="block text-xs font-bold text-slate-800 dark:text-[#e0e0e0] uppercase tracking-wider mb-1.5"
            >
              Description <span className="text-slate-400 lowercase font-normal">(optional)</span>
            </label>
            <textarea
              id="issue-description"
              rows={3}
              placeholder="Describe the issue, reproduction steps, or expected behavior..."
              value={description}
              disabled={isSubmitting}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#3a3a3a] bg-white dark:bg-[#242424] text-slate-900 dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder-[#858585] text-xs sm:text-sm focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950/40 transition resize-y"
            />
          </div>

          {/* Priority & Due Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Priority */}
            <div>
              <label
                htmlFor="issue-priority"
                className="block text-xs font-bold text-slate-800 dark:text-[#e0e0e0] uppercase tracking-wider mb-1.5"
              >
                Priority
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-[#b3b3b3]">
                  <FiFlag size={15} />
                </span>
                <select
                  id="issue-priority"
                  value={priority}
                  disabled={isSubmitting}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-[#3a3a3a] bg-white dark:bg-[#242424] text-slate-900 dark:text-[#F1F5F9] text-xs sm:text-sm focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950/40 transition appearance-none cursor-pointer"
                >
                  {PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="dark:bg-[#242424]">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Estimated Hours */}
            <div>
              <label
                htmlFor="issue-hours"
                className="block text-xs font-bold text-slate-800 dark:text-[#e0e0e0] uppercase tracking-wider mb-1.5"
              >
                Estimated Hours <span className="text-slate-400 lowercase font-normal">(optional)</span>
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-[#b3b3b3]">
                  <FiClock size={15} />
                </span>
                <input
                  id="issue-hours"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="e.g. 3"
                  value={estimatedHours}
                  disabled={isSubmitting}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#3a3a3a] bg-white dark:bg-[#242424] text-slate-900 dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder-[#858585] text-xs sm:text-sm focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950/40 transition"
                />
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="issue-due-date"
              className="block text-xs font-bold text-slate-800 dark:text-[#e0e0e0] uppercase tracking-wider mb-1.5"
            >
              Due Date <span className="text-slate-400 lowercase font-normal">(optional)</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-[#b3b3b3]">
                <FiCalendar size={15} />
              </span>
              <input
                id="issue-due-date"
                type="date"
                value={dueDate}
                disabled={isSubmitting}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#3a3a3a] bg-white dark:bg-[#242424] text-slate-900 dark:text-[#F1F5F9] text-xs sm:text-sm focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950/40 transition"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-[#303030]">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#3a3a3a] text-slate-600 dark:text-[#e0e0e0] hover:bg-slate-50 dark:hover:bg-[#242424] text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !projectId || !title.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-semibold text-xs shadow-md shadow-sky-600/20 dark:shadow-blue-900/30 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <FiCheck size={15} />
                  <span>Create Issue</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateIssueModal;

