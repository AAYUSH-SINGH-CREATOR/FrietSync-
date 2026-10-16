import { useState, useEffect } from 'react';
import {
  FiX,
  FiUserPlus,
  FiMail,
  FiShield,
  FiCheck,
  FiAlertCircle,
} from 'react-icons/fi';
import { addProjectMember, getFriendlyErrorMessage } from '../services/projectApi';
import { PROJECT_MEMBER_ROLES } from '../utils/projectUtils';

const AddProjectMemberModal = ({
  isOpen,
  onClose,
  projectId,
  projectName = 'Project',
  existingMembers = [],
  onMemberAdded,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('CONTRIBUTOR');
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

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setErrorMessage('Member email address is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    const isDuplicate = existingMembers.some(
      (m) => (m.email || '').toLowerCase() === trimmedEmail.toLowerCase()
    );
    if (isDuplicate) {
      setErrorMessage(`"${trimmedEmail}" is already a member of this project.`);
      return;
    }

    if (!projectId) {
      setErrorMessage('Missing project identifier.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await addProjectMember(projectId, {
        email: trimmedEmail,
        role,
      });

      if (onMemberAdded) {
        onMemberAdded(response);
      }
      onClose();
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, 'project'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/45 dark:bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-[#1d1d1d] rounded-3xl shadow-2xl dark:shadow-black/70 border border-gray-100 dark:border-[#303030] p-6 sm:p-7 max-h-[92vh] overflow-y-auto transition-all text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-4 border-b border-gray-100 dark:border-[#303030] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-blue-950/40 text-sky-600 dark:text-[#60A5FA] flex items-center justify-center shadow-2xs shrink-0">
              <FiUserPlus size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-[#F1F5F9] tracking-tight">
                Add Project Member
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#b3b3b3] mt-0.5 truncate max-w-[220px]">
                Add collaborator to {projectName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 dark:text-[#b3b3b3] hover:text-slate-700 dark:hover:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-[#242424] transition cursor-pointer shrink-0 ml-4"
          >
            <FiX size={19} />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-[#F87171] text-xs flex items-center gap-2">
            <FiAlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="add-member-email"
              className="block text-xs font-bold text-slate-800 dark:text-[#e0e0e0] uppercase tracking-wider mb-2"
            >
              Member Email <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-[#b3b3b3]">
                <FiMail size={16} />
              </span>
              <input
                id="add-member-email"
                type="email"
                required
                autoFocus
                placeholder="teammate@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#3a3a3a] bg-white dark:bg-[#242424] text-slate-900 dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder-[#858585] text-sm focus:outline-none focus:border-sky-500 dark:focus:border-[#60A5FA] focus:ring-2 focus:ring-sky-100 dark:focus:ring-blue-900/30 transition"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="add-member-role"
              className="block text-xs font-bold text-slate-800 dark:text-[#e0e0e0] uppercase tracking-wider mb-2"
            >
              Project Role <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-[#b3b3b3]">
                <FiShield size={16} />
              </span>
              <select
                id="add-member-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-[#3a3a3a] bg-white dark:bg-[#242424] text-slate-900 dark:text-[#F1F5F9] text-sm focus:outline-none focus:border-sky-500 dark:focus:border-[#60A5FA] focus:ring-2 focus:ring-sky-100 dark:focus:ring-blue-900/30 transition appearance-none cursor-pointer"
              >
                {PROJECT_MEMBER_ROLES.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    className="bg-white dark:bg-[#242424] text-slate-900 dark:text-[#F1F5F9]"
                  >
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 dark:text-[#858585] text-xs">
                ▼
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-[#303030]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#3a3a3a] text-slate-600 dark:text-[#e0e0e0] hover:bg-slate-50 dark:hover:bg-[#242424] text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-sky-600/20 dark:shadow-blue-900/30 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <FiCheck size={14} />
                  <span>Add Member</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProjectMemberModal;
