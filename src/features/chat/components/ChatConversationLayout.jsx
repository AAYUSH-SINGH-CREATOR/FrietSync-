const PANEL_CLASS = 'w-full flex-1 min-w-0 bg-gradient-to-br from-[#D9EAFD] via-[#EAF2FF] to-[#D5E7FC] dark:from-[#060D1A] dark:via-[#091527] dark:to-[#040A14] border-2 sm:border-4 border-[#CCE5FE] dark:border-[#1B3654] rounded-3xl shadow-sm flex flex-col h-full min-h-0 overflow-hidden relative transition-colors';
const COMPOSER_BASE_CLASS = 'bg-white dark:bg-[#171717] mx-2 mb-2 sm:mx-3 sm:mb-3 shadow-xs border border-sky-100 dark:border-white/5 shrink-0 z-10 relative';

export const ChatConversationPanel = ({ children, className = '' }) => (
  <div className={`${PANEL_CLASS} ${className}`}>{children}</div>
);

export const ChatComposerFrame = ({ children, onSubmit, variant = 'pill', className = '' }) => {
  const variantClass = variant === 'multiline'
    ? 'rounded-2xl p-2 flex items-end gap-2'
    : 'rounded-full p-1.5 px-2.5 sm:p-2 sm:px-4 flex items-center gap-1 min-[380px]:gap-1.5 sm:gap-3';

  return (
    <form onSubmit={onSubmit} className={`${COMPOSER_BASE_CLASS} ${variantClass} ${className}`}>
      {children}
    </form>
  );
};
