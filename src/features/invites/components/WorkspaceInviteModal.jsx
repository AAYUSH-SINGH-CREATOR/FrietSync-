import { useEffect, useRef } from 'react';
import { FiUsers, FiX } from 'react-icons/fi';
import MultiInviteForm from './MultiInviteForm';

export default function WorkspaceInviteModal({ onFinish }) {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const handleComplete = () => {
    window.setTimeout(onFinish, 1000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/55 px-4 py-6 backdrop-blur-sm" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-invite-title"
        className="my-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-[#303030] dark:bg-[#1d1d1d] sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-100 pb-5 dark:border-[#303030]">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300">
              <FiUsers size={21} />
            </span>
            <div>
              <h2 id="workspace-invite-title" className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                Invite your team
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Your workspace is ready. Invite teammates now, or skip this step and start with your dashboard.
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onFinish}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Skip inviting teammates"
          >
            <FiX size={20} />
          </button>
        </div>

        <MultiInviteForm onComplete={handleComplete} />

        <div className="mt-5 flex justify-end border-t border-slate-100 pt-4 dark:border-[#303030]">
          <button
            type="button"
            onClick={onFinish}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
          >
            Skip and go to dashboard
          </button>
        </div>
      </section>
    </div>
  );
}
