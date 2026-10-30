import { useEffect, useMemo, useState } from 'react';
import { FiAlertTriangle, FiChevronRight, FiRepeat, FiSearch, FiSend, FiX } from 'react-icons/fi';
import { formatDate } from '../utils/projectUtils';
import { getPriorityBadge, getStatusBadge as getIssueStatusBadge } from '../../issues/utils/issueUtils';
import { requestIssueAssignment } from '../../issues/services/issueApi';
import { requestSprintAssignment } from '../../sprints/services/sprintsApi';
import { getFriendlyErrorMessage } from '../../../utils/errorHandler';

const getSprintStatusClass = (status) => {
  const normalized = String(status || 'PLANNED').toUpperCase().replace(/[\s-]+/g, '_');
  if (normalized === 'COMPLETED') return 'border-emerald-800/50 bg-emerald-950/40 text-emerald-300';
  if (normalized === 'ACTIVE' || normalized === 'IN_PROGRESS') return 'border-sky-800/50 bg-sky-950/40 text-sky-300';
  return 'border-purple-800/50 bg-purple-950/40 text-purple-300';
};

const ProjectItemsModal = ({ isOpen, kind, projectName, items = [], onClose, onSelect, canRequestAssignment = false }) => {
  const [search, setSearch] = useState('');
  const [requestStates, setRequestStates] = useState({});
  const [requestFeedback, setRequestFeedback] = useState(null);
  const isIssues = kind === 'issues';

  useEffect(() => {
    if (!isOpen) return undefined;
    setSearch('');
    setRequestFeedback(null);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter((item) => {
      const text = isIssues
        ? `${item.title || ''} ${item.issueNumber || ''} ${item.status || ''} ${item.priority || ''}`
        : `${item.name || ''} ${item.sprintNumber || ''} ${item.status || ''} ${item.goal || item.description || ''}`;
      return text.toLowerCase().includes(query);
    });
  }, [items, isIssues, search]);

  const handleAssignmentRequest = async (event, item) => {
    event.stopPropagation();
    const itemId = String(item.id || item._id || item.issueId || item.sprintId || '');
    if (!itemId) return;
    const requestKey = `${kind}:${itemId}`;
    if (requestStates[requestKey] === 'pending' || requestStates[requestKey] === 'sent') return;

    setRequestStates((current) => ({ ...current, [requestKey]: 'pending' }));
    setRequestFeedback(null);
    try {
      if (isIssues) await requestIssueAssignment(itemId);
      else await requestSprintAssignment(itemId);
      setRequestStates((current) => ({ ...current, [requestKey]: 'sent' }));
      setRequestFeedback({ type: 'success', message: 'Assignment request sent.' });
    } catch (error) {
      setRequestStates((current) => ({ ...current, [requestKey]: 'idle' }));
      setRequestFeedback({
        type: 'error',
        message: getFriendlyErrorMessage(error, isIssues ? 'issue-assignment' : 'sprint-assignment'),
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-5"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-items-modal-title"
        className="flex max-h-[90dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-[#303030] dark:bg-[#1f1f1f]"
      >
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 dark:border-[#303030] sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isIssues ? 'bg-sky-950/40 text-sky-400' : 'bg-purple-950/40 text-purple-400'}`}>
              {isIssues ? <FiAlertTriangle size={18} /> : <FiRepeat size={18} />}
            </span>
            <div className="min-w-0">
              <h2 id="project-items-modal-title" className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">
                {isIssues ? 'Project Issues' : 'Project Sprints'}
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 align-middle text-xs font-semibold text-slate-600 dark:bg-[#2b2b30] dark:text-slate-300">{items.length}</span>
              </h2>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{projectName || 'Project'}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-[#2b2b30]">
            <FiX size={18} />
          </button>
        </header>

        <div className="border-b border-slate-200 p-4 dark:border-[#303030] sm:px-5">
          <label className="relative block max-w-sm">
            <FiSearch size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${isIssues ? 'issues' : 'sprints'}...`}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs text-slate-800 outline-none focus:border-sky-500 dark:border-[#35353d] dark:bg-[#25252a] dark:text-white"
            />
          </label>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {filteredItems.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
              {items.length === 0 ? `No ${isIssues ? 'issues' : 'sprints'} in this project yet.` : 'No matching results.'}
            </div>
          ) : (
            <table className="w-full min-w-[680px] border-collapse text-left text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-[#222226] dark:text-slate-400">
                {isIssues ? (
                  <tr><th className="px-4 py-3">Issue</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Priority</th><th className="px-3 py-3">Assignee</th><th className="px-3 py-3">Due date</th>{canRequestAssignment && <th className="px-3 py-3">Action</th>}<th className="w-8 px-2" /></tr>
                ) : (
                  <tr><th className="px-4 py-3">Sprint</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Start</th><th className="px-3 py-3">End</th><th className="px-3 py-3">Goal</th>{canRequestAssignment && <th className="px-3 py-3">Action</th>}</tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#303030]">
                {filteredItems.map((item, index) => {
                  const id = item.id || item._id || item.issueId || item.sprintId || index;
                  const requestKey = `${kind}:${id}`;
                  const requestState = requestStates[requestKey];
                  const isUnavailable = isIssues
                    ? ['RESOLVED', 'CLOSED'].includes(String(item.status || '').toUpperCase().replace(/[\s-]+/g, '_'))
                    : String(item.status || item.state || '').toUpperCase().replace(/[\s-]+/g, '_') === 'COMPLETED';
                  if (isIssues) {
                    return (
                      <tr key={id} onClick={() => onSelect?.(item)} className={`${onSelect ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-[#28282d]' : ''} transition`}>
                        <td className="max-w-[360px] px-4 py-3">
                          <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{item.issueNumber ? `#${item.issueNumber}` : ''}</span>
                          <p className="truncate font-semibold text-slate-900 dark:text-white">{item.title || 'Untitled issue'}</p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3"><span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${getIssueStatusBadge(item.status)}`}>{String(item.status || 'OPEN').replace(/[_-]/g, ' ')}</span></td>
                        <td className="whitespace-nowrap px-3 py-3"><span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${getPriorityBadge(item.priority)}`}>{String(item.priority || 'MEDIUM').replace(/[_-]/g, ' ')}</span></td>
                        <td className="max-w-[170px] truncate px-3 py-3 text-slate-600 dark:text-slate-300">{item.assigneeName || item.assignee?.name || item.assignedTo?.name || item.assigneeEmail || '—'}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-600 dark:text-slate-300">{item.dueDate ? formatDate(item.dueDate) : '—'}</td>
                        {canRequestAssignment && <td className="whitespace-nowrap px-3 py-3"><button type="button" onClick={(event) => handleAssignmentRequest(event, item)} disabled={!item.id && !item._id && !item.issueId || isUnavailable || requestState === 'pending' || requestState === 'sent'} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-2.5 py-1.5 text-[10px] font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-55">{requestState === 'sent' ? 'Requested' : requestState === 'pending' ? 'Sending…' : <><FiSend size={11} /> Request assignment</>}</button></td>}
                        <td className="px-2 py-3 text-slate-400">{onSelect && <FiChevronRight size={14} />}</td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={id} className="transition hover:bg-slate-50 dark:hover:bg-[#28282d]">
                      <td className="px-4 py-3">
                        <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">Sprint {item.sprintNumber || index + 1}</span>
                        <p className="font-semibold text-slate-900 dark:text-white">{item.name || `Sprint ${index + 1}`}</p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3"><span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getSprintStatusClass(item.status)}`}>{String(item.status || 'PLANNED').replace(/[_-]/g, ' ')}</span></td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600 dark:text-slate-300">{item.startDate ? formatDate(item.startDate) : '—'}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600 dark:text-slate-300">{item.endDate ? formatDate(item.endDate) : '—'}</td>
                      <td className="max-w-[300px] truncate px-3 py-3 text-slate-600 dark:text-slate-300">{item.goal || item.description || '—'}</td>
                      {canRequestAssignment && <td className="whitespace-nowrap px-3 py-3"><button type="button" onClick={(event) => handleAssignmentRequest(event, item)} disabled={!item.id && !item._id && !item.sprintId || isUnavailable || requestState === 'pending' || requestState === 'sent'} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-2.5 py-1.5 text-[10px] font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-55">{requestState === 'sent' ? 'Requested' : requestState === 'pending' ? 'Sending…' : <><FiSend size={11} /> Request assignment</>}</button></td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {canRequestAssignment && requestFeedback && (
          <p role="status" className={`border-t border-slate-200 px-5 py-2 text-xs dark:border-[#303030] ${requestFeedback.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {requestFeedback.message}
          </p>
        )}

        <footer className="flex justify-end border-t border-slate-200 px-4 py-3 dark:border-[#303030] sm:px-5">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-[#35353d] dark:bg-[#25252a] dark:text-slate-200 dark:hover:bg-[#303036]">Close</button>
        </footer>
      </section>
    </div>
  );
};

export default ProjectItemsModal;
