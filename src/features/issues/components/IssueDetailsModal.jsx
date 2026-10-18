import { useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import IssueDetailsView from './IssueDetailsView';

const IssueDetailsModal = ({
  isOpen,
  onClose,
  issueId,
  initialIssue = null,
  projectName = '',
  onIssueUpdated,
  onIssueDeleted,
}) => {
  const { currentUserProfile } = useOutletContext() || {};

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape' && isOpen) onClose();
  }, [isOpen, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen || !issueId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-2 sm:p-5 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative my-4 w-full max-w-5xl rounded-3xl border border-slate-200 bg-[#f4f5f7] p-4 shadow-2xl dark:border-[#2d2d32] dark:bg-[#141416] sm:p-6" onClick={(e) => e.stopPropagation()}>
        <IssueDetailsView
          issueId={issueId}
          initialIssue={initialIssue}
          projectName={projectName}
          onBack={onClose}
          onIssueUpdated={onIssueUpdated}
          onIssueDeleted={onIssueDeleted}
          currentUserProfile={currentUserProfile}
        />
      </div>
    </div>
  );
};

export default IssueDetailsModal;
