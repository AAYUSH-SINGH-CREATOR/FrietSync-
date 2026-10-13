import { useState, useEffect, useCallback } from 'react';
import {
  FiX,
  FiUserPlus,
  FiMail,
  FiShield,
  FiCheck,
  FiAlertCircle,
} from 'react-icons/fi';

const ROLE_OPTIONS = [
  { value: 'CONTRIBUTOR', label: 'Contributor' },
  { value: 'VIEWER', label: 'Viewer' },
  { value: 'LEAD', label: 'Team Lead' },
  { value: 'ADMIN', label: 'Admin' },
];

const AddMemberModal = ({
  isOpen,
  onClose,
  activeChat,
  allPeople = [],
  onAddMembers,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('CONTRIBUTOR');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleClose = useCallback(() => {
    setEmail('');
    setRole('CONTRIBUTOR');
    setError('');
    setIsSubmitting(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen || !activeChat) return null;

  const existingMemberEmails = new Set(
    (activeChat.members || []).map((m) =>
      typeof m === 'string' ? m.toLowerCase() : (m.email || '').toLowerCase()
    )
  );

  const availableTeammates = allPeople.filter(
    (p) => p.email && !existingMemberEmails.has(p.email.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Member email address is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (existingMemberEmails.has(trimmedEmail.toLowerCase())) {
      setError(`"${trimmedEmail}" is already in this group.`);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (onAddMembers) {
        await onAddMembers({ email: trimmedEmail, role });
      }
      handleClose();
    } catch (err) {
      setError(err?.message || 'Failed to add member to group.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectTeammate = (teammate) => {
    setEmail(teammate.email || '');
    if (teammate.role) {
      const match = ROLE_OPTIONS.find((r) => r.value === teammate.role);
      if (match) setRole(match.value);
    }
    setError('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/45 dark:bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md bg-white dark:bg-[#172033] rounded-3xl shadow-2xl dark:shadow-black/70 border border-slate-100 dark:border-[#293548] p-6 sm:p-7 max-h-[92vh] overflow-y-auto no-scrollbar transition-all text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-[#293548] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-blue-950/40 text-sky-600 dark:text-[#60A5FA] flex items-center justify-center shadow-2xs shrink-0">
              <FiUserPlus size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-[#F1F5F9] tracking-tight">
                Add Group Member
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">
                Add a teammate to <span className="font-semibold text-slate-800 dark:text-[#CBD5E1]">{activeChat.name}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close modal"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 dark:text-[#94A3B8] hover:text-slate-700 dark:hover:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-[#1E293B] transition cursor-pointer shrink-0 ml-4"
          >
            <FiX size={19} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-[#F87171] text-xs flex items-center gap-2">
            <FiAlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="add-member-email"
              className="block text-xs font-bold text-slate-800 dark:text-[#CBD5E1] uppercase tracking-wider mb-2"
            >
              Member Email Address <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-[#94A3B8]">
                <FiMail size={16} />
              </span>
              <input
                id="add-member-email"
                type="email"
                required
                autoFocus
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder-[#64748B] text-sm focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950/40 transition"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="add-member-role"
              className="block text-xs font-bold text-slate-800 dark:text-[#CBD5E1] uppercase tracking-wider mb-2"
            >
              Group Role
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-[#94A3B8]">
                <FiShield size={16} />
              </span>
              <select
                id="add-member-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] text-slate-900 dark:text-[#F1F5F9] text-sm focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950/40 transition appearance-none cursor-pointer"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="dark:bg-[#1E293B] text-slate-900 dark:text-[#F1F5F9]">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {availableTeammates.length > 0 && (
            <div className="pt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#64748B] block mb-2">
                Or pick from workspace teammates:
              </span>
              <div className="max-h-32 overflow-y-auto no-scrollbar space-y-1.5 border border-slate-100 dark:border-[#293548] rounded-2xl p-2 bg-slate-50/60 dark:bg-[#1E293B]/40">
                {availableTeammates.map((teammate) => (
                  <button
                    key={teammate.id || teammate.email}
                    type="button"
                    onClick={() => handleSelectTeammate(teammate)}
                    className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-white dark:hover:bg-[#1E293B] text-left transition text-xs cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-sky-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                        {teammate.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-[#F1F5F9] truncate">
                          {teammate.name}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] truncate">
                          {teammate.email}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-sky-600 dark:text-[#60A5FA] font-medium opacity-0 group-hover:opacity-100 transition shrink-0 ml-2">
                      Select
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#293548]">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#334155] text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1E293B] text-xs font-semibold transition cursor-pointer disabled:opacity-50"
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
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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

export default AddMemberModal;
