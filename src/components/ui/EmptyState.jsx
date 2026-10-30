import { useNavigate } from 'react-router-dom';
import esCardCreateProject from '../../assets/escard_create_project.png';
import esCardCollaborate from '../../assets/escard_collaborate.png';
import esCardManageIssues from '../../assets/escard_manage_issues.png';

const EmptyState = ({
  title,
  subtitle,
  illustration,
  illustrationAlt = 'Empty state illustration',
  illustrationClassName = 'max-w-[460px] sm:max-w-[540px] md:max-w-[600px]',
  onCreateProject,
  onCollaborate,
  onManageIssues,
  showHeading = true,
  actionButton = null,
  className = '',
}) => {
  const navigate = useNavigate();

  const handleCreateProjectClick = () => {
    if (typeof onCreateProject === 'function') {
      onCreateProject();
    } else {
      navigate('/dashboard/projects');
    }
  };

  const handleCollaborateClick = () => {
    if (typeof onCollaborate === 'function') {
      onCollaborate();
    } else {
      navigate('/dashboard/invites');
    }
  };

  const handleManageIssuesClick = () => {
    if (typeof onManageIssues === 'function') {
      onManageIssues();
    } else {
      navigate('/dashboard/issues');
    }
  };

  return (
    <div className={`space-y-6 sm:space-y-8 animate-fadeIn pb-12 w-full max-w-[1100px] mx-auto ${className}`}>
      {}
      {showHeading && title && (
        <div className="pt-2">
          <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm sm:text-base font-normal text-slate-500 dark:text-[#888888] mt-1">
              {subtitle}
            </p>
          )}
        </div>
      )}

      {}
      <div className="flex flex-col items-center justify-center text-center py-2 sm:py-4">
        {illustration && (
          <div className="relative w-full flex items-center justify-center">
            <img
              src={illustration}
              alt={illustrationAlt}
              className={`w-full h-auto object-contain select-none pointer-events-none drop-shadow-sm mx-auto ${illustrationClassName}`}
            />
          </div>
        )}

        {}
        {actionButton && <div className="mt-6">{actionButton}</div>}
      </div>

      {}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 max-w-[940px] mx-auto w-full px-2">
        {}
        <div
          onClick={handleCreateProjectClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleCreateProjectClick();
          }}
          className="bg-white dark:bg-[#161616] rounded-2xl p-6 sm:p-7 border border-slate-200/80 dark:border-white/5 hover:border-sky-500/50 dark:hover:border-sky-500/50 hover:shadow-xl dark:hover:bg-[#1E1E1E] transition-all duration-200 cursor-pointer group flex flex-col justify-between min-h-[213px]"
        >
          <div>
            <div className="h-12 flex items-center mb-5">
              <img
                src={esCardCreateProject}
                alt="Create a project"
                className="max-h-12 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight mb-2 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
              Create a project
            </h3>
            <p className="text-sm font-normal text-slate-500 dark:text-[#888888] leading-relaxed">
              organise work tasks and sprints in one place
            </p>
          </div>
        </div>

        {}
        <div
          onClick={handleCollaborateClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleCollaborateClick();
          }}
          className="bg-white dark:bg-[#161616] rounded-2xl p-6 sm:p-7 border border-slate-200/80 dark:border-white/5 hover:border-sky-500/50 dark:hover:border-sky-500/50 hover:shadow-xl dark:hover:bg-[#1E1E1E] transition-all duration-200 cursor-pointer group flex flex-col justify-between min-h-[213px]"
        >
          <div>
            <div className="h-12 flex items-center mb-5">
              <img
                src={esCardCollaborate}
                alt="Collaborate"
                className="max-h-12 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight mb-2 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
              Collaborate
            </h3>
            <p className="text-sm font-normal text-slate-500 dark:text-[#888888] leading-relaxed">
              invite and collaborate with your team
            </p>
          </div>
        </div>

        {}
        <div
          onClick={handleManageIssuesClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleManageIssuesClick();
          }}
          className="bg-white dark:bg-[#161616] rounded-2xl p-6 sm:p-7 border border-slate-200/80 dark:border-white/5 hover:border-sky-500/50 dark:hover:border-sky-500/50 hover:shadow-xl dark:hover:bg-[#1E1E1E] transition-all duration-200 cursor-pointer group flex flex-col justify-between min-h-[213px]"
        >
          <div>
            <div className="h-12 flex items-center mb-5">
              <img
                src={esCardManageIssues}
                alt="Manage issues"
                className="max-h-12 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight mb-2 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
              Manage issues
            </h3>
            <p className="text-sm font-normal text-slate-500 dark:text-[#888888] leading-relaxed">
              manage issues and sprints for your project
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;

