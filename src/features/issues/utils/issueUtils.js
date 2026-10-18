export const PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low', color: 'slate' },
  { value: 'MEDIUM', label: 'Medium', color: 'blue' },
  { value: 'HIGH', label: 'High', color: 'amber' },
  { value: 'CRITICAL', label: 'Critical', color: 'rose' },
];

export const getPriorityBadge = (priority) => {
  const norm = (priority || '').toUpperCase();
  switch (norm) {
    case 'CRITICAL':
    case 'URGENT':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-[#F87171] dark:border-rose-800/60';
    case 'HIGH':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-[#FBBF24] dark:border-amber-800/60';
    case 'MEDIUM':
      return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-blue-950/40 dark:text-[#60A5FA] dark:border-blue-800/60';
    case 'LOW':
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-[#e0e0e0] dark:border-[#3a3a3a]';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-[#b3b3b3] dark:border-[#3a3a3a]';
  }
};

export const getStatusBadge = (status) => {
  const norm = (status || 'OPEN').toUpperCase().replace(/[\s_-]+/g, '_');
  switch (norm) {
    case 'DONE':
    case 'RESOLVED':
    case 'CLOSED':
    case 'COMPLETED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-[#34D399] dark:border-emerald-800/60';
    case 'IN_PROGRESS':
    case 'IN_REVIEW':
    case 'ACTIVE':
      return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-blue-950/40 dark:text-[#60A5FA] dark:border-blue-800/60';
    case 'OPEN':
    case 'TODO':
    case 'BACKLOG':
      return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-[#242424] dark:text-[#e0e0e0] dark:border-[#3a3a3a]';
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-[#242424] dark:text-[#b3b3b3] dark:border-[#3a3a3a]';
  }
};

export const formatIssueDate = (dateStr) => {
  if (!dateStr) return 'No due date';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
};


export const formatFigmaDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateStr);
  }
};


export const formatEstimatedHours = (hours) => {
  if (hours === undefined || hours === null || hours === '') return 'N/A';
  const num = Number(hours);
  if (isNaN(num) || num <= 0) return '0 hrs';
  return num === 1 ? '1 hr' : `${num} hrs`;
};

