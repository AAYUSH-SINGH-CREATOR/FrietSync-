import { FiFolder, FiActivity, FiAlertCircle, FiCheckSquare } from 'react-icons/fi';

const SummaryCard = ({ icon: Icon, label, value, hint, iconBg, iconColor }) => (
  <div className="flex flex-1 min-w-[200px] items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-[#2b2b30] dark:bg-[#1f1f1f]">
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} ${iconColor} shadow-2xs`}>
      <Icon size={20} />
    </div>
    <div className="min-w-0">
      <p className="truncate text-xs font-medium text-slate-500 dark:text-[#999]">{label}</p>
      <div className="flex items-baseline gap-2 mt-0.5">
        <span className="text-xl font-bold leading-none text-slate-900 dark:text-white">{value}</span>
      </div>
      <p className="truncate text-[11px] text-slate-400 dark:text-[#777] mt-1">{hint}</p>
    </div>
  </div>
);

const SprintsSummaryCards = ({ totalSprints = 0, activeSprints = 0, openIssues = 0, completedSprints = 0 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      <SummaryCard
        icon={FiFolder}
        label="Total sprints"
        value={totalSprints}
        hint="Across selected project"
        iconBg="bg-indigo-50 dark:bg-[#2A2346]"
        iconColor="text-indigo-600 dark:text-[#A78BFA]"
      />
      <SummaryCard
        icon={FiActivity}
        label="Active sprints"
        value={activeSprints}
        hint="In progress"
        iconBg="bg-purple-50 dark:bg-[#2A2346]"
        iconColor="text-purple-600 dark:text-[#A78BFA]"
      />
      <SummaryCard
        icon={FiAlertCircle}
        label="Open issues"
        value={openIssues}
        hint="Across project"
        iconBg="bg-rose-50 dark:bg-[#432328]"
        iconColor="text-rose-600 dark:text-[#F87171]"
      />
      <SummaryCard
        icon={FiCheckSquare}
        label="Completed sprints"
        value={completedSprints}
        hint="Completed"
        iconBg="bg-emerald-50 dark:bg-[#1C3A2A]"
        iconColor="text-emerald-600 dark:text-[#4ADE80]"
      />
    </div>
  );
};

export default SprintsSummaryCards;

