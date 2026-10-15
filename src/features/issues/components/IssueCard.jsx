import { FiCalendar, FiClock, FiFolder, FiChevronRight } from 'react-icons/fi';
import { getPriorityBadge, getStatusBadge, formatIssueDate, formatEstimatedHours } from '../utils/issueUtils';

const IssueCard = ({ issue, projectName, onClick }) => {
  if (!issue) return null;

  const title = issue.title || 'Untitled Issue';
  const description = issue.description || '';
  const priority = (issue.priority || 'MEDIUM').toUpperCase();
  const status = issue.status || 'OPEN';
  const dueDate = issue.dueDate;
  const estimatedHours = issue.estimatedHours;
  const displayProject = projectName || issue.projectName || issue.project?.name || '';
  const issueNumber = issue.issueNumber;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick && onClick(issue)}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
          e.preventDefault();
          onClick(issue);
        }
      }}
      className="group bg-white dark:bg-[#172033] rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-[#293548] hover:border-sky-300 dark:hover:border-blue-600/60 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between text-left"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {issueNumber !== undefined && issueNumber !== null && (
              <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-[#94A3B8] bg-slate-100 dark:bg-[#1E293B] px-2 py-0.5 rounded-md">
                #{issueNumber}
              </span>
            )}

            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wider ${getPriorityBadge(
                priority
              )}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {priority}
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${getStatusBadge(
                status
              )}`}
            >
              {status}
            </span>
          </div>

          {displayProject && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-[#94A3B8] bg-slate-100 dark:bg-[#1E293B] px-2.5 py-0.5 rounded-lg truncate max-w-[160px]">
              <FiFolder size={11} className="shrink-0 text-sky-500" />
              <span className="truncate">{displayProject}</span>
            </span>
          )}
        </div>

        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#F1F5F9] group-hover:text-sky-600 dark:group-hover:text-[#60A5FA] transition-colors line-clamp-1 mb-1.5">
          {title}
        </h3>

        {description ? (
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#94A3B8] line-clamp-2 leading-relaxed mb-4">
            {description}
          </p>
        ) : (
          <p className="text-xs text-slate-400 dark:text-[#64748B] italic mb-4">
            No description provided.
          </p>
        )}
      </div>

      <div className="pt-3.5 border-t border-slate-100 dark:border-[#293548]/70 flex items-center justify-between text-xs text-slate-500 dark:text-[#94A3B8] gap-3">
        <div className="flex items-center gap-3.5 flex-wrap">
          <span className="inline-flex items-center gap-1.5" title="Due date">
            <FiCalendar size={13} className="text-slate-400 dark:text-[#64748B]" />
            <span>{formatIssueDate(dueDate)}</span>
          </span>
          {(estimatedHours !== undefined && estimatedHours !== null && estimatedHours !== '') && (
            <span className="inline-flex items-center gap-1.5" title="Estimated hours">
              <FiClock size={13} className="text-slate-400 dark:text-[#64748B]" />
              <span>{formatEstimatedHours(estimatedHours)}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-sky-600 dark:text-[#60A5FA] font-medium opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <span className="text-[11px]">Details</span>
          <FiChevronRight size={14} />
        </div>
      </div>
    </div>
  );
};

export default IssueCard;

