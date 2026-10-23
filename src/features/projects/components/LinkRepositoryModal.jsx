import { useState, useEffect } from 'react';
import { FiX, FiGithub, FiAlertCircle } from 'react-icons/fi';
import { linkProjectRepository, getFriendlyErrorMessage } from '../services/projectApi';

const LinkRepositoryModal = ({ isOpen, onClose, projectId, onRepositoryLinked }) => {
  const [owner, setOwner] = useState('');
  const [repository, setRepository] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedOwner = owner.trim();
    const trimmedRepo = repository.trim();

    if (!trimmedOwner) {
      setErrorMessage('GitHub owner or organization is required.');
      return;
    }
    if (!trimmedRepo) {
      setErrorMessage('GitHub repository name is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await linkProjectRepository(projectId, { owner: trimmedOwner, repository: trimmedRepo });
      onRepositoryLinked?.({ owner: trimmedOwner, repository: trimmedRepo });
      onClose();
    } catch (err) {
      setErrorMessage(getFriendlyErrorMessage(err, 'project'));
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
        className="relative w-full max-w-lg bg-white dark:bg-[#1d1d1d] rounded-3xl shadow-2xl dark:shadow-black/70 border border-gray-100 dark:border-[#303030] p-6 sm:p-8 transition-all text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-4 border-b border-gray-100 dark:border-[#303030] mb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-center shadow-2xs shrink-0">
              <FiGithub size={22} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-[#F1F5F9] tracking-tight">
                Link GitHub Repository
              </h2>
              <p className="text-xs text-gray-500 dark:text-[#a0a0a0] mt-0.5">
                Connect a GitHub repository to track code activity and contributions.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-[#282828] transition cursor-pointer"
            aria-label="Close modal"
          >
            <FiX size={18} />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <FiAlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-[#d0d0d0] uppercase tracking-wider mb-1.5">
              Repository Owner <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={owner}
              onChange={(e) => {
                setOwner(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="e.g. facebook or aviralumrao"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#353535] bg-white dark:bg-[#181818] text-gray-900 dark:text-white text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-[#d0d0d0] uppercase tracking-wider mb-1.5">
              Repository Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={repository}
              onChange={(e) => {
                setRepository(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              placeholder="e.g. react or FrietSync"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-[#353535] bg-white dark:bg-[#181818] text-gray-900 dark:text-white text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-[#303030]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#282828] transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-xs font-semibold text-white shadow-md shadow-sky-600/20 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{isSubmitting ? 'Linking...' : 'Link Repository'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LinkRepositoryModal;

