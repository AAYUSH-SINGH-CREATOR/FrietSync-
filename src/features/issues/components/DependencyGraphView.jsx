import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useOutletContext } from 'react-router-dom';
import { FiChevronLeft, FiRefreshCw } from 'react-icons/fi';
import DependencyGraph from './DependencyGraph';

const DependencyGraphView = () => {
  const { projectId } = useParams();
  const { currentUserProfile } = useOutletContext() || {};
  const navigate = useNavigate();
  const [loadingProject, setLoadingProject] = useState(true);
  const [projectName, setProjectName] = useState('Project');
  const [error, setError] = useState(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load project name for display
  useEffect(() => {
    const loadProjectName = async () => {
      if (!projectId) return;
      
      try {
        const { getProjectById } = await import('../../projects/services/projectApi');
        const project = await getProjectById(projectId);
        setProjectName(project?.name || 'Project');
      } catch (err) {
        console.warn('Failed to load project name:', err);
        setProjectName('Project');
      } finally {
        setLoadingProject(false);
      }
    };
    
    loadProjectName();
  }, [projectId]);

  const handleRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleBack = useCallback(() => {
    navigate('/dashboard/issues');
  }, [navigate]);

  if (!projectId) {
    return (
      <div className="h-full min-h-[500px] flex items-center justify-center bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="text-center max-w-md p-6">
          <p className="text-sm font-medium text-slate-900 dark:text-white mb-2">Project ID is missing</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Please select a valid project to view dependencies.</p>
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
          >
            <FiChevronLeft size={12} /> Back to Issues
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="min-h-[calc(100vh-7.5rem)] rounded-xl bg-[#f4f5f7] p-4 text-slate-900 dark:bg-[#141416] dark:text-white sm:p-6 lg:p-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <FiChevronLeft size={14} /> Back
          </button>
          <div>
            <h1 className="text-[26px] font-bold leading-tight tracking-tight">
              Dependency Graph
            </h1>
            <p className="mt-1 text-xs text-slate-600 dark:text-[#c0c0c0] sm:text-sm">
              Visualize issue relationships in {loadingProject ? '...' : projectName}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          title="Refresh dependency graph"
          className="flex h-[38px] w-[38px] items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-[#3a3a3a] dark:bg-[#202020] dark:text-[#ddd] dark:hover:bg-[#333] cursor-pointer"
        >
          <FiRefreshCw size={15} className={refreshTrigger > 0 ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Dependency Graph */}
      <DependencyGraph 
        key={refreshTrigger}
        projectId={projectId} 
        onBack={handleBack}
      />
    </section>
  );
};

export default DependencyGraphView;
