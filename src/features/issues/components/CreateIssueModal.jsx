import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FiX,
  FiPlus,
  FiFolder,
  FiChevronDown,
  FiCalendar,
  FiClock,
  FiAlertCircle,
  FiFlag,
  FiCheck,
  FiGithub,
  FiLink,
} from 'react-icons/fi';
import { createIssue } from '../services/issueApi';
import { getMyProjects, getProjectMilestones } from '../../projects/services/projectApi';
import { PRIORITY_OPTIONS } from '../utils/issueUtils';
import { getFriendlyErrorMessage } from '../../../utils/errorHandler';

const getTodayDateValue = () => {
  const today = new Date();
  return new Date(today.getTime() - today.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

const formatProjectDate = (dateValue) => {
  if (!dateValue) return 'Not set';
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? 'Not set' : date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

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

  const selectedProject = availableProjects.find(
    (p) => String(p.id || p._id || p.projectId) === String(projectId)
  );

  // Milestones state for project
  const [projectMilestones, setProjectMilestones] = useState([]);
  const [isLoadingMilestones, setIsLoadingMilestones] = useState(false);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState('');

  // Issue details form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('HIGH');
  const [startDate, setStartDate] = useState(getTodayDateValue());
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [githubAction, setGithubAction] = useState('CREATE_NEW');
  const [githubIssueNumber, setGithubIssueNumber] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load projects if not passed via props and modal opens
  useEffect(() => {
    if (!isOpen || (projects && projects.length > 0)) return;

    let isMounted = true;
    setIsLoadingProjects(true);
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

  // Load milestones whenever active projectId changes
  useEffect(() => {
    if (!projectId) {
      setProjectMilestones([]);
      setSelectedMilestoneId('');
      return;
    }

    let isCurrent = true;
    setIsLoadingMilestones(true);
    getProjectMilestones(projectId)
      .then((res) => {
        if (!isCurrent) return;
        const candidates = [
          res,
          res?.data,
          res?.milestones,
          res?.data?.milestones,
          res?.items,
          res?.data?.items,
          res?.content,
          res?.data?.content,
        ];
        const list = candidates.find(Array.isArray) || [];
        setProjectMilestones(list);
      })
      .catch(() => {
        if (isCurrent) setProjectMilestones([]);
      })
      .finally(() => {
        if (isCurrent) setIsLoadingMilestones(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [projectId]);

  const resetForm = useCallback(() => {
    setSelectedProjectId('');
    setSelectedMilestoneId('');
    setTitle('');
    setDescription('');
    setPriority('HIGH');
    setStartDate(getTodayDateValue());
    setDueDate('');
    setEstimatedHours('');
    setGithubAction('CREATE_NEW');
    setGithubIssueNumber('');
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
    if (githubAction === 'LINK_EXISTING') {
      const num = Number(githubIssueNumber);
      if (!githubIssueNumber || isNaN(num) || num <= 0 || !Number.isInteger(num)) {
        errors.githubIssueNumber = 'Please enter a valid positive GitHub issue number (e.g. 42).';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        priority,
        githubAction,
      };

      if (startDate) {
        payload.startDate = startDate;
      }
      if (dueDate) {
        payload.dueDate = dueDate;
      }
      if (selectedMilestoneId) {
        payload.milestoneId = selectedMilestoneId;
      }
      if (estimatedHours !== '' && !isNaN(Number(estimatedHours))) {
        payload.estimatedHours = Number(estimatedHours);
      }
      if (githubAction === 'LINK_EXISTING') {
        payload.githubIssueNumber = Number(githubIssueNumber);
      }

      const created = await createIssue(projectId, payload);

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
        className="relative w-full max-w-7xl bg-white dark:bg-[#1a1a1d] rounded-3xl shadow-2xl dark:shadow-black/70 border border-slate-100 dark:border-[#303030] p-5 sm:p-7 lg:p-8 max-h-[94vh] overflow-y-auto no-scrollbar transition-all text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-[#2b2b2e] mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">
              Create New Issue
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#999]">
              {selectedProject?.name || 'Select project and milestones'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close modal"
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-[#252528] cursor-pointer"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Global Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-[#F87171] text-xs flex items-center gap-2">
            <FiAlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:gap-6">

            {/* LEFT COLUMN: Project & Milestones Selection */}
            <section className="rounded-2xl bg-slate-50/80 p-4 sm:p-5 dark:bg-[#202024]">
              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">Project and milestones</h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Choose a project, then optionally select a milestone to associate with this issue.</p>
              </div>

              {/* Project Selection Dropdown */}
              {availableProjects.length > 0 && (
                <div className="mt-4">
                  <label
                    htmlFor="issue-project"
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                  >
                    Project <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <FiFolder size={16} />
                    </span>
                    <select
                      id="issue-project"
                      value={projectId}
                      disabled={isLoadingProjects || isSubmitting}
                      onChange={(e) => {
                        setSelectedProjectId(e.target.value);
                        setSelectedMilestoneId('');
                        if (fieldErrors.projectId) {
                          setFieldErrors((prev) => ({ ...prev, projectId: '' }));
                        }
                      }}
                      className={`w-full pl-10 pr-9 py-3 rounded-xl border ${
                        fieldErrors.projectId
                          ? 'border-rose-500 dark:border-rose-500'
                          : 'border-slate-200 dark:border-[#35353a]'
                      } appearance-none bg-white dark:bg-[#1b1b1f] text-slate-900 dark:text-white text-sm focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 transition cursor-pointer`}
                    >
                      {availableProjects.length === 0 ? (
                        <option value="">
                          {isLoadingProjects ? 'Loading projects...' : 'No projects found'}
                        </option>
                      ) : (
                        availableProjects.map((p) => {
                          const pid = p.id || p._id || p.projectId;
                          return (
                            <option key={pid} value={pid} className="dark:bg-[#222226]">
                              {p.name || 'Untitled Project'}
                            </option>
                          );
                        })
                      )}
                    </select>
                    <FiChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
                  </div>
                  {fieldErrors.projectId && (
                    <p className="text-[11px] text-rose-500 mt-1">{fieldErrors.projectId}</p>
                  )}
                </div>
              )}

              {/* Project dates summary card */}
              <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-white px-3.5 py-3 dark:bg-[#1b1b1f]">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Project start</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {formatProjectDate(selectedProject?.startDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Project deadline</p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {formatProjectDate(selectedProject?.deadline || selectedProject?.targetEndDate || selectedProject?.endDate)}
                  </p>
                </div>
              </div>

              {/* Milestones list for selection */}
              <div className="mt-5">
                <h5 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Milestone <span className="font-normal text-slate-400">(optional)</span>
                </h5>
                <div className="max-h-52 space-y-2 overflow-y-auto overscroll-contain pr-1">
                  {isLoadingMilestones ? (
                    <div className="space-y-2">
                      {[0, 1].map((index) => (
                        <div key={index} className="h-[65px] animate-pulse rounded-xl bg-white dark:bg-[#1b1b1f]" />
                      ))}
                    </div>
                  ) : projectMilestones.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 px-3 py-5 text-center text-xs text-slate-500 dark:border-[#3a3a42] dark:bg-[#1b1b1f] dark:text-slate-400">
                      {projectId ? 'No milestones found for this project.' : 'Select a project to view its milestones.'}
                    </div>
                  ) : (
                    projectMilestones.map((m, index) => {
                      const mId = m.id || m._id || m.milestoneId;
                      const isSelected = String(selectedMilestoneId) === String(mId);
                      const mName = m.name || m.title || `Milestone ${index + 1}`;
                      const mDate = m.dueDate || m.targetDate || m.deadline;

                      return (
                        <button
                          key={mId || index}
                          type="button"
                          onClick={() => setSelectedMilestoneId(isSelected ? '' : String(mId))}
                          className={`w-full rounded-xl border px-3.5 py-3 text-left transition ${
                            isSelected
                              ? 'border-sky-400 bg-sky-50 dark:border-sky-500 dark:bg-sky-950/20'
                              : 'border-slate-200 bg-white hover:border-sky-300 dark:border-[#35353d] dark:bg-[#1b1b1f] dark:hover:border-sky-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {mName}
                            </span>
                            {mDate && (
                              <span className="text-[11px] text-slate-400 shrink-0 font-medium">
                                Due: {formatProjectDate(mDate)}
                              </span>
                            )}
                          </div>
                          {m.description && (
                            <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                              {m.description}
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </section>

            {/* RIGHT COLUMN: Issue Details Form */}
            <section className="space-y-4">
              <div className="mb-2">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">Issue details</h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Provide the title, description, schedule, and priority.</p>
              </div>

              {/* Issue Title */}
              <div>
                <label
                  htmlFor="issue-title"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
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
                  className={`w-full px-3.5 py-3 rounded-xl border ${
                    fieldErrors.title
                      ? 'border-rose-500 dark:border-rose-500'
                      : 'border-slate-200 dark:border-[#35353a]'
                  } bg-white dark:bg-[#222226] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#888] text-sm focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 transition`}
                />
                {fieldErrors.title && (
                  <p className="text-[11px] text-rose-500 mt-1">{fieldErrors.title}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="issue-description"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                >
                  Description <span className="text-slate-400 lowercase font-normal">(optional)</span>
                </label>
                <textarea
                  id="issue-description"
                  rows={2}
                  placeholder="Describe the issue, reproduction steps, or expected behavior..."
                  value={description}
                  disabled={isSubmitting}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl border border-slate-200 dark:border-[#35353a] bg-white dark:bg-[#222226] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#888] text-sm focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 transition resize-none"
                />
              </div>

              {/* Priority & Estimated Hours Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="issue-priority"
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                  >
                    Priority
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <FiFlag size={15} />
                    </span>
                    <select
                      id="issue-priority"
                      value={priority}
                      disabled={isSubmitting}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full pl-9 pr-8 py-3 rounded-xl border border-slate-200 dark:border-[#35353a] bg-white dark:bg-[#222226] text-slate-900 dark:text-white text-sm focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 transition appearance-none cursor-pointer"
                    >
                      {PRIORITY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} className="dark:bg-[#222226]">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="issue-hours"
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                  >
                    Estimated Hours <span className="text-slate-400 lowercase font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
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
                      className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-200 dark:border-[#35353a] bg-white dark:bg-[#222226] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#888] text-sm focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Start Date & Due Date Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="issue-start-date"
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                  >
                    Start Date <span className="text-slate-400 lowercase font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <FiCalendar size={15} />
                    </span>
                    <input
                      id="issue-start-date"
                      type="date"
                      value={startDate}
                      disabled={isSubmitting}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-200 dark:border-[#35353a] bg-white dark:bg-[#222226] text-slate-900 dark:text-white text-sm focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 transition [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="issue-due-date"
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5"
                  >
                    Due Date <span className="text-slate-400 lowercase font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <FiCalendar size={15} />
                    </span>
                    <input
                      id="issue-due-date"
                      type="date"
                      value={dueDate}
                      disabled={isSubmitting}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-200 dark:border-[#35353a] bg-white dark:bg-[#222226] text-slate-900 dark:text-white text-sm focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 transition [color-scheme:light] dark:[color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>

              {/* GitHub Action */}
              <div className="pt-2 border-t border-slate-100 dark:border-[#2b2b2e]">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    GitHub Action
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-[#a0a0a0] flex items-center gap-1.5 font-medium">
                    <FiGithub size={13} className="text-slate-700 dark:text-slate-300" />
                    <span>Repository Sync</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Option 1: CREATE_NEW */}
                  <button
                    type="button"
                    onClick={() => {
                      setGithubAction('CREATE_NEW');
                      if (fieldErrors.githubIssueNumber) {
                        setFieldErrors((prev) => ({ ...prev, githubIssueNumber: '' }));
                      }
                    }}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      githubAction === 'CREATE_NEW'
                        ? 'border-sky-500 bg-sky-50/60 dark:border-sky-400 dark:bg-sky-950/30 ring-1 ring-sky-500 dark:ring-sky-400'
                        : 'border-slate-200 dark:border-[#35353a] bg-white dark:bg-[#222226] hover:border-slate-300 dark:hover:border-[#4a4a4a]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        <FiGithub size={13} className="text-slate-800 dark:text-slate-200 shrink-0" />
                        Create New
                      </span>
                      {githubAction === 'CREATE_NEW' ? (
                        <span className="w-4 h-4 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px] shrink-0">
                          <FiCheck size={11} />
                        </span>
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-slate-300 dark:border-[#555] shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-[#9e9e9e] leading-snug">
                      Create locally & create corresponding GitHub issue
                    </p>
                  </button>

                  {/* Option 2: LOCAL */}
                  <button
                    type="button"
                    onClick={() => {
                      setGithubAction('LOCAL');
                      if (fieldErrors.githubIssueNumber) {
                        setFieldErrors((prev) => ({ ...prev, githubIssueNumber: '' }));
                      }
                    }}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      githubAction === 'LOCAL'
                        ? 'border-sky-500 bg-sky-50/60 dark:border-sky-400 dark:bg-sky-950/30 ring-1 ring-sky-500 dark:ring-sky-400'
                        : 'border-slate-200 dark:border-[#35353a] bg-white dark:bg-[#222226] hover:border-slate-300 dark:hover:border-[#4a4a4a]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white">
                        FrietSync Only
                      </span>
                      {githubAction === 'LOCAL' ? (
                        <span className="w-4 h-4 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px] shrink-0">
                          <FiCheck size={11} />
                        </span>
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-slate-300 dark:border-[#555] shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-[#9e9e9e] leading-snug">
                      Keep issue local in FrietSync
                    </p>
                  </button>

                  {/* Option 3: LINK_EXISTING */}
                  <button
                    type="button"
                    onClick={() => setGithubAction('LINK_EXISTING')}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                      githubAction === 'LINK_EXISTING'
                        ? 'border-sky-500 bg-sky-50/60 dark:border-sky-400 dark:bg-sky-950/30 ring-1 ring-sky-500 dark:ring-sky-400'
                        : 'border-slate-200 dark:border-[#35353a] bg-white dark:bg-[#222226] hover:border-slate-300 dark:hover:border-[#4a4a4a]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-semibold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                        <FiLink size={13} className="text-slate-800 dark:text-slate-200 shrink-0" />
                        Link Existing
                      </span>
                      {githubAction === 'LINK_EXISTING' ? (
                        <span className="w-4 h-4 rounded-full bg-sky-500 text-white flex items-center justify-center text-[10px] shrink-0">
                          <FiCheck size={11} />
                        </span>
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-slate-300 dark:border-[#555] shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-[#9e9e9e] leading-snug">
                      Link existing GitHub issue #
                    </p>
                  </button>
                </div>

                {/* Input for LINK_EXISTING */}
                {githubAction === 'LINK_EXISTING' && (
                  <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#202024] border border-slate-200/80 dark:border-[#35353a] animate-fadeIn">
                    <label
                      htmlFor="github-issue-number"
                      className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1"
                    >
                      GitHub Issue Number <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-mono text-xs font-bold">
                        #
                      </span>
                      <input
                        id="github-issue-number"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="e.g. 42"
                        value={githubIssueNumber}
                        disabled={isSubmitting}
                        onChange={(e) => {
                          setGithubIssueNumber(e.target.value);
                          if (fieldErrors.githubIssueNumber) {
                            setFieldErrors((prev) => ({ ...prev, githubIssueNumber: '' }));
                          }
                        }}
                        className={`w-full pl-8 pr-3.5 py-3 rounded-xl border ${
                          fieldErrors.githubIssueNumber
                            ? 'border-rose-500 dark:border-rose-500'
                            : 'border-slate-200 dark:border-[#35353a]'
                        } bg-white dark:bg-[#1b1b1f] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#888] text-sm focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 transition`}
                      />
                    </div>
                    {fieldErrors.githubIssueNumber && (
                      <p className="text-[11px] text-rose-500 mt-1">{fieldErrors.githubIssueNumber}</p>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4 dark:border-[#2b2b2e]">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50 dark:border-[#35353a] dark:text-[#bbb] dark:hover:bg-[#252528] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !projectId || !title.trim()}
              className="rounded-xl bg-sky-600 px-5 py-2 font-semibold text-white hover:bg-sky-700 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateIssueModal;
