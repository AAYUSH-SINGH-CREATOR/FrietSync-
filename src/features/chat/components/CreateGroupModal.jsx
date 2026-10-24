import { useState, useEffect, useCallback } from 'react';
import { FiX, FiFolderPlus, FiCheck, FiAlertCircle } from 'react-icons/fi';

const CreateGroupModal = ({ isOpen, onClose, onCreateGroup }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleClose = useCallback(() => {
    setName('');
    setDescription('');
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

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Group name is required.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (onCreateGroup) {
        await onCreateGroup({
          name: trimmedName,
          description: description.trim() || '',
          status: 'ACTIVE',
        });
      }
      handleClose();
    } catch (err) {
      setError(err?.message || 'Failed to create group.');
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
        className="relative w-full max-w-md bg-white dark:bg-[#1d1d1d] rounded-3xl shadow-2xl dark:shadow-black/70 border border-slate-100 dark:border-[#303030] p-6 sm:p-7 max-h-[92vh] overflow-y-auto no-scrollbar transition-all text-left"
        onClick={(e) => e.stopPropagation()}
      >
       <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-[#303030] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-blue-950/40 text-sky-600 dark:text-[#60A5FA] flex items-center justify-center shadow-2xs shrink-0">
              <FiFolderPlus size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-[#F1F5F9] tracking-tight">
                New Group
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#b3b3b3] mt-0.5">
                Create a new group to chat with your team.
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

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-[#F87171] text-xs flex items-center gap-2">
            <FiAlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="group-name"
              className="block text-xs font-bold text-slate-800 dark:text-[#e0e0e0] uppercase tracking-wider mb-2"
            >
              Group Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="group-name"
              type="text"
              required
              autoFocus
              placeholder="e.g. Design Team or Project Alpha"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#3a3a3a] bg-white dark:bg-[#242424] text-slate-900 dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder-[#858585] text-sm focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950/40 transition"
            />
          </div>

          <div>
            <label
              htmlFor="group-desc"
              className="block text-xs font-bold text-slate-800 dark:text-[#e0e0e0] uppercase tracking-wider mb-2"
            >
              Description (Optional)
            </label>
            <textarea
              id="group-desc"
              rows={3}
              placeholder="What will this group discuss?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#3a3a3a] bg-white dark:bg-[#242424] text-slate-900 dark:text-[#F1F5F9] placeholder:text-slate-400 dark:placeholder-[#858585] text-sm focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-950/40 transition resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#303030]">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#3a3a3a] text-slate-600 dark:text-[#e0e0e0] hover:bg-slate-50 dark:hover:bg-[#242424] text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-semibold text-xs shadow-md shadow-sky-600/20 dark:shadow-blue-900/30 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <FiCheck size={14} />
                  <span>Create Group</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
