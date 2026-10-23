import { useState, useEffect, useMemo } from 'react';
import { FiX, FiCheckSquare, FiSearch, FiAlertCircle } from 'react-icons/fi';
import { addIssueToRelease, getFriendlyErrorMessage } from '../services/projectApi';

const getStatusBadge = (status = '') => {
  const norm = status.toUpperCase();
  if (['DONE', 'RESOLVED', 'CLOSED'].includes(norm)) {
    return 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60';
  }
  if (['IN_PROGRESS', 'IN_REVIEW', 'PROGRESS'].includes(norm)) {
    return 'bg-sky-950/40 text-sky-300 border-sky-800/60';
  }
  return 'bg-slate-800 text-slate-300 border-slate-700';
};

const AttachReleaseIssuesModal = ({
  isOpen,
  onClose,
  release,
  projectIssues = [],
  onIssuesAttached,
}) => {
  const releaseId = release?.id || release?._id || release?.releaseId;
  const releaseName = release?.name || release?.version || 'Release';

  const [selectedIds, setSelectedIds] = useState(() => {
    const existing = new Set();
    const rawList = release?.issues || release?.issueIds || release?.releaseIssues || [];
    rawList.forEach((item) => {
      const id = typeof item === 'string' ? item : item?.id || item?._id || item?.issueId;
      if (id) existing.add(String(id));
    });
    return existing;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredIssues = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return projectIssues;
    return projectIssues.filter((iss) => {
      const title = String(iss.title || '').toLowerCase();
      const num = String(iss.issueNumber || iss.key || '').toLowerCase();
      return title.includes(q) || num.includes(q);
    });
  }, [projectIssues, searchQuery]);

  if (!isOpen || !release) return null;

  const toggleSelect = (id) => {
    const sid = String(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredIssues.forEach((iss) => {
        const id = iss.id || iss._id || iss.issueId;
        if (id) next.add(String(id));
      });
      return next;
    });
  };

  const handleClearAll = () => {
    setSelectedIds(new Set());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!releaseId) return;

    setIsSubmitting(true);
    setErrorMessage('');

    const issueIds = Array.from(selectedIds);

    try {
      const updated = await addIssueToRelease(releaseId, { issueIds });
      onIssuesAttached?.(updated || { ...release, issues: issueIds });
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
        className="relative w-full max-w-xl bg-white dark:bg-[#1d1d1d] rounded-3xl shadow-2xl dark:shadow-black/70 border border-gray-100 dark:border-[#303030] p-6 sm:p-8 transition-all text-left flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-gray-100 dark:border-[#303030] shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-[#818CF8] flex items-center justify-center shadow-2xs shrink-0">
              <FiCheckSquare size={22} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-[#F1F5F9] tracking-tight">
                Attach Issues to {releaseName}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-[#b3b3b3] mt-0.5">
                Select completed issues, bug fixes, or deliverables for this release.
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
          <div className="mt-4 p-3.5 rounded-2xl bg-red-50 dark:bg-rose-950/40 border border-red-200 dark:border-rose-800/60 text-red-700 dark:text-[#F87171] text-xs sm:text-sm flex items-center gap-2">
            <FiAlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Search & Actions Bar */}
        <div className="mt-4 flex items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <FiSearch size={14} />
            </span>
            <input
              type="text"
              placeholder="Search issues by title or #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#3a3a3a] bg-white dark:bg-[#242424] text-slate-800 dark:text-[#F1F5F9] text-xs sm:text-sm focus:outline-none focus:border-sky-500 dark:focus:border-[#60A5FA] transition"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs font-semibold text-sky-500 hover:text-sky-400 px-2 py-1 transition cursor-pointer"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs font-semibold text-slate-400 hover:text-slate-300 px-2 py-1 transition cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Selected count pill */}
        <div className="mt-2 text-xs text-slate-400 shrink-0">
          <span className="font-bold text-white">{selectedIds.size}</span> of {projectIssues.length} issues selected
        </div>

        {/* Issues List */}
        <div className="mt-3 flex-1 overflow-y-auto min-h-[220px] max-h-[360px] divide-y divide-slate-100 dark:divide-[#2d2d34] border border-slate-200 dark:border-[#32323a] rounded-2xl p-1 bg-slate-50/50 dark:bg-[#18181b]">
          {projectIssues.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No issues available in this project to attach.
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No issues match &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            filteredIssues.map((issue, idx) => {
              const id = issue.id || issue._id || issue.issueId || idx;
              const sid = String(id);
              const isChecked = selectedIds.has(sid);
              const issueNum = issue.issueNumber ? `#${issue.issueNumber}` : '';
              const badgeClass = getStatusBadge(issue.status);

              return (
                <label
                  key={sid}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#25252c] transition cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleSelect(id)}
                      className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 dark:border-slate-600 dark:bg-slate-800 shrink-0 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {issueNum && (
                          <span className="font-mono text-[10px] text-slate-500 shrink-0">
                            {issueNum}
                          </span>
                        )}
                        <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {issue.title || 'Untitled task'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider shrink-0 ${badgeClass}`}
                  >
                    {String(issue.status || 'OPEN').replace(/[_-]/g, ' ')}
                  </span>
                </label>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-[#303030] mt-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#272727] transition cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-sky-600/20 transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
          >
            {isSubmitting && (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <span>Save Attached Issues ({selectedIds.size})</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttachReleaseIssuesModal;

