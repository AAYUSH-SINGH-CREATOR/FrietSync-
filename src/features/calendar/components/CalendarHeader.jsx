import {
  FiChevronLeft,
  FiChevronRight,
  FiCalendar,
  FiPlus,
  FiFilter,
  FiCheck,
  FiLink,
  FiX,
  FiLayers,
} from 'react-icons/fi';

const CATEGORIES = [
  { id: 'meeting', label: 'Meetings', color: 'bg-sky-500' },
  { id: 'issue', label: 'Issues & Deadlines', color: 'bg-rose-500' },
  { id: 'sprint', label: 'Sprints', color: 'bg-emerald-500' },
  { id: 'milestone', label: 'Milestones', color: 'bg-purple-500' },
  { id: 'google', label: 'Google Calendar', color: 'bg-blue-600' },
];

const VIEWS = [
  { id: 'month', label: 'Month' },
  { id: 'week', label: 'Week' },
  { id: 'day', label: 'Day' },
  { id: 'agenda', label: 'Agenda' },
];

const CalendarHeader = ({
  currentDate,
  view,
  onViewChange,
  onNavigate,
  onToday,
  projects = [],
  selectedProject,
  onProjectChange,
  activeCategories,
  onToggleCategory,
  onOpenCreateMeeting,
  isGoogleConnected,
  onConnectGoogle,
  onDisconnectGoogle,
  isConnectingGoogle,
}) => {
  const getHeaderDateLabel = () => {
    const year = currentDate.getFullYear();
    const monthName = currentDate.toLocaleString('default', { month: 'long' });

    if (view === 'month') {
      return `${monthName} ${year}`;
    }
    if (view === 'week') {
      const startOfWeek = new Date(currentDate);
      const dayIndex = (startOfWeek.getDay() + 6) % 7; // Monday start
      startOfWeek.setDate(startOfWeek.getDate() - dayIndex);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const startMonth = startOfWeek.toLocaleString('default', { month: 'short' });
      const endMonth = endOfWeek.toLocaleString('default', { month: 'short' });
      const startDay = startOfWeek.getDate();
      const endDay = endOfWeek.getDate();

      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `${startMonth} ${startDay} – ${endDay}, ${year}`;
      }
      return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
    }
    if (view === 'day') {
      return currentDate.toLocaleString('default', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    return `Agenda • ${monthName} ${year}`;
  };

  return (
    <div className="space-y-3.5 mb-5 select-none">
      {/* Top Bar: Title, Date Navigator, View Switcher & Primary Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-[#1a1a1a] p-3 sm:p-4 rounded-2xl border border-gray-200/90 dark:border-[#2e2e2e] shadow-2xs">
        {/* Left: Title, Today & Date Navigation */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 mr-1">
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
              <FiCalendar size={18} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
              Calendar
            </h1>
          </div>

          <button
            type="button"
            onClick={onToday}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 dark:border-[#383838] hover:bg-gray-100 dark:hover:bg-[#2a2a2a] text-gray-700 dark:text-gray-200 transition cursor-pointer"
          >
            Today
          </button>

          <div className="flex items-center rounded-lg border border-gray-200 dark:border-[#383838] overflow-hidden">
            <button
              type="button"
              onClick={() => onNavigate(-1)}
              title="Previous"
              aria-label="Previous"
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] text-gray-600 dark:text-gray-300 transition cursor-pointer"
            >
              <FiChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => onNavigate(1)}
              title="Next"
              aria-label="Next"
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] text-gray-600 dark:text-gray-300 transition cursor-pointer border-l border-gray-200 dark:border-[#383838]"
            >
              <FiChevronRight size={16} />
            </button>
          </div>

          <span className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100 ml-1">
            {getHeaderDateLabel()}
          </span>
        </div>

        {/* Right: View Switcher, Google status, and Schedule Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Notion-style Segmented View Switcher */}
          <div className="flex items-center p-0.5 rounded-xl bg-gray-100 dark:bg-[#252525] border border-gray-200/60 dark:border-[#333]">
            {VIEWS.map((v) => {
              const isActive = view === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onViewChange(v.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white shadow-xs'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {v.label}
                </button>
              );
            })}
          </div>

          {/* Schedule Meeting Primary Action */}
          <button
            type="button"
            onClick={onOpenCreateMeeting}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 shadow-sm shadow-sky-600/20 transition cursor-pointer"
          >
            <FiPlus size={16} />
            <span>Schedule</span>
          </button>
        </div>
      </div>

      {/* Filter Row: Project selector & Category Toggle Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/70 dark:bg-[#1a1a1a]/70 backdrop-blur-xs p-2.5 sm:px-3.5 rounded-xl border border-gray-200/80 dark:border-[#2e2e2e]">
        {/* Left: Categories */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-xs font-semibold text-gray-400 dark:text-[#777] flex items-center gap-1 mr-1">
            <FiFilter size={13} />
            <span>Filter:</span>
          </span>

          {CATEGORIES.map((cat) => {
            const isSelected = activeCategories.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onToggleCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer border ${
                  isSelected
                    ? 'bg-gray-100 dark:bg-[#292929] border-gray-300 dark:border-[#444] text-gray-900 dark:text-gray-100 shadow-2xs'
                    : 'bg-transparent border-transparent text-gray-400 dark:text-[#666] hover:bg-gray-50 dark:hover:bg-[#222]'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${cat.color} ${
                    isSelected ? 'opacity-100' : 'opacity-40'
                  }`}
                />
                <span>{cat.label}</span>
                {isSelected && <FiCheck size={11} className="text-gray-600 dark:text-gray-300 ml-0.5" />}
              </button>
            );
          })}
        </div>

        {/* Right: Project Selector & Google Calendar Connect Action */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Project Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <FiLayers size={13} />
            <select
              value={selectedProject}
              onChange={(e) => onProjectChange(e.target.value)}
              aria-label="Filter calendar by project"
              className="bg-transparent text-xs font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-300 dark:border-[#444] focus:outline-none focus:border-sky-500 py-0.5 pr-2 cursor-pointer"
            >
              <option value="all" className="dark:bg-[#1f1f1f]">All Projects</option>
              {projects.map((p) => {
                const pid = p.id || p._id;
                return (
                  <option key={pid} value={pid} className="dark:bg-[#1f1f1f]">
                    {p.name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Google Calendar status / button */}
          {isGoogleConnected ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Google Connected</span>
              <button
                type="button"
                onClick={onDisconnectGoogle}
                title="Disconnect Google Calendar"
                className="ml-1 text-slate-400 hover:text-rose-500 transition cursor-pointer"
              >
                <FiX size={12} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onConnectGoogle}
              disabled={isConnectingGoogle}
              title="Connect Google Calendar via OAuth"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-[#383838] hover:bg-gray-100 dark:hover:bg-[#252525] text-[11px] font-medium text-gray-700 dark:text-gray-300 transition cursor-pointer disabled:opacity-50"
            >
              <FiLink size={12} className="text-blue-500" />
              <span>{isConnectingGoogle ? 'Connecting…' : 'Sync Google'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarHeader;
