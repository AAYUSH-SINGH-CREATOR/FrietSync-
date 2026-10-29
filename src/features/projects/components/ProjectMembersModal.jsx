import { useEffect } from 'react';
import { FiPlus, FiTrash2, FiUserPlus, FiUsers } from 'react-icons/fi';
import { formatProjectRoleLabel, getRoleBadge } from '../utils/projectUtils';

const avatarColors = ['#86198f', '#0369a1', '#15803d', '#6b21a8', '#b45309', '#be123c'];
const getInitials = (name = '') => name.trim().split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || 'U';
const getAvatarColor = (name = '') => [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % avatarColors.length;

const ProjectMembersModal = ({ isOpen, onClose, members = [], isLoading, removingMemberId, canAddMember = false, onAddMember, onRemoveMember }) => {
  useEffect(() => {
    if (!isOpen) return undefined;
    const oldBodyOverflow = document.body.style.overflow;
    const oldRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    const handleKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = oldBodyOverflow;
      document.documentElement.style.overflow = oldRootOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-black/60 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="project-members-title" className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden overscroll-contain rounded-3xl border border-slate-200 dark:border-[#35353d] bg-white dark:bg-[#171717] shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-[#303038] sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"><FiUsers size={18} /></div>
            <div className="min-w-0">
              <div className="flex items-center gap-2"><h2 id="project-members-title" className="text-base font-bold text-slate-900 dark:text-white sm:text-lg">Project Members</h2><span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:bg-[#27272e] dark:text-slate-300">{members.length}</span></div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Collaborators assigned to work on this project.</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canAddMember && <button type="button" onClick={onAddMember} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-sky-700 sm:text-sm"><FiUserPlus size={15} /><span className="hidden sm:inline">Add Member</span><span className="sm:hidden">Add</span></button>}
            <button type="button" onClick={onClose} aria-label="Close members" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#292930]">×</button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((n) => <div key={n} className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-[#27272e]" />)}</div>
          ) : members.length === 0 ? (
            <div className="py-10 text-center text-slate-500 dark:text-slate-400">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No members assigned yet</p>
              <p className="mt-1 text-xs">Add collaborators so they can receive task assignments and participate in sprints.</p>
              {canAddMember && <button type="button" onClick={onAddMember} className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"><FiPlus size={13} /> Add First Member</button>}
            </div>
          ) : (
            <div className="space-y-2.5">
              {members.map((member, index) => {
                const user = member.user || member;
                const id = member.userId || member.id || member._id || user.id || user._id;
                const name = member.name || user.name || member.email?.split('@')[0] || user.email?.split('@')[0] || 'Member';
                const email = member.email || user.email || '';
                const avatar = member.profilePictureUrl || member.avatarUrl || user.profilePictureUrl || user.avatarUrl;
                const role = member.role || member.projectRole || user.role || 'CONTRIBUTOR';
                const isRemoving = String(removingMemberId) === String(id);
                return (
                  <div key={id || email || index} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 transition hover:border-slate-300 dark:border-[#2d2d34] dark:bg-[#171717] dark:hover:border-[#3d3d46]">
                    <div className="flex min-w-0 items-center gap-3.5">
                      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-white" style={{ backgroundColor: avatarColors[getAvatarColor(name || email)] }}>
                        {getInitials(name || email)}{avatar && <img src={avatar} alt={name} className="absolute inset-0 h-full w-full rounded-full object-cover" onError={(event) => event.currentTarget.remove()} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2"><p className="truncate text-xs font-bold text-slate-900 dark:text-white sm:text-sm">{name}</p><span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getRoleBadge(role)}`}>{formatProjectRoleLabel(role)}</span></div>
                        {email && <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">{email}</p>}
                      </div>
                    </div>
                    <button type="button" disabled={isRemoving} onClick={() => onRemoveMember(member)} title={`Remove ${name} from project`} aria-label={`Remove ${name} from project`} className="shrink-0 rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950/30 dark:hover:text-rose-400">
                      {isRemoving ? <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" /> : <FiTrash2 size={15} />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ProjectMembersModal;
