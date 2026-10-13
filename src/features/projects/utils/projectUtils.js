import { getUserProfile } from '../../auth/services/authApi';

export const formatDate = (dateStr) => {
  if (!dateStr) return 'Not set';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
};

export const getStatusBadge = (status) => {
  const norm = (status || '').toUpperCase();
  switch (norm) {
    case 'ACTIVE':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-[#34D399] border-emerald-200 dark:border-emerald-800/60',
        dot: 'bg-emerald-500',
        label: 'Active',
      };
    case 'PLANNING':
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-[#FBBF24] border-amber-200 dark:border-amber-800/60',
        dot: 'bg-amber-500',
        label: 'Planning',
      };
    case 'COMPLETED':
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-[#60A5FA] border-blue-200 dark:border-blue-800/60',
        dot: 'bg-blue-500',
        label: 'Completed',
      };
    case 'ON_HOLD':
      return {
        bg: 'bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1] border-slate-200 dark:border-[#334155]',
        dot: 'bg-slate-500',
        label: 'On Hold',
      };
    default:
      return {
        bg: 'bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1] border-slate-200 dark:border-[#334155]',
        dot: 'bg-slate-400',
        label: status || 'General',
      };
  }
};

export const getRemainingDaysInfo = (deadlineStr, status) => {
  if (!deadlineStr || (status || '').toUpperCase() === 'COMPLETED') return null;
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const deadline = new Date(deadlineStr);
    deadline.setHours(0, 0, 0, 0);
    if (isNaN(deadline.getTime())) return null;

    const diffDays = Math.round((deadline - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return {
        text: `${Math.abs(diffDays)}d overdue`,
        className: 'text-rose-600 dark:text-[#F87171] bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60',
      };
    }
    if (diffDays === 0) {
      return {
        text: 'Due today',
        className: 'text-amber-600 dark:text-[#FBBF24] bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60',
      };
    }
    return {
      text: `${diffDays}d left`,
      className: 'text-sky-600 dark:text-[#60A5FA] bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/60',
    };
  } catch {
    return null;
  }
};

export const getRoleBadge = (role) => {
  const norm = (role || '').toUpperCase();
  switch (norm) {
    case 'ADMIN':
      return 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-[#C084FC] border-purple-200 dark:border-purple-800/60';
    case 'PROJECT_MANAGER':
      return 'bg-sky-50 dark:bg-blue-950/40 text-sky-700 dark:text-[#60A5FA] border-sky-200 dark:border-sky-800/60';
    case 'TEAM_LEAD':
    case 'LEAD':
      return 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-[#818CF8] border-indigo-200 dark:border-indigo-800/60';
    case 'CONTRIBUTOR':
      return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-[#34D399] border-emerald-200 dark:border-emerald-800/60';
    case 'REPORTER':
    case 'VIEWER':
      return 'bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1] border-slate-200 dark:border-[#334155]';
    default:
      return 'bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-[#CBD5E1] border-slate-200 dark:border-[#334155]';
  }
};

export const isUserAdmin = () => {
  const profile = getUserProfile();
  const role = (profile?.role || '').trim().toUpperCase();
  return ['ADMIN', 'WORKSPACE_ADMIN', 'OWNER'].includes(role);
};

export const PROJECT_STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PLANNING', label: 'Planning' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ON_HOLD', label: 'On Hold' },
];

export const PROJECT_MEMBER_ROLES = [
  { value: 'CONTRIBUTOR', label: 'Contributor' },
  { value: 'PROJECT_MANAGER', label: 'Project Manager' },
  { value: 'TEAM_LEAD', label: 'Team Lead' },
  { value: 'REPORTER', label: 'Reporter' },
  { value: 'VIEWER', label: 'Viewer' },
  { value: 'ADMIN', label: 'Admin' },
];

