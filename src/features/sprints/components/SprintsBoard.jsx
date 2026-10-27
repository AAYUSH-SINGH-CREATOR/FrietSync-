import { useRef, useState } from 'react';
import { FiCalendar, FiClock, FiPlus } from 'react-icons/fi';

const COLUMNS = [
  { id: 'PLANNED', label: 'Planned', bg: 'bg-[#CBB0FF]', text: 'text-[#2e1065]', darkBg: 'dark:bg-[#4c3875]', darkText: 'dark:text-[#E9D8FD]', match: ['PLANNED'] },
  { id: 'ACTIVE', label: 'Active', bg: 'bg-[#9BD4FD]', text: 'text-[#0c4a6e]', darkBg: 'dark:bg-[#1E3A5F]', darkText: 'dark:text-[#BAE6FD]', match: ['ACTIVE'] },
  { id: 'COMPLETED', label: 'Completed', bg: 'bg-[#86EFAC]', text: 'text-[#14532d]', darkBg: 'dark:bg-[#1C4D2E]', darkText: 'dark:text-[#BBF7D0]', match: ['COMPLETED'] },
];

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return String(dateStr);
  }
};

const avatarColors = ['bg-pink-600', 'bg-blue-600', 'bg-purple-600', 'bg-emerald-600', 'bg-sky-600'];

