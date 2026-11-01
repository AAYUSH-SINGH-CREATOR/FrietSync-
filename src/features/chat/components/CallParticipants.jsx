import { FiUsers, FiX } from 'react-icons/fi';

export const CallParticipants = ({
  participants = [],
  isVisible,
  onClose,
  isDarkMode = false
}) => {
  if (!isVisible) return null;

  return (
    <div className="absolute top-16 right-4 z-[110] w-72 rounded-2xl border border-sky-200 bg-white/95 p-4 shadow-xl backdrop-blur-xl dark:border-sky-900/70 dark:bg-[#171a20]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiUsers size={16} className="text-sky-600 dark:text-sky-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Participants ({participants.length})
          </h3>
        </div>
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
        >
          <FiX size={14} />
        </button>
      </div>

      <div className="max-h-48 overflow-y-auto">
        <ul className="space-y-2">
          {participants.map((participant) => (
            <li key={participant.id} className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-sky-100 to-indigo-100 text-xs font-semibold text-sky-700 dark:from-sky-900/50 dark:to-indigo-900/50 dark:text-sky-300">
                {(participant.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-900 dark:text-white">
                  {participant.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {participant.joinedAt ? new Date(participant.joinedAt).toLocaleTimeString() : 'Joined'}
                </p>
              </div>
              <div className="flex h-2 w-2 rounded-full bg-emerald-500" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};