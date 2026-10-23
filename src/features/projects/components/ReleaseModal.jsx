import { useState, useEffect } from 'react';
import { FiX, FiPackage, FiCalendar, FiLink } from 'react-icons/fi';
import {
  createProjectRelease,
  updateProjectRelease,
  getFriendlyErrorMessage,
} from '../services/projectApi';

const ReleaseModal = ({ isOpen, onClose, projectId, release, onReleaseSaved }) => {
  const isEditing = Boolean(release);
  const releaseId = release?.id || release?._id || release?.releaseId;

  const [formData, setFormData] = useState(() => {
    let rawDate = release?.releaseDate || release?.date || '';
    if (rawDate && rawDate.includes('T')) rawDate = rawDate.split('T')[0];
    return {
      name: release?.name || release?.version || release?.title || '',
      description: release?.description || '',
      releaseDate: rawDate || new Date().toISOString().split('T')[0],
      releaseUrl: release?.releaseUrl || release?.url || '',
    };
  });
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
    if (!formData.name.trim()) {
      setErrorMessage('Release name or version is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim(),
      releaseDate: formData.releaseDate || new Date().toISOString().split('T')[0],
      ...(formData.releaseUrl.trim() ? { releaseUrl: formData.releaseUrl.trim() } : {}),
    };

    try {
      let saved;
      if (isEditing) {
        saved = await updateProjectRelease(releaseId, payload);
      } else {
        saved = await createProjectRelease(projectId, payload);
      }
      onReleaseSaved?.(saved || { ...payload, id: releaseId || Date.now() });
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
            <div className="w-11 h-11 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-[#38BDF8] flex items-center justify-center shadow-2xs shrink-0">
              <FiPackage size={22} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-[#F1F5F9] tracking-tight">
                {isEditing ? 'Edit Release' : 'Create Release'}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-[#b3b3b3] mt-0.5">
                Publish a new version, milestone build, or software release.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 dark:text-[#b3b3b3] hover:text-gray-700 dark:hover:text-[#F1F5F9] hover:bg-gray-100 dark:hover:bg-[#242424] transition cursor-pointer shrink-0 ml-4"
          >
            <FiX size={20} />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-800/60 text-red-700 dark:text-[#F87171] text-xs sm:text-sm">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="release-name"
              className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-[#e0e0e0] mb-1.5"
            >
              Release Name / Tag <span className="text-red-500">*</span>
            </label>
            <input
              id="release-name"
              type="text"
              required
              placeholder="e.g. v1.0.0 or Q4 Production"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#3a3a3a] bg-white dark:bg-[#242424] text-slate-800 dark:text-[#F1F5F9] text-xs sm:text-sm focus:outline-none focus:border-sky-500 dark:focus:border-[#60A5FA] focus:ring-2 focus:ring-sky-100 dark:focus:ring-blue-900/30 transition placeholder:text-slate-400 dark:placeholder:text-[#858585]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="release-date"
                className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-[#e0e0e0] mb-1.5"
              >
                Release Date
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-[#858585]">
                  <FiCalendar size={15} />
                </span>
                <input
                  id="release-date"
                  type="date"
                  value={formData.releaseDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, releaseDate: e.target.value }))}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#3a3a3a] bg-white dark:bg-[#242424] text-slate-800 dark:text-[#F1F5F9] text-xs sm:text-sm focus:outline-none focus:border-sky-500 dark:focus:border-[#60A5FA] focus:ring-2 focus:ring-sky-100 dark:focus:ring-blue-900/30 transition"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="release-url"
                className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-[#e0e0e0] mb-1.5"
              >
                Release URL (optional)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-[#858585]">
                  <FiLink size={15} />
                </span>
                <input
                  id="release-url"
                  type="url"
                  placeholder="https://..."
                  value={formData.releaseUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, releaseUrl: e.target.value }))}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#3a3a3a] bg-white dark:bg-[#242424] text-slate-800 dark:text-[#F1F5F9] text-xs sm:text-sm focus:outline-none focus:border-sky-500 dark:focus:border-[#60A5FA] focus:ring-2 focus:ring-sky-100 dark:focus:ring-blue-900/30 transition placeholder:text-slate-400 dark:placeholder:text-[#858585]"
                />
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="release-desc"
              className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-[#e0e0e0] mb-1.5"
            >
              Description / Changelog
            </label>
            <textarea
              id="release-desc"
              rows={3}
              placeholder="Release summary, key updates, changelog highlights..."
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#3a3a3a] bg-white dark:bg-[#242424] text-slate-800 dark:text-[#F1F5F9] text-xs sm:text-sm focus:outline-none focus:border-sky-500 dark:focus:border-[#60A5FA] focus:ring-2 focus:ring-sky-100 dark:focus:ring-blue-900/30 transition placeholder:text-slate-400 dark:placeholder:text-[#858585] resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#303030]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#272727] transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-sky-600/20 transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
            >
              {isSubmitting && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{isEditing ? 'Save Changes' : 'Create Release'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReleaseModal;

