import { useCallback, useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { getMyWorkspace } from '../services/workspaceApi';
import LoadingScreen from '../../../components/ui/LoadingScreen';

const WorkspaceRoute = () => {
  const [workspace, setWorkspace] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  const refreshWorkspace = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const result = await getMyWorkspace();
      setWorkspace(result);
      setStatus(result ? 'ready' : 'missing');
      return result;
    } catch (err) {
      setError(err?.message || 'Could not check your workspace. Please try again.');
      setStatus('error');
      throw err;
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    getMyWorkspace()
      .then((result) => {
        if (!isActive) return;
        setWorkspace(result);
        setStatus(result ? 'ready' : 'missing');
      })
      .catch((err) => {
        if (!isActive) return;
        setError(err?.message || 'Could not check your workspace. Please try again.');
        setStatus('error');
      });
    return () => { isActive = false; };
  }, []);

  if (status === 'loading') {
    return <LoadingScreen fullScreen label="Checking your workspace" />;
  }
  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-sm text-rose-600">{error}</p>
        <button type="button" onClick={() => refreshWorkspace().catch(() => {})} className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white">Retry</button>
      </div>
    );
  }
  if (status === 'missing') return <Navigate to="/create-workspace" replace />;

  return <Outlet context={{ workspace, refreshWorkspace }} />;
};

export default WorkspaceRoute;
