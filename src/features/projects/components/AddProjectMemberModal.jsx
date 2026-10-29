import { useState, useEffect } from 'react';
import {
  FiX,
  FiUserPlus,
  FiMail,
  FiShield,
  FiCheck,
  FiAlertCircle,
  FiSearch,
} from 'react-icons/fi';
import { addProjectMember, getFriendlyErrorMessage } from '../services/projectApi';
import { formatProjectRoleLabel, PROJECT_MEMBER_ROLES } from '../utils/projectUtils';
import { getActiveWorkspaceMembers } from '../../dashboard/services/workspaceApi';

const getMemberInitials = (name = '') => name.trim().split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('') || 'U';

const AddProjectMemberModal = ({
  isOpen,
  onClose,
  projectId,
  projectName = 'Project',
  existingMembers = [],
  onMemberAdded,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('CONTRIBUTOR');
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [workspaceMembersLoading, setWorkspaceMembersLoading] = useState(false);
  const [workspaceMembersError, setWorkspaceMembersError] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;

    let isMounted = true;
    setWorkspaceMembersLoading(true);
    setWorkspaceMembersError('');
    getActiveWorkspaceMembers()
      .then((members) => {
        if (isMounted) setWorkspaceMembers(Array.isArray(members) ? members : []);
      })
      .catch((error) => {
        if (isMounted) setWorkspaceMembersError(getFriendlyErrorMessage(error, 'workspace'));
      })
      .finally(() => {
        if (isMounted) setWorkspaceMembersLoading(false);
      });

    return () => { isMounted = false; };
  }, [isOpen]);

  if (!isOpen) return null;

  const normalizedMemberSearch = memberSearch.trim().toLowerCase();
  const filteredWorkspaceMembers = workspaceMembers.filter((member) => {
    const searchableText = `${member.name || ''} ${member.email || ''} ${member.role || ''}`.toLowerCase();
    return !normalizedMemberSearch || searchableText.includes(normalizedMemberSearch);
  });

  const selectWorkspaceMember = (member) => {
    const normalizedRole = String(member.role || 'CONTRIBUTOR').trim().toUpperCase().replace(/[\s-]+/g, '_');
    const projectRole = PROJECT_MEMBER_ROLES.some((option) => option.value === normalizedRole)
      ? normalizedRole
      : 'CONTRIBUTOR';
    setEmail(member.email || '');
    setRole(projectRole);
    setSelectedMemberId(String(member.userId || member.id || member._id || member.email || ''));
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setErrorMessage('Member email address is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    const isDuplicate = existingMembers.some(
      (m) => (m.email || '').toLowerCase() === trimmedEmail.toLowerCase()
    );
    if (isDuplicate) {
      setErrorMessage(`"${trimmedEmail}" is already a member of this project.`);
      return;
    }

    if (!projectId) {
      setErrorMessage('Missing project identifier.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await addProjectMember(projectId, {
        email: trimmedEmail,
        role,
      });

      if (onMemberAdded) {
        onMemberAdded(response);
      }
      onClose();
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error, 'project'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/45 dark:bg-black/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-6xl bg-white dark:bg-[#1d1d1d] rounded-3xl shadow-2xl dark:shadow-black/70 border border-gray-100 dark:border-[#303030] p-5 sm:p-7 max-h-[92vh] overflow-y-auto transition-all text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-4 border-b border-gray-100 dark:border-[#303030] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-blue-950/40 text-sky-600 dark:text-[#60A5FA] flex items-center justify-center shadow-2xs shrink-0">
              <FiUserPlus size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-[#F1F5F9] tracking-tight">
                Add Project Member
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#b3b3b3] mt-0.5 truncate max-w-[220px]">
                Add collaborator to {projectName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 dark:text-[#b3b3b3] hover:text-slate-700 dark:hover:text-[#F1F5F9] hover:bg-slate-100 dark:hover:bg-[#242424] transition cursor-pointer shrink-0 ml-4"
          >
            <FiX size={19} />
          </button>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-[#F87171] text-xs flex items-center gap-2">
            <FiAlertCircle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 dark:border-[#35353d] bg-slate-50/70 dark:bg-[#202024] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Workspace Members</h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Choose a workspace member to fill the project member form.</p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-[#2a2a30] dark:text-slate-300">{workspaceMembers.length}</span>
            </div>
            <label className="relative mb-3 block">
              <FiSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={memberSearch}
                onChange={(event) => setMemberSearch(event.target.value)}
                placeholder="Search workspace members"
                aria-label="Search workspace members"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-500 dark:border-[#3a3a42] dark:bg-[#1b1b1f] dark:text-white"
              />
            </label>
            <div className="max-h-52 space-y-2 overflow-y-auto overscroll-contain pr-1">
              {workspaceMembersLoading ? (
                <div className="space-y-2">{[0, 1].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-200/70 dark:bg-[#2a2a30]" />)}</div>
              ) : workspaceMembersError ? (
                <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">{workspaceMembersError}</p>
              ) : filteredWorkspaceMembers.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 dark:border-[#3a3a42] dark:text-slate-400">
                  {workspaceMembers.length ? 'No workspace members match your search.' : 'No workspace members found.'}
                </p>
              ) : filteredWorkspaceMembers.map((member, index) => {
                const memberId = member.userId || member.id || member._id || member.email || `workspace-member-${index}`;
                const memberEmail = member.email || '';
                const memberName = member.name || member.fullName || memberEmail.split('@')[0] || 'Workspace member';
                const memberRole = member.role || 'CONTRIBUTOR';
                const memberAvatar = member.profilePictureUrl || member.avatarUrl || member.profileImageUrl || member.user?.profilePictureUrl || member.user?.avatarUrl;
                const isSelected = selectedMemberId === String(memberId);
                const alreadyInProject = existingMembers.some((existing) =>
                  String(existing.userId || existing.id || existing._id || '').toLowerCase() === String(memberId).toLowerCase() ||
                  (existing.email || existing.user?.email || '').toLowerCase() === memberEmail.toLowerCase()
                );
                return (
                  <button
                    key={memberId}
                    type="button"
                    disabled={!memberEmail || alreadyInProject}
                    onClick={() => selectWorkspaceMember(member)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${isSelected ? 'border-sky-500 bg-sky-50 dark:border-sky-500/70 dark:bg-sky-950/20' : 'border-slate-200 bg-white hover:border-sky-300 dark:border-[#35353d] dark:bg-[#1b1b1f] dark:hover:border-sky-700'}`}
                  >
                    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-xs font-bold text-white">
                      {getMemberInitials(memberName)}
                      {memberAvatar && <img src={memberAvatar} alt={memberName} className="absolute h-10 w-10 rounded-full object-cover" onError={(event) => event.currentTarget.remove()} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">{memberName}</span>
                        <span className="rounded-md border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">{formatProjectRoleLabel(memberRole)}</span>
                        {alreadyInProject && <span className="text-[10px] font-medium text-slate-400">Already added</span>}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{memberEmail || 'No email available'}</span>
                    </span>
                    <span className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold ${isSelected ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-200 text-slate-600 dark:border-[#40404a] dark:text-slate-300'}`}>
                      {isSelected ? <FiCheck size={14} /> : 'Select'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="flex flex-col rounded-2xl border border-slate-200 dark:border-[#35353d] p-4">
            <div className="flex-1">
              <label htmlFor="add-member-email" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-[#e0e0e0]">
                Member Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 dark:text-[#b3b3b3]"><FiMail size={16} /></span>
                <input
                  id="add-member-email"
                  type="email"
                  required
                  placeholder="teammate@example.com"
                  value={email}
                  onChange={(event) => {
                    const nextEmail = event.target.value;
                    setEmail(nextEmail);
                    if (selectedMemberId && nextEmail.toLowerCase() !== email.toLowerCase()) {
                      setSelectedMemberId('');
                      setRole('CONTRIBUTOR');
                    }
                    if (errorMessage) setErrorMessage('');
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-500 dark:border-[#3a3a3a] dark:bg-[#242424] dark:text-[#F1F5F9]"
                />
              </div>
              <div className="mt-4 flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
                <FiShield size={16} className="mt-0.5 shrink-0" />
                <span>
                  {selectedMemberId
                    ? <>The selected member keeps their workspace role: <strong className="font-semibold text-slate-700 dark:text-slate-200">{formatProjectRoleLabel(role)}</strong>.</>
                    : <>Select a workspace member to use their workspace role. Manual email entries are added as <strong className="font-semibold text-slate-700 dark:text-slate-200">Contributor</strong>.</>}
                </span>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-[#303030]">
              <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-[#3a3a3a] dark:text-[#e0e0e0] dark:hover:bg-[#242424]">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-sky-600/20 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50">
                {isSubmitting ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /><span>Adding...</span></> : <><FiCheck size={14} /><span>Add Member</span></>}
              </button>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
};

export default AddProjectMemberModal;
