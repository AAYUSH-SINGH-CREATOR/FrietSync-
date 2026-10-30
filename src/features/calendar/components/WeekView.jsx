import { useMemo } from 'react';
import { isSameDay, formatTime } from '../services/calendarApi';
import { FiClock, FiPlus } from 'react-icons/fi';

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); 

const getSourceBadgeStyle = (sourceType) => {
  switch (sourceType) {
    case 'meeting':
      return 'bg-sky-50/90 dark:bg-sky-950/80 border-sky-300 dark:border-sky-700 text-sky-800 dark:text-sky-200';
    case 'issue':
      return 'bg-rose-50/90 dark:bg-rose-950/80 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200';
    case 'sprint':
      return 'bg-emerald-50/90 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200';
    case 'milestone':
      return 'bg-purple-50/90 dark:bg-purple-950/80 border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-200';
    case 'google':
      return 'bg-blue-50/90 dark:bg-blue-950/80 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200';
    default:
      return 'bg-gray-100 dark:bg-[#252525] border-gray-300 dark:border-[#444] text-gray-800 dark:text-gray-200';
  }
};

const WeekView = ({
  currentDate,
  events = [],
  onSelectEvent,
  onSelectDate,
}) => {
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const dayIndex = (startOfWeek.getDay() + 6) % 7; 
    startOfWeek.setDate(startOfWeek.getDate() - dayIndex);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const today = new Date();

  
  const { allDayEvents, timedEvents } = useMemo(() => {
    const allDay = [];
    const timed = [];

    events.forEach((ev) => {
      if (ev.isAllDay || ev.sourceType === 'sprint' || ev.sourceType === 'milestone') {
        allDay.push(ev);
      } else {
        timed.push(ev);
      }
    });

    return { allDayEvents: allDay, timedEvents: timed };
  }, [events]);

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200/90 dark:border-[#2e2e2e] shadow-xs overflow-hidden select-none flex flex-col">
      {}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200 dark:border-[#2e2e2e] bg-gray-50/80 dark:bg-[#202020]">
        <div className="py-3 text-center text-xs font-semibold text-gray-400 dark:text-[#666] border-r border-gray-200/80 dark:border-[#2a2a2a]">
          GMT
        </div>
        {weekDays.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              className={`py-2.5 text-center border-r last:border-r-0 border-gray-200/80 dark:border-[#2a2a2a] ${
                isToday ? 'bg-sky-50/50 dark:bg-sky-950/20' : ''
              }`}
            >
              <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {day.toLocaleString('default', { weekday: 'short' })}
              </p>
              <span
                className={`inline-flex items-center justify-center text-sm font-bold mt-0.5 rounded-full ${
                  isToday
                    ? 'w-7 h-7 bg-sky-600 text-white shadow-xs'
                    : 'text-gray-800 dark:text-gray-200'
                }`}
              >
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {}
      {allDayEvents.length > 0 && (
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200 dark:border-[#2e2e2e] bg-slate-50/40 dark:bg-[#181818]">
          <div className="py-2 text-center text-[10px] font-bold text-gray-400 dark:text-[#666] uppercase tracking-wider border-r border-gray-200/80 dark:border-[#2a2a2a] self-center">
            All-Day
          </div>
          {weekDays.map((day) => {
            const dayAllDay = allDayEvents.filter((ev) => {
              const targetDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());
              const nextDay = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
              return ev.start < nextDay && ev.end >= targetDay;
            });

            return (
              <div
                key={day.toISOString()}
                className="p-1 space-y-1 min-h-[38px] border-r last:border-r-0 border-gray-200/80 dark:border-[#2a2a2a]"
              >
                {dayAllDay.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onSelectEvent(ev)}
                    className={`w-full text-left px-2 py-0.5 rounded text-[10px] font-semibold border truncate block transition cursor-pointer ${getSourceBadgeStyle(
                      ev.sourceType
                    )}`}
                    title={`${ev.title} (${ev.sourceType})`}
                  >
                    {ev.title}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {}
      <div className="max-h-[560px] overflow-y-auto divide-y divide-gray-100 dark:divide-[#252525]">
        {HOURS.map((hour) => {
          const hourLabel = `${hour > 12 ? hour - 12 : hour} ${hour >= 12 ? 'PM' : 'AM'}`;

          return (
            <div
              key={hour}
              className="grid grid-cols-[60px_repeat(7,1fr)] min-h-[52px]"
            >
              {}
              <div className="text-[10px] font-semibold text-gray-400 dark:text-[#666] text-right pr-2 pt-1 border-r border-gray-100 dark:border-[#252525] select-none">
                {hourLabel}
              </div>

              {}
              {weekDays.map((day) => {
                const isToday = isSameDay(day, today);

                
                const slotEvents = timedEvents.filter((ev) => {
                  if (!isSameDay(ev.start, day)) return false;
                  return ev.start.getHours() === hour;
                });

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => {
                      const slotDate = new Date(day);
                      slotDate.setHours(hour, 0, 0, 0);
                      onSelectDate(slotDate);
                    }}
                    className={`relative border-r last:border-r-0 border-gray-100 dark:border-[#252525] p-0.5 group hover:bg-sky-50/30 dark:hover:bg-sky-950/10 transition cursor-pointer ${
                      isToday ? 'bg-sky-50/15 dark:bg-sky-950/10' : ''
                    }`}
                  >
                    {slotEvents.map((ev) => {
                      const durationMinutes = Math.max(
                        30,
                        Math.round((ev.end.getTime() - ev.start.getTime()) / (60 * 1000))
                      );
                      const heightPercent = Math.min(200, (durationMinutes / 60) * 100);

                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEvent(ev);
                          }}
                          style={{ minHeight: `${Math.max(40, heightPercent * 0.48)}px` }}
                          className={`w-full text-left p-1.5 rounded-lg border text-xs font-medium shadow-2xs transition cursor-pointer flex flex-col justify-between overflow-hidden z-10 ${getSourceBadgeStyle(
                            ev.sourceType
                          )}`}
                          title={`${ev.title} (${formatTime(ev.start)} - ${formatTime(ev.end)})`}
                        >
                          <p className="font-bold text-[11px] leading-tight truncate">{ev.title}</p>
                          <div className="flex items-center gap-1 text-[10px] opacity-80 mt-1">
                            <FiClock size={10} />
                            <span>{formatTime(ev.start)}</span>
                          </div>
                        </button>
                      );
                    })}

                    <span className="opacity-0 group-hover:opacity-100 absolute bottom-1 right-1 p-0.5 rounded text-gray-400 hover:text-sky-600 transition">
                      <FiPlus size={11} />
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeekView;

