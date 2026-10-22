import { useState } from 'react';
import { isSameDay, isEventInDay, formatTime } from '../services/calendarApi';
import { FiPlus, FiClock, FiX } from 'react-icons/fi';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const getSourceBadgeStyle = (sourceType) => {
  switch (sourceType) {
    case 'meeting':
      return 'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800/70 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60';
    case 'issue':
      return 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/70 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60';
    case 'sprint':
      return 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/70 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60';
    case 'milestone':
      return 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800/70 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60';
    case 'google':
      return 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800/70 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60';
    default:
      return 'bg-gray-50 dark:bg-[#252525] border-gray-200 dark:border-[#383838] text-gray-700 dark:text-gray-300';
  }
};

const MonthView = ({
  currentDate,
  events = [],
  onSelectEvent,
  onSelectDate,
}) => {
  const [selectedDayPopover, setSelectedDayPopover] = useState(null);

  // Generate the 35 to 42 calendar grid cells
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // 0 is Sunday, so for Monday start:
  const firstDayIndex = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = lastDayOfMonth.getDate();

  const prevMonthLastDay = new Date(year, month, 0).getDate();

  const calendarDays = [];

  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    calendarDays.push({ date: d, isCurrentMonth: false });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    calendarDays.push({ date: d, isCurrentMonth: true });
  }

  // Next month leading days to complete full weeks
  const totalCells = Math.ceil(calendarDays.length / 7) * 7;
  const remainingDays = totalCells - calendarDays.length;
  for (let i = 1; i <= remainingDays; i++) {
    const d = new Date(year, month + 1, i);
    calendarDays.push({ date: d, isCurrentMonth: false });
  }

  const today = new Date();

  return (
    <div className="relative bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200/90 dark:border-[#2e2e2e] shadow-xs overflow-hidden select-none">
      {/* Weekday Columns Header */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-[#2e2e2e] bg-gray-50/70 dark:bg-[#222222]/60">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="py-2.5 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 divide-x divide-y divide-gray-200/80 dark:divide-[#2b2b2b]">
        {calendarDays.map(({ date, isCurrentMonth }, idx) => {
          const isToday = isSameDay(date, today);
          const dayEvents = events.filter((e) => isEventInDay(e, date));
          const maxVisible = 3;
          const visibleEvents = dayEvents.slice(0, maxVisible);
          const remainingCount = dayEvents.length - maxVisible;

          return (
            <div
              key={idx}
              className={`min-h-[110px] sm:min-h-[125px] p-1.5 sm:p-2 flex flex-col group transition-colors ${
                isCurrentMonth
                  ? 'bg-white dark:bg-[#1a1a1a] hover:bg-slate-50/50 dark:hover:bg-[#1f1f1f]'
                  : 'bg-gray-50/50 dark:bg-[#161616] text-gray-400 dark:text-[#555]'
              }`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`inline-flex items-center justify-center text-xs font-semibold rounded-full ${
                    isToday
                      ? 'w-6 h-6 bg-sky-600 text-white font-bold shadow-xs'
                      : isCurrentMonth
                      ? 'text-gray-800 dark:text-gray-200'
                      : 'text-gray-400 dark:text-[#555]'
                  }`}
                >
                  {date.getDate()}
                </span>

                {/* Quick Add Button on Cell Hover */}
                <button
                  type="button"
                  onClick={() => onSelectDate(date)}
                  title={`Add event on ${date.toLocaleDateString()}`}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-gray-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition cursor-pointer"
                >
                  <FiPlus size={13} />
                </button>
              </div>

              {/* Event Chips */}
              <div className="flex-1 space-y-1 overflow-hidden">
                {visibleEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(event);
                    }}
                    className={`w-full text-left px-2 py-0.5 rounded-md text-[11px] font-medium border truncate transition cursor-pointer flex items-center gap-1 ${getSourceBadgeStyle(
                      event.sourceType
                    )}`}
                    title={`${event.title} (${event.sourceType})`}
                  >
                    {event.sourceType === 'meeting' && (
                      <span className="shrink-0 text-[10px] opacity-75 font-normal">
                        {formatTime(event.start)}
                      </span>
                    )}
                    <span className="truncate">{event.title}</span>
                  </button>
                ))}

                {/* "+N more" badge */}
                {remainingCount > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDayPopover({ date, events: dayEvents });
                    }}
                    className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 hover:text-sky-600 dark:hover:text-sky-400 pl-1 cursor-pointer transition block"
                  >
                    +{remainingCount} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Day Events Popover (when "+N more" is clicked) */}
      {selectedDayPopover && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4"
          onClick={() => setSelectedDayPopover(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#1f1f1f] border border-gray-200 dark:border-[#383838] shadow-2xl p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#2f2f2f] pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  {selectedDayPopover.date.toLocaleString('default', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </h3>
                <p className="text-xs text-gray-500 dark:text-[#888]">
                  {selectedDayPopover.events.length} total events
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayPopover(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
              >
                <FiX size={16} />
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
              {selectedDayPopover.events.map((event) => (
                <div
                  key={event.id}
                  onClick={() => {
                    setSelectedDayPopover(null);
                    onSelectEvent(event);
                  }}
                  className={`p-2 rounded-xl border text-xs font-medium cursor-pointer transition flex items-center justify-between gap-2 ${getSourceBadgeStyle(
                    event.sourceType
                  )}`}
                >
                  <div className="min-w-0 flex-1 truncate">
                    <p className="font-semibold truncate">{event.title}</p>
                    <p className="text-[10px] opacity-75 capitalize truncate">
                      {event.projectName ? `${event.projectName} • ` : ''}
                      {event.sourceType}
                    </p>
                  </div>
                  {event.sourceType === 'meeting' && (
                    <span className="shrink-0 text-[10px] flex items-center gap-1 opacity-80">
                      <FiClock size={11} />
                      {formatTime(event.start)}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                const target = selectedDayPopover.date;
                setSelectedDayPopover(null);
                onSelectDate(target);
              }}
              className="w-full py-2 text-center text-xs font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 rounded-xl transition cursor-pointer"
            >
              + Schedule Meeting on this day
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthView;

