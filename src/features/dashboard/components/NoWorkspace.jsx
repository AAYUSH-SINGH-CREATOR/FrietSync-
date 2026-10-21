import { useMemo } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import workspaceHero from '../../../assets/workspace-hero.png';
import workspaceFolderIcon from '../../../assets/workspace-icon-folder.png';
import workspaceCollaborateIcon from '../../../assets/workspace-icon-collaborate.png';
import workspaceIssuesIcon from '../../../assets/workspace-icon-issues.png';
import { canCreateProject } from '../../projects/utils/projectUtils';

const NoWorkspace = ({
  userName: propUserName,
  onCreateProject,
  onCollaborate,
  onManageIssues,
}) => {
  const navigate = useNavigate();
  const outletContext = useOutletContext() || {};
  const canCreateProjectCard = outletContext.isLoadingUserProfile === false && canCreateProject(outletContext.currentUserProfile);
  const userName =
    propUserName ||
    outletContext?.currentUserProfile?.name ||
    localStorage.getItem('frietSyncName') ||
    '';

  const firstName = useMemo(() => {
    if (userName?.trim()) {
      return userName.trim().split(' ')[0];
    }
    return 'there';
  }, [userName]);

  const handleCreateProjectClick = () => {
    if (typeof onCreateProject === 'function') {
      onCreateProject();
    } else {
      navigate('/create-workspace');
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
    <div className="space-y-6 sm:space-y-10 animate-fadeIn pb-16 max-w-[1100px] mx-auto">
      <div className="pt-2">
        <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900 dark:text-white tracking-tight">
          Good Morning {firstName}!
        </h1>
        <Link
          to="/create-workspace"
          className="inline-block text-sm sm:text-base font-light text-slate-500 dark:text-[#94A3B8] hover:text-sky-600 dark:hover:text-sky-400 mt-1 transition cursor-pointer"
        >
          lets get your workspace set up.
        </Link>
      </div>
      <div className="flex flex-col items-center text-center pt-2 sm:pt-4">
        <div className="relative w-full max-w-[420px] sm:max-w-[480px]">
          <img
            src={workspaceHero}
            alt="Your workspace starts here"
            className="w-full h-auto object-contain select-none pointer-events-none drop-shadow-2xl mx-auto"
          />
        </div>

        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-white tracking-tight mt-6 sm:mt-8">
          Your workspace starts here
        </h2>

        <p className="text-sm sm:text-base font-light text-slate-500 dark:text-[#94A3B8] max-w-xl mx-auto mt-2 leading-relaxed px-4">
          You haven't joined or created any projects yet. Create your first project or join your team to start collaborating
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[940px] mx-auto mt-8 sm:mt-12 w-full px-2">
        {canCreateProjectCard && <div
          onClick={handleCreateProjectClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleCreateProjectClick();
          }}
          className="bg-white dark:bg-[#171717] rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-white/5 hover:border-sky-500/50 dark:hover:border-sky-500/50 hover:shadow-xl dark:hover:bg-[#1C1F28] transition-all duration-200 cursor-pointer group flex flex-col justify-between min-h-[213px]"
        >
          <div>
            <img
              src={workspaceFolderIcon}
              alt="Create a project"
              className="w-14 h-11 object-contain mb-6 transition-transform duration-200 group-hover:scale-105"
            />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight mb-2 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
              Create a project
            </h3>
            <p className="text-sm font-normal text-slate-500 dark:text-[#94A3B8] leading-relaxed">
              organise work tasks and sprints in one place
            </p>
          </div>
        </div>}

        <div
          onClick={handleCollaborateClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleCollaborateClick();
          }}
          className="bg-white dark:bg-[#171717] rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-white/5 hover:border-sky-500/50 dark:hover:border-sky-500/50 hover:shadow-xl dark:hover:bg-[#1C1F28] transition-all duration-200 cursor-pointer group flex flex-col justify-between min-h-[213px]"
        >
          <div>
            <img
              src={workspaceCollaborateIcon}
              alt="Collaborate"
              className="w-16 h-10 object-contain mb-6 transition-transform duration-200 group-hover:scale-105"
            />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight mb-2 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
              Collaborate
            </h3>
            <p className="text-sm font-normal text-slate-500 dark:text-[#94A3B8] leading-relaxed">
              invite and collaborate with your team
            </p>
          </div>
        </div>
        <div
          onClick={handleManageIssuesClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleManageIssuesClick();
          }}
          className="bg-white dark:bg-[#171717] rounded-2xl p-6 sm:p-7 border border-slate-200 dark:border-white/5 hover:border-sky-500/50 dark:hover:border-sky-500/50 hover:shadow-xl dark:hover:bg-[#1C1F28] transition-all duration-200 cursor-pointer group flex flex-col justify-between min-h-[213px]"
        >
          <div>
            <img
              src={workspaceIssuesIcon}
              alt="Manage issues"
              className="w-11 h-12 object-contain mb-6 transition-transform duration-200 group-hover:scale-105"
            />
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight mb-2 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
              Manage issues
            </h3>
            <p className="text-sm font-normal text-slate-500 dark:text-[#94A3B8] leading-relaxed">
              manage issues and sprints for your project
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoWorkspace;

