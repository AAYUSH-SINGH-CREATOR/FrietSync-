import { useState } from 'react';
import {
  FiSquare, FiPlus, FiCalendar, FiMoreHorizontal,
  FiArrowUpCircle, FiMinusCircle, FiCheckCircle, FiAlertCircle,
} from 'react-icons/fi';

const COLUMNS = [
  { id: 'TODO', label: 'To do', bg: 'bg-[#CBB0FF]', text: 'text-[#2e1065]', darkBg: 'dark:bg-[#4c3875]', darkText: 'dark:text-[#E9D8FD]', match: ['TODO', 'OPEN', 'BACKLOG'], apiStatus: 'TODO' },
  { id: 'IN_PROGRESS', label: 'In progress', bg: 'bg-[#9BD4FD]', text: 'text-[#0c4a6e]', darkBg: 'dark:bg-[#1E3A5F]', darkText: 'dark:text-[#BAE6FD]', match: ['IN_PROGRESS', 'ACTIVE'], apiStatus: 'IN_PROGRESS' },
  { id: 'IN_REVIEW', label: 'In review', bg: 'bg-[#F8A0CB]', text: 'text-[#831843]', darkBg: 'dark:bg-[#5E1E3C]', darkText: 'dark:text-[#FBCFE8]', match: ['IN_REVIEW'], apiStatus: 'IN_REVIEW' },
  { id: 'TESTING', label: 'Testing', bg: 'bg-[#FEF08A]', text: 'text-[#713f12]', darkBg: 'dark:bg-[#5C4D14]', darkText: 'dark:text-[#FEF08A]', match: ['TESTING', 'QA'], apiStatus: 'TESTING' },
  { id: 'DONE', label: 'Done', bg: 'bg-[#86EFAC]', text: 'text-[#14532d]', darkBg: 'dark:bg-[#1C4D2E]', darkText: 'dark:text-[#BBF7D0]', match: ['DONE', 'RESOLVED', 'CLOSED', 'COMPLETED'], apiStatus: 'DONE' },
];

const normalize = (v) => String(v || '').toUpperCase().replace(/[\s-]+/g, '_');
const issueId = (i) => i?.id || i?._id || i?.issueId;
const avatarColors = ['bg-amber-500', 'bg-blue-500', 'bg-pink-500', 'bg-emerald-500', 'bg-purple-500', 'bg-sky-500'];

const formatKanbanDate = (dateStr) => {
  if (!dateStr) return 'No due date';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return String(dateStr);
  }
};

const PriorityBadge = ({ priority }) => {
  const norm = normalize(priority);
  if (norm === 'HIGH' || norm === 'URGENT') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"><FiArrowUpCircle size={11} />High</span>;
  }
  if (norm === 'CRITICAL') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/60 dark:text-red-300"><FiAlertCircle size={11} />Critical</span>;
  }
  if (norm === 'LOW') {
    return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"><FiCheckCircle size={11} />Low</span>;
  }
  return <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"><FiMinusCircle size={11} />Moderate</span>;
};