const SprintsBoard = ({
  sprints = [],
  isLoading = false,
  onSprintClick,
  onCreateSprint,
  onStatusChange,
  pendingSprintIds = new Set(),
}) => {
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const draggedSprintRef = useRef(null);
  const suppressClickRef = useRef(false);
  const columnSprints = COLUMNS.map((col) => ({
    ...col,
    items: sprints.filter((s) => {
      const norm = String(s.status || s.state || 'PLANNED').toUpperCase().replace(/[\s-]+/g, '_');
      return col.match.includes(norm);
    }),
  }));

  return (
    <div className="grid w-full grid-flow-col auto-cols-[minmax(260px,1fr)] gap-3.5 overflow-x-auto pb-4 select-none">
      {columnSprints.map((col) => (
        <div
          key={col.id}
          id={`sprint-column-${col.id}`}
          onDragOver={(event) => {
            if (!draggedSprintRef.current) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            setDragOverColumn(col.id);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setDragOverColumn(null);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragOverColumn(null);
            const dragged = draggedSprintRef.current;
            if (dragged && onStatusChange) onStatusChange(dragged.sprint, dragged.columnId, col.id);
            draggedSprintRef.current = null;
          }}
          className={`flex min-w-0 flex-col rounded-2xl transition ${dragOverColumn === col.id ? 'ring-2 ring-sky-400/70 bg-sky-50/30 dark:bg-sky-950/20' : ''}`}
        >
          {/* Column Header */}
          <div className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 ${col.bg} ${col.text} ${col.darkBg} ${col.darkText} shadow-2xs`}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold sm:text-sm">{col.label}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold">{col.items.length}</span>
              {onCreateSprint && (
                <button
                  type="button"
                  onClick={onCreateSprint}
                  title={`Add sprint to ${col.label}`}
                  className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-black/10 transition cursor-pointer"
                >
                  <FiPlus size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Cards Stack */}
          <div className="mt-2.5 flex flex-1 flex-col gap-2.5">
            {isLoading ? (
              <>
                <div className="h-32 rounded-xl bg-slate-100 dark:bg-[#252528] animate-pulse" />
                <div className="h-32 rounded-xl bg-slate-100 dark:bg-[#252528] animate-pulse" />
              </>
            ) : col.items.map((sprint, idx) => {
              const id = sprint.id || sprint.sprintId || sprint._id;
              const stableId = id ? String(id) : sprint.key ? String(sprint.key) : `sprint-${sprint.sprintNumber || sprint.number || idx}`;
              const normalizedStatus = String(sprint.status || sprint.state || 'PLANNED').toUpperCase().replace(/[\s-]+/g, '_');
              const sourceColumn = COLUMNS.find((column) => column.match.includes(normalizedStatus));
              const isPending = id && pendingSprintIds.has(String(id));
              const num = sprint.sprintNumber || sprint.number || (sprint.id ? String(sprint.id).slice(-2) : idx + 1);
              const sprintKey = sprint.key || `SPR-${num}`;
              const assigneeName = sprint.contributorName || sprint.contributor?.name || sprint.assigneeName || 'Unassigned';
              const assigneeInitials = assigneeName === 'Unassigned' ? '—' : assigneeName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
              const avatarColor = avatarColors[(assigneeName.charCodeAt(0) || idx) % avatarColors.length];
              const rawProgress = sprint.progress;
              const parsedProgress = rawProgress === null || rawProgress === undefined || rawProgress === '' ? Number.NaN : Number(rawProgress);
              const progress = Number.isFinite(parsedProgress) && parsedProgress >= 0 && parsedProgress <= 100 ? parsedProgress : null;

              return (
                <div
                  key={stableId}
                  draggable={Boolean(id) && !isPending}
                  onDragStart={(event) => {
                    if (!id) return;
                    draggedSprintRef.current = { sprint, columnId: sourceColumn?.id || col.id };
                    suppressClickRef.current = true;
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', String(id));
                    event.dataTransfer.setData('application/x-frietsync-sprint-id', String(id));
                  }}
                  onDragEnd={() => {
                    draggedSprintRef.current = null;
                    setDragOverColumn(null);
                    window.setTimeout(() => { suppressClickRef.current = false; }, 250);
                  }}
                  onClick={() => {
                    if (suppressClickRef.current) return;
                    onSprintClick?.(sprint);
                  }}
                  className={`group rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition hover:border-sky-400 hover:shadow-md dark:border-[#2e2e34] dark:bg-[#1a1a1d] ${id && !isPending ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${isPending ? 'opacity-60' : ''}`}
                >
                  {/* Top: Key & Assignee */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
                      {sprintKey}
                    </span>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-2xs ${avatarColor}`}>
                      {assigneeInitials}
                    </span>
                  </div>

                  {/* Title & Goal */}
                  <h4 className="mt-1.5 text-xs font-bold text-slate-900 group-hover:text-sky-600 dark:text-slate-100 dark:group-hover:text-sky-400 line-clamp-1 transition-colors">
                    {sprint.name || 'Untitled Sprint'}
                  </h4>
                  {sprint.projectName && (
                    <p className="mt-0.5 text-[10px] font-medium text-slate-400 dark:text-[#888] line-clamp-1">
                      {sprint.projectName}
                    </p>
                  )}
                  {sprint.goal && (
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-[#999] line-clamp-2">
                      {sprint.goal}
                    </p>
                  )}

                  {/* Progress bar */}
                  <div className="mt-2.5 flex items-center gap-2">
                    {progress === null ? (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Progress unavailable</span>
                    ) : (
                      <>
                        <div className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-[#28282c] overflow-hidden" role="progressbar" aria-label={`${sprint.name || 'Sprint'} progress`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                          <div
                            className={`h-full rounded-full ${
                              progress >= 100 ? 'bg-emerald-500' : progress >= 80 ? 'bg-pink-500' : progress > 0 ? 'bg-sky-500' : 'bg-slate-300'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-[#bbb]">{progress}%</span>
                      </>
                    )}
                  </div>

                  {/* Footer Dates */}
                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400 dark:border-[#252528] dark:text-[#777]">
                    <span className="inline-flex items-center gap-1">
                      <FiCalendar size={11} />
                      <span>{formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}</span>
                    </span>
                    {sprint.milestoneName && (
                      <span className="truncate max-w-[80px]" title={sprint.milestoneName}>
                        {sprint.milestoneName}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {!isLoading && col.items.length === 0 && (
              <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-[#2d2d32] text-xs text-slate-400 dark:text-[#666]">
                <FiClock className="mr-1.5 opacity-60" /> No sprints
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SprintsBoard;

