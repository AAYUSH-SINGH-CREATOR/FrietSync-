import { useMemo } from 'react';
import { isSameDay, formatTime } from '../services/calendarApi';
import { FiClock, FiCalendar, FiTag, FiCheckCircle } from 'react-icons/fi';

const getSourceBadgeStyle = (sourceType) => {
  switch (sourceType) {
    case 'meeting':
      return 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-300';
    case 'issue':
      return 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300';
    case 'sprint':
      return 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300';
    case 'milestone':
      return 'bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300';
    case 'google':
      return 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300';
    default:
      return 'bg-gray-100 dark:bg-[#252525] border-gray-300 dark:border-[#444] text-gray-800 dark:text-gray-200';
  }
};

const AgendaView = ({
  events = [],
  onSelectEvent,
}) => {
  // Sort events chronologically and group by date
  const groupedEvents = useMemo(() => {
    // Filter events starting around currentDate month or upcoming
    const sorted = [...events].sort((a, b) => a.start.getTime() - b.start.getTime());

    const groups = [];
    const dateMap = new Map();

    sorted.forEach((event) => {
      const key = `${event.start.getFullYear()}-${event.start.getMonth()}-${event.start.getDate()}`;
      if (!dateMap.has(key)) {
        const groupObj = {
          date: new Date(event.start.getFullYear(), event.start.getMonth(), event.start.getDate()),
          items: [],
        };
        dateMap.set(key, groupObj);
        groups.push(groupObj);
      }
      dateMap.get(key).items.push(event);
    });

    return groups;
  }, [events]);

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  if (groupedEvents.length === 0) {
    return (
      <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200/90 dark:border-[#2e2e2e] p-12 text-center select-none shadow-xs">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-[#252525] text-gray-400 dark:text-[#777] mx-auto flex items-center justify-center mb-3">
          <FiCalendar size={22} />
        </div>
        <h3 className="text-base font-bold text-gray-800 dark:text-gray-200">
          No events scheduled
        </h3>
        <p className="text-xs text-gray-500 dark:text-[#888] mt-1 max-w-sm mx-auto">
          No meetings, issue deadlines, sprints, or milestones found for the selected filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 select-none">
      {groupedEvents.map((group) => {
        const isTodayDate = isSameDay(group.date, today);
        const isTomorrowDate = isSameDay(group.date, tomorrow);

        let datePrefix = '';
        if (isTodayDate) datePrefix = 'Today • ';
        else if (isTomorrowDate) datePrefix = 'Tomorrow • ';

        return (
          <div
            key={group.date.toISOString()}
            className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200/90 dark:border-[#2e2e2e] overflow-hidden shadow-xs"
          >
            {/* Date Header */}
            <div
              className={`px-4 py-2.5 border-b border-gray-200 dark:border-[#2e2e2e] flex items-center justify-between ${
                isTodayDate
                  ? 'bg-sky-50/70 dark:bg-sky-950/40 text-sky-800 dark:text-sky-200'
                  : 'bg-gray-50/70 dark:bg-[#202020] text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider">
                  {datePrefix}
                  {group.date.toLocaleString('default', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                {isTodayDate && (
                  <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
                )}
              </div>
              <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                {group.items.length} {group.items.length === 1 ? 'event' : 'events'}
              </span>
            </div>

            {/* Event List */}
            <div className="divide-y divide-gray-100 dark:divide-[#262626]">
              {group.items.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => onSelectEvent(ev)}
                  className="p-3 sm:p-4 hover:bg-slate-50/70 dark:hover:bg-[#222222] transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider shrink-0 mt-0.5 ${getSourceBadgeStyle(
                        ev.sourceType
                      )}`}
                    >
                      {ev.sourceType}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                        {ev.title}
                      </p>
                      {ev.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                          {ev.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {ev.projectName && (
                          <span className="flex items-center gap-1 font-medium text-gray-600 dark:text-gray-400">
                            <FiTag size={11} />
                            {ev.projectName}
                          </span>
                        )}
                        {ev.status && (
                          <span className="flex items-center gap-1 capitalize">
                            <FiCheckCircle size={11} />
                            {ev.status.toLowerCase().replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-left sm:text-right">
                    {ev.isAllDay ? (
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        All Day
                      </span>
                    ) : (
                      <div className="flex sm:flex-col items-center sm:items-end gap-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                        <span className="flex items-center gap-1">
                          <FiClock size={12} className="text-gray-400" />
                          {formatTime(ev.start)} – {formatTime(ev.end)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AgendaView;
