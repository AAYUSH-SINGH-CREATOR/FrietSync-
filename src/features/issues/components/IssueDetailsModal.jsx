import { useState, useEffect } from 'react';
import {
  FiX,
  FiFolder,
  FiCalendar,
  FiClock,
  FiAlertCircle,
  FiUser,
  FiLayers,
} from 'react-icons/fi';
import { getIssueDetails } from '../services/issueApi';
import {
  getPriorityBadge,
  getStatusBadge,
  formatIssueDate,
  formatEstimatedHours,
} from '../utils/issueUtils';
import { getFriendlyErrorMessage } from '../../../utils/errorHandler';

const IssueDetailsModal = ({
  isOpen,
  onClose,
  issueId,
  initialIssue = null,
  projectName = '',
}) => {
  const [fetchedIssue, setFetchedIssue] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !issueId) return;

    let isMounted = true;

    getIssueDetails(issueId)
      .then((data) => {
        if (!isMounted) return;
        if (data) {
          setFetchedIssue(data);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        if (!initialIssue) {
          setError(getFriendlyErrorMessage(err, 'issue'));
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, issueId, initialIssue]);

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

  const currentIssue = fetchedIssue || initialIssue;
  const title = currentIssue?.title || 'Issue Details';
  const description = currentIssue?.description || '';
  const priority = (currentIssue?.priority || 'MEDIUM').toUpperCase();
  const status = currentIssue?.status || 'OPEN';
  const dueDate = currentIssue?.dueDate;
  const estimatedHours = currentIssue?.estimatedHours;
  const displayProject = projectName || currentIssue?.projectName || currentIssue?.project?.name || '';
  const issueNumber = currentIssue?.issueNumber;
  const isUuid = (val) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
  const rawReporter = currentIssue?.reporterName || currentIssue?.reporter?.name || currentIssue?.creatorEmail || '';
  const reporter = isUuid(rawReporter) ? '' : rawReporter;
  const rawAssignee = currentIssue?.assigneeName || currentIssue?.assignedTo?.name || currentIssue?.assigneeEmail || '';
  const assignee = isUuid(rawAssignee) ? '' : rawAssignee;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/45 dark:bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#1d1d1d] rounded-3xl shadow-2xl dark:shadow-black/70 border border-slate-100 dark:border-[#303030] p-6 sm:p-7 max-h-[92vh] overflow-y-auto no-scrollbar transition-all text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-[#303030] mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-[#FBBF24] flex items-center justify-center shadow-2xs shrink-0">
              <FiLayers size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-[#b3b3b3] bg-slate-100 dark:bg-[#242424] px-2 py-0.5 rounded-md">
                  {issueNumber !== undefined && issueNumber !== null
                    ? `#${issueNumber}`
                    : issueId
                    ? `#${String(issueId).slice(-6)}`
                    : 'ISSUE'}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getPriorityBadge(
                    priority
                  )}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {priority}
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(
                    status
                  )}`}
                >
                  {status}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-[#F1F5F9] tracking-tight truncate mt-1">
                {title}
              </h2>
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
        {isLoading && !currentIssue && (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-7 h-7 border-2 border-sky-600/30 border-t-sky-600 rounded-full animate-spin mb-3" />
            <p className="text-xs text-slate-400 dark:text-[#b3b3b3]">Loading issue details...</p>
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-[#F87171] text-xs flex items-center gap-2">
            <FiAlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {currentIssue && (
          <div className="space-y-5">
            {displayProject && (
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-[#242424]/70 border border-slate-100 dark:border-[#303030]">
                <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-blue-950/50 text-sky-600 dark:text-[#60A5FA] flex items-center justify-center shrink-0">
                  <FiFolder size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-[#858585] tracking-wider">
                    Project
                  </p>
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-[#F1F5F9] truncate">
                    {displayProject}
                  </p>
                </div>
              </div>
            )}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#858585] mb-2">
                Description
              </h4>
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 dark:bg-[#242424]/50 border border-slate-100 dark:border-[#303030] text-xs sm:text-sm text-slate-700 dark:text-[#e0e0e0] whitespace-pre-wrap leading-relaxed">
                {description || (
                  <span className="italic text-slate-400 dark:text-[#858585]">
                    No description provided for this issue.
                  </span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#242424]/60 border border-slate-100 dark:border-[#303030]">
                <div className="flex items-center gap-2 text-slate-400 dark:text-[#b3b3b3] mb-1">
                  <FiCalendar size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Due Date</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-[#F1F5F9]">
                  {formatIssueDate(dueDate)}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#242424]/60 border border-slate-100 dark:border-[#303030]">
                <div className="flex items-center gap-2 text-slate-400 dark:text-[#b3b3b3] mb-1">
                  <FiClock size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Estimated</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-[#F1F5F9]">
                  {formatEstimatedHours(estimatedHours)}
                </p>
              </div>

              {currentIssue?.createdAt && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#242424]/60 border border-slate-100 dark:border-[#303030] col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-2 text-slate-400 dark:text-[#b3b3b3] mb-1">
                    <FiCalendar size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Created</span>
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-[#F1F5F9]">
                    {formatIssueDate(currentIssue.createdAt)}
                  </p>
                </div>
              )}
            </div>
            {(reporter || assignee) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {reporter && (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#242424]/60 border border-slate-100 dark:border-[#303030]">
                    <div className="flex items-center gap-2 text-slate-400 dark:text-[#b3b3b3] mb-1">
                      <FiUser size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Reporter</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-[#F1F5F9] truncate">
                      {reporter}
                    </p>
                  </div>
                )}
                {assignee && (
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-[#242424]/60 border border-slate-100 dark:border-[#303030]">
                    <div className="flex items-center gap-2 text-slate-400 dark:text-[#b3b3b3] mb-1">
                      <FiUser size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Assignee</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-[#F1F5F9] truncate">
                      {assignee}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <div className="pt-4 mt-5 border-t border-slate-100 dark:border-[#303030] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#242424] hover:bg-slate-200 dark:hover:bg-[#303030] text-slate-700 dark:text-[#e0e0e0] text-xs font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default IssueDetailsModal;

