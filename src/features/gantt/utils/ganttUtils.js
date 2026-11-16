export const getStatusStyle = (status) => {
  const norm = String(status || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (['RESOLVED', 'CLOSED', 'DONE', 'COMPLETED'].includes(norm)) {
    return {
      bar: 'from-emerald-500 to-teal-600 text-white shadow-emerald-500/20',
      badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40',
      icon: 'FiCheckCircle',
      label: 'Resolved',
    };
  }
  if (['IN_PROGRESS', 'ACTIVE'].includes(norm)) {
    return {
      bar: 'from-sky-500 to-blue-600 text-white shadow-sky-500/20',
      badge: 'bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800/40',
      icon: 'FiClock',
      label: 'In Progress',
    };
  }
  if (['REOPENED'].includes(norm)) {
    return {
      bar: 'from-amber-500 to-orange-600 text-white shadow-amber-500/20',
      badge: 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/40',
      icon: 'FiAlertTriangle',
      label: 'Reopened',
    };
  }
  return {
    bar: 'from-indigo-500 to-purple-600 text-white shadow-purple-500/20',
    badge: 'bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800/40',
    icon: 'FiLayers',
    label: 'Open',
  };
};

export const formatMilestoneStatusInfo = (status, completed) => {
  const norm = String(status || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (isMilestoneCompleted({ status, completed })) {
    return {
      label: 'Completed',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
      dotClass: 'bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950/60',
    };
  }

  const normStatus = String(status || '').toUpperCase().replace(/[\s-]+/g, '_');
  if (['ON_TRACK'].includes(normStatus)) {
    return {
      label: 'On track',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
      dotClass: 'bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950/60',
    };
  }

  if (['IN_PROGRESS', 'ACTIVE'].includes(normStatus)) {
    return {
      label: 'In progress',
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/20 dark:border-sky-500/30',
      dotClass: 'bg-sky-500 ring-4 ring-sky-100 dark:ring-sky-950/60',
    };
  }

  return {
    label: 'Upcoming',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-700/50 dark:border-slate-600/50',
    dotClass: 'bg-purple-500 ring-4 ring-purple-100 dark:ring-purple-950/60',
  };
};

const isMilestoneCompleted = ({ status, completed }) => {
  const statusNorm = String(status || '').toUpperCase().replace(/[\s-]+/g, '_');
  const completedNorm = String(completed).toLowerCase() === 'true';

  return (
    (['RESOLVED', 'CLOSED', 'DONE', 'COMPLETED'].includes(statusNorm) && completedNorm) ||
    (['COMPLETED', 'DONE'].includes(normStatus) && completedNorm)
  );
};

export default { getStatusStyle, formatMilestoneStatusInfo, isMilestoneCompleted };