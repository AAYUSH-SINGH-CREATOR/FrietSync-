import { useEffect } from 'react';
import { FiDownload, FiGithub, FiX, FiCalendar } from 'react-icons/fi';
import { formatDate } from '../utils/projectUtils';

const ProjectSummaryModal = ({
  isOpen,
  onClose,
  project,
  summary,
  projectManagerName,
  teamLeadName,
  totalIssues,
  totalSprints,
  totalMembers,
  overallProgress,
  isDownloadingPdf,
  onDownloadPdf,
  linkedRepo,
  canManageGithubRepository,
  isUnlinkingRepo,
  onUnlinkRepository,
  onLinkRepository,
  onOpenTimeline,
}) => {
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

  const metrics = [
    ['Total issues', summary?.totalIssues ?? totalIssues],
    ['Open issues', summary?.openIssues ?? '—'],
    ['In progress', summary?.inProgressIssues ?? '—'],
    ['Resolved', summary?.resolvedIssues ?? '—'],
    ['Total sprints', summary?.totalSprints ?? totalSprints],
    ['Completed sprints', summary?.completedSprints ?? '—'],
    ['Overdue issues', summary?.overdueIssues ?? '—'],
    ['Team members', totalMembers],
  ];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-black/60 p-4"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="project-summary-title" className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden overscroll-contain rounded-2xl border border-slate-200 dark:border-[#35353d] bg-white dark:bg-[#171717] shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 dark:border-[#303038] px-5 py-4">
          <div>
            <h2 id="project-summary-title" className="text-lg font-bold text-slate-900 dark:text-white">Project Summary</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{project?.name || 'Project overview'}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-[#292930]" aria-label="Close summary">
            <FiX size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5">
          {summary?.summaryText && <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 dark:bg-[#222228] dark:text-slate-300">{summary.summaryText}</p>}

          <section className="rounded-xl border border-slate-200 p-4 dark:border-[#35353d]">
            <h3 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">Project Information</h3>
            <dl className="space-y-3 text-xs sm:text-sm">
              {[
                ['Project Name', project?.name || 'Unnamed project'],
                ['Description', project?.description || 'No description provided.'],
                ['Project manager', projectManagerName || 'Not assigned'],
                ['Team leader', teamLeadName || 'Not assigned'],
                ['Start date', project?.startDate ? formatDate(project.startDate) : '—'],
                ['Target end date', project?.deadline ? formatDate(project.deadline) : '—'],
                ['Overall progress', overallProgress === null || overallProgress === undefined ? 'Unavailable' : `${overallProgress}%`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4">
                  <dt className="shrink-0 font-medium text-slate-500 dark:text-slate-400">{label}</dt>
                  <dd className="max-w-[70%] text-right font-semibold capitalize text-slate-900 dark:text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Summary Metrics</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {metrics.map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-200 p-3 dark:border-[#35353d]">
                  <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
                  <div className="mt-1 font-semibold text-slate-900 dark:text-white">{value}</div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-[#303038]">
            <div className="flex min-w-0 items-center gap-2 text-xs">
              <FiGithub size={15} className="shrink-0 text-slate-500 dark:text-slate-400" />
              {linkedRepo ? (
                <>
                  <a href={`https://github.com/${linkedRepo.owner}/${linkedRepo.repository}`} target="_blank" rel="noopener noreferrer" className="truncate font-mono font-semibold text-sky-600 hover:underline dark:text-sky-400">
                    {linkedRepo.owner}/{linkedRepo.repository}
                  </a>
                  {canManageGithubRepository && <button type="button" onClick={onUnlinkRepository} disabled={isUnlinkingRepo} className="shrink-0 text-rose-600 hover:underline disabled:opacity-50 dark:text-rose-400">{isUnlinkingRepo ? 'Unlinking…' : 'Unlink'}</button>}
                </>
              ) : canManageGithubRepository ? (
                <button type="button" onClick={onLinkRepository} className="font-semibold text-sky-600 hover:underline dark:text-sky-400">Link GitHub Repository</button>
              ) : <span className="text-slate-500 dark:text-slate-400">No GitHub repository linked</span>}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={onOpenTimeline}
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700 transition"
                title="View project timeline, Gantt chart, and task dependencies"
              >
                <FiCalendar size={13} /> View Timeline
              </button>
              <button type="button" onClick={onDownloadPdf} disabled={isDownloadingPdf} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-50 transition">
                <FiDownload size={13} /> {isDownloadingPdf ? 'Downloading…' : 'Download PDF Summary'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProjectSummaryModal;
