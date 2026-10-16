import { useEffect, useId, useRef } from 'react';
import { FiX } from 'react-icons/fi';

const DashboardDialog = ({
  isOpen,
  onClose,
  title,
  ariaLabel,
  children,
  size = 'max-w-3xl',
  showHeader = true,
  closeDisabled = false,
}) => {
  const dialogRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  const requestClose = () => {
    if (!closeDisabled) onClose?.();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={showHeader ? titleId : undefined}
      aria-label={!showHeader ? ariaLabel || title : undefined}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) requestClose();
      }}
      className={`fixed inset-0 m-auto max-h-[100dvh] w-full ${size} border-0 bg-transparent p-0 text-[var(--text-primary)] backdrop:bg-slate-950/55 backdrop:backdrop-blur-[2px] sm:max-h-[calc(100dvh-2rem)]`}
    >
      <div className="max-h-[100dvh] overflow-y-auto rounded-none border-0 border-[var(--border-default)] bg-[var(--bg-surface)] shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl sm:border">
        {showHeader && (
          <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-5 py-4 sm:px-6">
            <h2 id={titleId} className="min-w-0 truncate text-base font-semibold text-[var(--text-primary)]">
              {title}
            </h2>
            <button
              type="button"
              onClick={requestClose}
              disabled={closeDisabled}
              aria-label="Close dialog"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] disabled:opacity-50"
            >
              <FiX size={17} />
            </button>
          </header>
        )}
        {children}
      </div>
    </dialog>
  );
};

export default DashboardDialog;