const KanbanBoardView = ({
  issues = [],
  isLoading = false,
  onIssueClick,
  onStatusChange,
  onCreateInColumn,
  displayAssignee,
  pendingStatusIssueIds = new Set(),
}) => {
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [openMenuIssueId, setOpenMenuIssueId] = useState(null);

  // Group issues into the 5 columns
  const columnIssues = COLUMNS.map((col) => ({
    ...col,
    items: issues.filter((i) => col.match.includes(normalize(i.status))),
  }));

  const handleDragStart = (e, issue) => {
    e.dataTransfer.setData('text/plain', String(issueId(issue)));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e, col) => {
    e.preventDefault();
    setDragOverColumn(null);
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId && onStatusChange) {
      onStatusChange(draggedId, col.apiStatus);
    }
  };

  return (
    <div className="flex w-full gap-3.5 overflow-x-auto pb-4 select-none" onClick={() => setOpenMenuIssueId(null)}>
      {columnIssues.map((col) => (
        <div
          key={col.id}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverColumn(col.id); }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverColumn(null); }}
          onDrop={(e) => handleDrop(e, col)}
          className={`flex min-w-[245px] sm:min-w-[260px] max-w-[280px] flex-1 flex-col rounded-2xl transition-all ${
            dragOverColumn === col.id ? 'ring-2 ring-sky-400/70 bg-sky-50/20 dark:bg-sky-950/20' : ''
          }`}
        >
          {/* Column Header matching screenshot */}
          <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${col.bg} ${col.text} ${col.darkBg} ${col.darkText} shadow-2xs`}>
            <div className="flex items-center gap-2">
              <FiSquare size={13} className="shrink-0 stroke-[2.5]" />
              <span className="text-xs font-bold sm:text-sm">{col.label}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold">{col.items.length}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onCreateInColumn?.(col.apiStatus); }}
                title={`Add issue to ${col.label}`}
                className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-black/10 transition cursor-pointer"
              >
                <FiPlus size={13} />
              </button>
            </div>
          </div>

          {/* Column Issues Stack */}
          <div className="mt-2.5 flex flex-1 flex-col gap-2.5">
            {isLoading ? (
              <>
                <div className="h-28 rounded-xl bg-slate-200/60 dark:bg-[#252528] animate-pulse" />
                <div className="h-28 rounded-xl bg-slate-200/60 dark:bg-[#252528] animate-pulse" />
              </>
            ) : (
              <>
                {col.items.map((issue, idx) => {
                  const id = issueId(issue);
                  const assignee = displayAssignee?.(issue) || '';
                  const assigneeInitial = (assignee || 'U').slice(0, 1).toUpperCase();
                  const avatarColor = avatarColors[(assignee.charCodeAt(0) || idx) % avatarColors.length];
                  const num = issue.issueNumber || (id ? String(id).slice(-4) : idx + 1);
                  const keyBadge = issue.key || (String(num).startsWith('#') ? `WBR-${num.slice(1)}` : `WBR-${num}`);
                  const tagLabel = issue.label || issue.tag || issue.type || issue.category || (Array.isArray(issue.labels) && issue.labels[0]?.name) || (idx % 3 === 0 ? 'Analytics' : idx % 3 === 1 ? 'UX' : 'Design');
                  const tagColor = idx % 3 === 0
                    ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300'
                    : idx % 3 === 1
                    ? 'bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300'
                    : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300';

                  return (
                    <div
                      key={id || idx}
                      draggable={!pendingStatusIssueIds.has(String(id))}
                      onDragStart={(e) => handleDragStart(e, issue)}
                      onClick={() => onIssueClick?.(issue)}
                      className={`group relative rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition hover:border-sky-300 hover:shadow-md dark:border-[#303030] dark:bg-[#1e1e22] ${pendingStatusIssueIds.has(String(id)) ? 'cursor-wait opacity-70' : 'cursor-grab active:cursor-grabbing'}`}
                    >
                  {/* Top row: Issue Key + Assignee Avatar */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-sky-500 text-white text-[9px] font-bold">
                        <FiSquare size={9} />
                      </div>
                      <span className="truncate text-xs font-bold text-sky-600 dark:text-sky-400">{keyBadge}</span>
                    </div>
                    {issue.assigneeAvatar ? (
                      <img src={issue.assigneeAvatar} alt={assignee} className="h-6 w-6 shrink-0 rounded-full object-cover ring-1 ring-slate-200 dark:ring-white/10" />
                    ) : (
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-2xs ${avatarColor}`}>
                        {assigneeInitial}
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <h4 className="mt-2 line-clamp-2 text-xs font-semibold leading-snug text-slate-900 dark:text-slate-100 sm:text-sm group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                    {issue.title || 'Untitled Issue'}
                  </h4>

                  {/* Badges row: Tag/Label + Priority Badge */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tagColor}`}>
                      {tagLabel}
                    </span>
                    <PriorityBadge priority={issue.priority} />
                  </div>

                  {/* Bottom row: Due Date + Context Menu */}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-500 dark:border-[#2d2d32] dark:text-[#888]">
                    <span className="inline-flex items-center gap-1">
                      <FiCalendar size={12} className="text-slate-400" />
                      <span>{formatKanbanDate(issue.dueDate)}</span>
                    </span>

                    {/* Accessible Menu */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuIssueId(openMenuIssueId === id ? null : id);
                        }}
                        className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                        title="Actions"
                      >
                        <FiMoreHorizontal size={14} />
                      </button>

                      {openMenuIssueId === id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 bottom-6 z-30 w-36 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-[#38383e] dark:bg-[#252529] text-xs"
                        >
                          <span className="block px-2 py-1 text-[10px] font-bold uppercase text-slate-400">Move to</span>
                          {COLUMNS.map((dest) => (
                            <button
                              key={dest.id}
                              type="button"
                              disabled={pendingStatusIssueIds.has(String(id))}
                              onClick={() => {
                                onStatusChange?.(id, dest.apiStatus);
                                setOpenMenuIssueId(null);
                              }}
                              className="w-full text-left rounded-md px-2 py-1 hover:bg-slate-100 dark:hover:bg-[#333] text-slate-700 dark:text-slate-200"
                            >
                              {dest.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {col.items.length === 0 && (
              <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-[#343434] text-xs text-slate-400 dark:text-[#666]">
                No issues
              </div>
            )}
            </>
          )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default KanbanBoardView;
