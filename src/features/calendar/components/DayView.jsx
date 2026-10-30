import { useMemo } from 'react';
import { isSameDay, formatTime } from '../services/calendarApi';
import { FiClock, FiPlus, FiUsers, FiTag } from 'react-icons/fi';

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); 

const getSourceBadgeStyle = (sourceType) => {
  switch (sourceType) {
    case 'meeting':
      return 'bg-sky-50 dark:bg-sky-950/70 border-sky-300 dark:border-sky-700 text-sky-800 dark:text-sky-200';
    case 'issue':
      return 'bg-rose-50 dark:bg-rose-950/70 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200';
    case 'sprint':
      return 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200';
    case 'milestone':
      return 'bg-purple-50 dark:bg-purple-950/70 border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-200';
    case 'google':
      return 'bg-blue-50 dark:bg-blue-950/70 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200';
    default:
      return 'bg-gray-100 dark:bg-[#252525] border-gray-300 dark:border-[#444] text-gray-800 dark:text-gray-200';
  }
};

const DayView = ({
  currentDate,
  events = [],
  onSelectEvent,
  onSelectDate,
}) => {
  const { allDayEvents, timedEvents } = useMemo(() => {
    const allDay = [];
    const timed = [];

    events.forEach((ev) => {
      const targetDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
      const nextDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 1);
      const isToday = ev.start < nextDay && ev.end >= targetDay;

      if (isToday) {
        if (ev.isAllDay || ev.sourceType === 'sprint' || ev.sourceType === 'milestone') {
          allDay.push(ev);
        } else {
          timed.push(ev);
        }
      }
    });

    return { allDayEvents: allDay, timedEvents: timed };
  }, [events, currentDate]);

  const today = new Date();
  const isToday = isSameDay(currentDate, today);

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200/90 dark:border-[#2e2e2e] shadow-xs overflow-hidden select-none">
      {}
      <div className="p-4 border-b border-gray-200 dark:border-[#2e2e2e] bg-gray-50/70 dark:bg-[#202020] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center justify-center text-lg font-bold rounded-2xl ${
              isToday
                ? 'w-10 h-10 bg-sky-600 text-white shadow-xs'
                : 'w-10 h-10 bg-gray-200 dark:bg-[#2b2b2b] text-gray-800 dark:text-gray-200'
            }`}
          >
            {currentDate.getDate()}
          </span>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {currentDate.toLocaleString('default', { weekday: 'long' })}
            </h2>
            <p className="text-xs text-gray-500 dark:text-[#888]">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onSelectDate(currentDate)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/40 transition cursor-pointer"
        >
          <FiPlus size={14} />
          <span>Add Meeting</span>
        </button>
      </div>

      {}
      {allDayEvents.length > 0 && (
        <div className="p-3 border-b border-gray-200 dark:border-[#2e2e2e] bg-slate-50/40 dark:bg-[#181818] space-y-2">
          <span className="text-[10px] font-bold text-gray-400 dark:text-[#666] uppercase tracking-wider">
            All-Day & Milestones
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {allDayEvents.map((ev) => (
              <button
                key={ev.id}
                type="button"
                onClick={() => onSelectEvent(ev)}
                className={`text-left p-2.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${getSourceBadgeStyle(
                  ev.sourceType
                )}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-xs truncate">{ev.title}</p>
                  <span className="text-[10px] font-semibold uppercase opacity-75 shrink-0">
                    {ev.sourceType}
                  </span>
                </div>
                {ev.projectName && (
                  <p className="text-[11px] opacity-80 mt-1 truncate">
                    {ev.projectName}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {}
      <div className="max-h-[580px] overflow-y-auto divide-y divide-gray-100 dark:divide-[#252525]">
        {HOURS.map((hour) => {
          const hourLabel = `${hour > 12 ? hour - 12 : hour} ${hour >= 12 ? 'PM' : 'AM'}`;
          const hourEvents = timedEvents.filter((ev) => ev.start.getHours() === hour);

          return (
            <div
              key={hour}
              className="grid grid-cols-[70px_1fr] min-h-[64px] hover:bg-slate-50/50 dark:hover:bg-[#1c1c1c] transition group"
            >
              {}
              <div className="text-xs font-semibold text-gray-400 dark:text-[#666] text-right pr-3 pt-2 border-r border-gray-100 dark:border-[#252525]">
                {hourLabel}
              </div>

              {}
              <div
                onClick={() => {
                  const slotDate = new Date(currentDate);
                  slotDate.setHours(hour, 0, 0, 0);
                  onSelectDate(slotDate);
                }}
                className="p-1.5 flex flex-col gap-2 relative cursor-pointer"
              >
                {hourEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(ev);
                    }}
                    className={`p-3 rounded-xl border shadow-2xs transition cursor-pointer ${getSourceBadgeStyle(
                      ev.sourceType
                    )}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                        {ev.title}
                      </p>
                      <span className="text-xs font-semibold flex items-center gap-1 opacity-80 shrink-0">
                        <FiClock size={12} />
                        {formatTime(ev.start)} – {formatTime(ev.end)}
                      </span>
                    </div>

                    {ev.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                        {ev.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-xs opacity-80 mt-2">
                      {ev.projectName && (
                        <span className="flex items-center gap-1">
                          <FiTag size={11} />
                          {ev.projectName}
                        </span>
                      )}
                      {ev.attendees && ev.attendees.length > 0 && (
                        <span className="flex items-center gap-1">
                          <FiUsers size={11} />
                          {ev.attendees.length} attendee{ev.attendees.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                <span className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 text-xs font-semibold text-gray-400 flex items-center gap-1">
                  <FiPlus size={13} />
                  <span>Schedule</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DayView;

