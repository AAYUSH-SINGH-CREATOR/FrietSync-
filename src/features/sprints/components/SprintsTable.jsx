import { useMemo, useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return String(dateStr);
  }
};

const getStatusPill = (status) => {
  const norm = String(status || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (['COMPLETED', 'CLOSED', 'DONE'].includes(norm)) {
    return { label: 'Completed', className: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' };
  }
  if (['ACTIVE', 'IN_PROGRESS', 'STARTED'].includes(norm)) {
    return { label: 'Active', className: 'border-sky-500/30 bg-sky-500/15 text-sky-600 dark:text-sky-300' };
  }
  if (['IN_REVIEW', 'REVIEW', 'TESTING'].includes(norm)) {
    return { label: 'In review', className: 'border-pink-500/30 bg-pink-500/15 text-pink-600 dark:text-pink-300' };
  }
  return { label: 'Planned', className: 'border-purple-500/30 bg-purple-500/15 text-purple-600 dark:text-purple-300' };
};

const avatarColors = ['bg-pink-600', 'bg-blue-600', 'bg-purple-600', 'bg-emerald-600', 'bg-sky-600', 'bg-amber-600'];

const SprintsTable = ({
  sprints = [],
  isLoading = false,
  onSprintClick,
  page = 0,
  pageSize = 10,
  onPageChange,
}) => {
  const [selectedIds, setSelectedIds] = useState(new Set());

  const paginatedSprints = useMemo(() => {
    const start = page * pageSize;
    return sprints.slice(start, start + pageSize);
  }, [sprints, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(sprints.length / pageSize));

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedSprints.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedSprints.map((s) => String(s.id || s._id))));
    }
  };

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs dark:border-[#2b2b30] dark:bg-[#1f1f1f]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[850px] border-collapse text-left text-xs">
          <thead>
            <tr className="h-10 border-b border-slate-200 bg-slate-100/70 text-[11px] font-semibold text-slate-700 dark:border-[#2b2b30] dark:bg-[#1b1b1b] dark:text-[#aaa]">
              <th className="w-10 px-4">
                <input
                  type="checkbox"
                  aria-label="Select all sprints"
                  checked={paginatedSprints.length > 0 && selectedIds.size === paginatedSprints.length}
                  onChange={toggleSelectAll}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-sky-500 cursor-pointer"
                />
              </th>
              <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-400 dark:text-[#888]">Sprint</th>
              <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-400 dark:text-[#888]">Goal</th>
              <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-400 dark:text-[#888]">Start date</th>
              <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-400 dark:text-[#888]">End date</th>
              <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-400 dark:text-[#888]">Status</th>
              <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-400 dark:text-[#888]">Progress</th>
              <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-400 dark:text-[#888]">Assignee</th>
              <th className="px-4 py-2.5 font-bold uppercase tracking-wider text-slate-400 dark:text-[#888]">Velocity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#26262b]">
            {isLoading ? (
              Array.from({ length: 5 }, (_, i) => (
                <tr key={i} className="h-14 animate-pulse">
                  <td colSpan="9" className="px-4"><div className="h-4 rounded bg-slate-100 dark:bg-[#25252a]" /></td>
                </tr>
              ))
            ) : paginatedSprints.length === 0 ? (
              <tr>
                <td colSpan="9" className="py-12 text-center text-slate-400">
                  No sprints match the selected criteria.
                </td>
              </tr>
            ) : (
              paginatedSprints.map((sprint, idx) => {
                const id = String(sprint.id || sprint._id || idx);
                const isSelected = selectedIds.has(id);
                const statusPill = getStatusPill(sprint.status || sprint.state);
                const num = sprint.sprintNumber || sprint.number || (sprint.id ? String(sprint.id).slice(-2) : idx + 1);
                const sprintKey = sprint.key || `SPR-${num}`;

                // Calculate progress
                let progress = 0;
                if (typeof sprint.progress === 'number') progress = sprint.progress;
                else if (statusPill.label === 'Completed') progress = 100;
                else if (statusPill.label === 'In review') progress = 90;
                else if (statusPill.label === 'Active') progress = 67;

                const progressColor = progress >= 100 ? 'bg-emerald-500' : progress >= 80 ? 'bg-pink-500' : progress > 0 ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-700';

                // Assignee derivation
                const assigneeName = sprint.contributorName || sprint.contributor?.name || sprint.assigneeName || sprint.assignedTo?.name || 'HV';
                const assigneeInitials = assigneeName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'HV';
                const avatarColor = avatarColors[(assigneeName.charCodeAt(0) || idx) % avatarColors.length];

                // Velocity derivation
                const velocity = sprint.velocity ?? sprint.storyPoints ?? sprint.estimatedPoints ?? sprint.issuesCount ?? (24 + (idx % 7));

                return (
                  <tr
                    key={id}
                    onClick={() => onSprintClick?.(sprint)}
                    className="group h-13 cursor-pointer transition hover:bg-slate-50/80 dark:hover:bg-[#292929]"
                  >
                    <td className="px-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${sprint.name || 'sprint'}`}
                        checked={isSelected}
                        onChange={(e) => toggleSelect(id, e)}
                        className="h-3.5 w-3.5 rounded border-slate-300 accent-sky-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <span className="block font-mono text-xs font-bold text-sky-600 hover:underline dark:text-sky-400">
                        {sprintKey}
                      </span>
                      <span className="block text-xs font-medium text-slate-800 dark:text-[#eee] truncate max-w-[170px]">
                        {sprint.name || 'Untitled Sprint'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-[#aaa] truncate max-w-[200px]" title={sprint.goal}>
                      {sprint.goal || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-slate-600 dark:text-[#bbb]">
                      {formatDate(sprint.startDate)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-slate-600 dark:text-[#bbb]">
                      {formatDate(sprint.endDate)}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusPill.className}`}>
                        {statusPill.label}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 rounded-full bg-slate-200 dark:bg-[#303035] overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-300 ${progressColor}`} style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-[#ccc] w-8">{progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-2xs ${avatarColor}`}>
                          {assigneeInitials}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-[#888]">+4</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs font-semibold text-slate-700 dark:text-[#ddd]">
                      {velocity}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer matching screenshot */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-[#2b2b30] dark:text-[#999]">
        <span>
          Showing {sprints.length === 0 ? 0 : page * pageSize + 1}–{Math.min((page + 1) * pageSize, sprints.length)} of {sprints.length} sprints
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 0}
            onClick={() => onPageChange?.(page - 1)}
            aria-label="Previous page"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 dark:border-[#35353a] dark:hover:bg-[#252528] cursor-pointer"
          >
            <FiChevronLeft size={14} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onPageChange?.(i)}
              className={`flex h-7 min-w-7 items-center justify-center rounded-lg px-2 text-xs font-semibold cursor-pointer ${
                page === i
                  ? 'bg-sky-600 text-white'
                  : 'border border-slate-200 hover:bg-slate-50 dark:border-[#35353a] dark:hover:bg-[#252528] text-slate-700 dark:text-[#ccc]'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => onPageChange?.(page + 1)}
            aria-label="Next page"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-30 dark:border-[#35353a] dark:hover:bg-[#252528] cursor-pointer"
          >
            <FiChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SprintsTable;
