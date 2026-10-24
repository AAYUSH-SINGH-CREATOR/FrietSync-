import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiCheckSquare, FiChevronRight, FiFolder, FiSearch, FiX } from 'react-icons/fi';
import { getMyProjects } from '../../features/projects/services/projectApi';
import { getProjectIssues } from '../../features/issues/services/issueApi';

const getProjectId = (project) => project?.id || project?.projectId || project?._id;
const getIssueId = (issue) => issue?.id || issue?.issueId || issue?._id;
const getProjectList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.projects)) return value.projects;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const loadProjectIssues = async (project) => {
  const projectId = getProjectId(project);
  const allIssues = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const result = await getProjectIssues(projectId, { page, size: 100 });
    const pageItems = Array.isArray(result?.items) ? result.items : [];
    allIssues.push(...pageItems.map((issue) => ({
      ...issue,
      projectId: issue.projectId || projectId,
      projectName: issue.projectName || project.name || 'Project',
    })));
    hasMore = page + 1 < Number(result?.totalPages || 1) && pageItems.length > 0;
    page += 1;
  }

  return allIssues;
};

const loadSearchCatalog = async () => {
  const projects = getProjectList(await getMyProjects()).filter((project) => getProjectId(project));
  const issues = [];

  // Keep the initial search fan-out limited while still searching across all projects.
  for (let index = 0; index < projects.length; index += 3) {
    const batch = projects.slice(index, index + 3);
    const responses = await Promise.allSettled(
      batch.map((project) => loadProjectIssues(project))
    );
    responses.forEach((response, responseIndex) => {
      if (response.status !== 'fulfilled') return;
      issues.push(...response.value);
    });
  }

  return { projects, issues };
};

const NavbarSearch = ({ compact = false }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const searchRef = useRef(null);
  const catalogPromiseRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!searchRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, []);

  useEffect(() => {
    const searchTerm = query.trim().toLowerCase();
    const requestId = ++requestIdRef.current;
    if (searchTerm.length < 2) {
      setResults([]);
      setError('');
      setIsLoading(false);
      return undefined;
    }

    setIsOpen(true);
    setIsLoading(true);
    setError('');
    const timeoutId = window.setTimeout(async () => {
      try {
        if (!catalogPromiseRef.current) catalogPromiseRef.current = loadSearchCatalog();
        const catalog = await catalogPromiseRef.current;
        if (requestId !== requestIdRef.current) return;

        const projectResults = catalog.projects
          .filter((project) => `${project.name || ''} ${project.description || ''}`.toLowerCase().includes(searchTerm))
          .map((project) => ({
            type: 'project',
            id: String(getProjectId(project)),
            title: project.name || 'Untitled project',
            subtitle: project.description || 'Project',
          }));
        const issueResults = catalog.issues
          .filter((issue) => `${issue.title || ''} ${issue.summary || ''} ${issue.description || ''} ${issue.key || ''} ${issue.issueNumber || ''}`.toLowerCase().includes(searchTerm))
          .map((issue) => ({
            type: 'issue',
            id: String(getIssueId(issue)),
            projectId: String(issue.projectId || ''),
            projectName: issue.projectName || 'Project',
            title: issue.title || issue.summary || 'Untitled issue',
            subtitle: `${issue.projectName || 'Project'}${issue.issueNumber ? ` · #${issue.issueNumber}` : ''}`,
          }));

        setResults([...projectResults, ...issueResults].slice(0, 8));
        setActiveIndex(0);
      } catch {
        if (requestId === requestIdRef.current) {
          catalogPromiseRef.current = null;
          setResults([]);
          setError('Search is temporarily unavailable. Try again.');
        }
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  const openResult = (result) => {
    setIsOpen(false);
    setQuery('');
    if (result.type === 'project') {
      navigate(`/dashboard/projects/${result.id}`);
      return;
    }
    navigate('/dashboard/issues', {
      state: {
        globalSearchIssue: {
          id: result.id,
          projectId: result.projectId,
          projectName: result.projectName,
        },
      },
    });
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp' && results.length) {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === 'Enter' && results[activeIndex]) {
      event.preventDefault();
      openResult(results[activeIndex]);
    }
  };

  return (
    <div ref={searchRef} className={`relative ${compact ? 'w-full' : 'mx-4 w-full max-w-[460px] flex-1'}`}>
      <FiSearch size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
      <input
        type="search"
        role="combobox"
        aria-label="Search projects and issues"
        aria-expanded={isOpen && query.trim().length >= 2}
        aria-controls="navbar-search-results"
        aria-activedescendant={results[activeIndex] ? `navbar-search-${results[activeIndex].type}-${results[activeIndex].id}` : undefined}
        value={query}
        onFocus={() => { if (query.trim().length >= 2) setIsOpen(true); }}
        onChange={(event) => { setQuery(event.target.value); setIsOpen(true); }}
        onKeyDown={handleKeyDown}
        placeholder="Search projects, issues, or anything..."
        className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-10 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-[#303030] dark:bg-[#1b1b1b] dark:text-white dark:placeholder:text-[#8b8b8b] dark:focus:border-sky-700 dark:focus:ring-sky-950/50"
      />
      {query && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 dark:text-slate-500 dark:hover:bg-[#303030]"
        >
          <FiX size={14} />
        </button>
      )}

      {isOpen && query.trim().length >= 2 && (
        <div id="navbar-search-results" role="listbox" className="absolute left-0 right-0 top-full z-[70] mt-2 max-h-[min(70vh,420px)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-[#383838] dark:bg-[#202020]">
          {isLoading ? (
            <p className="px-3 py-4 text-center text-xs text-slate-500 dark:text-slate-400">Searching projects and issues…</p>
          ) : error ? (
            <p role="status" className="px-3 py-4 text-center text-xs text-rose-600 dark:text-rose-400">{error}</p>
          ) : results.length ? (
            results.map((result, index) => {
              const ResultIcon = result.type === 'project' ? FiFolder : FiCheckSquare;
              return (
                <button
                  key={`${result.type}-${result.id}`}
                  id={`navbar-search-${result.type}-${result.id}`}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === index}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => openResult(result)}
                  className={`flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${activeIndex === index ? 'bg-sky-50 dark:bg-sky-950/40' : 'hover:bg-slate-50 dark:hover:bg-[#2b2b2b]'}`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-[#303030] dark:text-slate-300"><ResultIcon size={16} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-slate-900 dark:text-white">{result.title}</span>
                    <span className="block truncate text-[10px] text-slate-500 dark:text-slate-400">{result.type === 'project' ? 'Project' : `Issue · ${result.subtitle}`}</span>
                  </span>
                  <FiChevronRight size={15} className="shrink-0 text-slate-400" />
                </button>
              );
            })
          ) : (
            <p className="px-3 py-4 text-center text-xs text-slate-500 dark:text-slate-400">No projects or issues match “{query.trim()}”.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default NavbarSearch;
