import { useState, useEffect } from 'react';
import {
  FiX,
  FiFolder,
  FiCalendar,
  FiMail,
  FiShield,
  FiAlertCircle,
} from 'react-icons/fi';
import { updateProject, getFriendlyErrorMessage } from '../services/projectApi';
import { PROJECT_STATUS_OPTIONS } from '../utils/projectUtils';

const EditProjectModal = ({ isOpen, onClose, project, onProjectUpdated }) => {
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
    status: (project?.status || 'ACTIVE').toUpperCase(),
    startDate: project?.startDate ? project.startDate.slice(0, 10) : '',
    deadline: project?.deadline ? project.deadline.slice(0, 10) : '',
    projectManagerEmail: project?.projectManagerEmail || project?.projectManager?.email || '',
    teamLeadEmail: project?.teamLeadEmail || project?.teamLead?.email || '',
    workspaceId: project?.workspaceId || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setErrorMessage('Project name is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (
      formData.projectManagerEmail.trim() &&
      !emailRegex.test(formData.projectManagerEmail.trim())
    ) {
      setErrorMessage('Please enter a valid Project Manager email.');
      return;
    }
    if (
      formData.teamLeadEmail.trim() &&
      !emailRegex.test(formData.teamLeadEmail.trim())
    ) {
      setErrorMessage('Please enter a valid Team Lead email.');
      return;
    }

    if (formData.startDate && formData.deadline && formData.deadline < formData.startDate) {
      setErrorMessage('Deadline cannot be earlier than the start date.');
      return;
    }

    const projectId = project?.id || project?._id;
    if (!projectId) {
      setErrorMessage('Missing project identifier.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await updateProject(projectId, formData);
      if (onProjectUpdated) {
        onProjectUpdated(response);
      }
      onClose();
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, 'project'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !project) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/45 dark:bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-[#172033] rounded-3xl shadow-2xl dark:shadow-black/70 border border-gray-100 dark:border-[#293548] p-6 sm:p-8 max-h-[92vh] overflow-y-auto transition-all text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-4 border-b border-gray-100 dark:border-[#293548] mb-6">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-sky-50 dark:bg-blue-950/40 text-sky-600 dark:text-[#60A5FA] flex items-center justify-center shadow-2xs shrink-0">
              <FiFolder size={24} />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-[#F1F5F9] tracking-tight">
                Edit Project
              </h2>
              <p className="text-sm text-gray-500 dark:text-[#94A3B8] mt-1">
                Update project details, roadmap milestones, and team leads.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 dark:text-[#94A3B8] hover:text-gray-700 dark:hover:text-[#F1F5F9] hover:bg-gray-100 dark:hover:bg-[#1E293B] transition cursor-pointer shrink-0 ml-4"
          >
            <FiX size={22} />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-5 p-4 rounded-2xl bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-800/60 text-red-700 dark:text-[#F87171] text-sm sm:text-base flex items-center gap-3">
            <FiAlertCircle className="shrink-0 text-red-500 dark:text-[#F87171]" size={19} />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          <div>
            <label
              htmlFor="edit-project-name"
              className="block text-sm sm:text-base font-semibold text-slate-800 dark:text-[#CBD5E1] mb-2"
            >
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-project-name"
              name="name"
              type="text"
              required
              placeholder="e.g. FrietSync"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 sm:py-3.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] text-slate-800 dark:text-[#F1F5F9] text-sm sm:text-base focus:outline-none focus:border-sky-500 dark:focus:border-[#60A5FA] focus:ring-4 focus:ring-sky-100 dark:focus:ring-blue-900/30 transition placeholder:text-slate-400 dark:placeholder:text-[#64748B]"
            />
          </div>

          <div>
            <label
              htmlFor="edit-project-desc"
              className="block text-sm sm:text-base font-semibold text-slate-800 dark:text-[#CBD5E1] mb-2"
            >
              Description
            </label>
            <textarea
              id="edit-project-desc"
              name="description"
              rows={3}
              placeholder="Project management and issue tracking platform..."
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] text-slate-800 dark:text-[#F1F5F9] text-sm sm:text-base focus:outline-none focus:border-sky-500 dark:focus:border-[#60A5FA] focus:ring-4 focus:ring-sky-100 dark:focus:ring-blue-900/30 transition placeholder:text-slate-400 dark:placeholder:text-[#64748B] resize-none leading-relaxed"
            />
          </div>

          <div>
            <label
              htmlFor="edit-project-status"
              className="block text-sm sm:text-base font-semibold text-slate-800 dark:text-[#CBD5E1] mb-2"
            >
              Status
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-[#64748B]">
                <FiShield size={18} />
              </span>
              <select
                id="edit-project-status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full pl-11 pr-10 py-3 sm:py-3.5 rounded-xl border border-slate-200 dark:border-[#334155] text-sm sm:text-base font-medium bg-white dark:bg-[#1E293B] text-slate-800 dark:text-[#F1F5F9] focus:outline-none focus:border-sky-500 dark:focus:border-[#60A5FA] focus:ring-4 focus:ring-sky-100 dark:focus:ring-blue-900/30 transition cursor-pointer appearance-none"
              >
                {PROJECT_STATUS_OPTIONS.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    className="bg-white dark:bg-[#1E293B] text-slate-800 dark:text-[#F1F5F9]"
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400 dark:text-[#64748B] text-sm">
                ▼
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label
                htmlFor="edit-start-date"
                className="block text-sm sm:text-base font-semibold text-slate-800 dark:text-[#CBD5E1] mb-2"
              >
                Start Date
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-[#64748B]">
                  <FiCalendar size={18} />
                </span>
                <input
                  id="edit-start-date"
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] text-slate-800 dark:text-[#F1F5F9] text-sm sm:text-base focus:outline-none focus:border-sky-500 dark:focus:border-[#60A5FA] focus:ring-4 focus:ring-sky-100 dark:focus:ring-blue-900/30 transition cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="edit-deadline"
                className="block text-sm sm:text-base font-semibold text-slate-800 dark:text-[#CBD5E1] mb-2"
              >
                Deadline
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-[#64748B]">
                  <FiCalendar size={18} />
                </span>
                <input
                  id="edit-deadline"
                  name="deadline"
                  type="date"
                  min={formData.startDate || ''}
                  value={formData.deadline}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] text-slate-800 dark:text-[#F1F5F9] text-sm sm:text-base focus:outline-none focus:border-sky-500 dark:focus:border-[#60A5FA] focus:ring-4 focus:ring-sky-100 dark:focus:ring-blue-900/30 transition cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label
                htmlFor="edit-pm-email"
                className="block text-sm sm:text-base font-semibold text-slate-800 dark:text-[#CBD5E1] mb-2"
              >
                Project Manager Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-[#64748B]">
                  <FiMail size={18} />
                </span>
                <input
                  id="edit-pm-email"
                  name="projectManagerEmail"
                  type="email"
                  placeholder="pm@example.com"
                  value={formData.projectManagerEmail}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] text-slate-800 dark:text-[#F1F5F9] text-sm sm:text-base focus:outline-none focus:border-sky-500 dark:focus:border-[#60A5FA] focus:ring-4 focus:ring-sky-100 dark:focus:ring-blue-900/30 transition placeholder:text-slate-400 dark:placeholder:text-[#64748B]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="edit-lead-email"
                className="block text-sm sm:text-base font-semibold text-slate-800 dark:text-[#CBD5E1] mb-2"
              >
                Team Lead Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-[#64748B]">
                  <FiMail size={18} />
                </span>
                <input
                  id="edit-lead-email"
                  name="teamLeadEmail"
                  type="email"
                  placeholder="lead@example.com"
                  value={formData.teamLeadEmail}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] text-slate-800 dark:text-[#F1F5F9] text-sm sm:text-base focus:outline-none focus:border-sky-500 dark:focus:border-[#60A5FA] focus:ring-4 focus:ring-sky-100 dark:focus:ring-blue-900/30 transition placeholder:text-slate-400 dark:placeholder:text-[#64748B]"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3.5 pt-5 border-t border-slate-100 dark:border-[#293548]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-3 rounded-xl text-sm sm:text-base font-medium text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1E293B] transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-700 text-white font-semibold text-sm sm:text-base shadow-md shadow-sky-600/20 dark:shadow-blue-900/30 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProjectModal;
