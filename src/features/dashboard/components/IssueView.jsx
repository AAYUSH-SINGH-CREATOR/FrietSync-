import { AiOutlineBug } from 'react-icons/ai';

const IssuesView = () => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-[#F1F5F9] tracking-tight">
          Issues
        </h1>
        <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-1">
          Track, prioritize, and resolve issues across your projects.
        </p>
      </div>

      <div className="bg-white dark:bg-[#172033] rounded-3xl p-8 sm:p-12 border border-slate-200/80 dark:border-[#293548] shadow-md shadow-slate-200/50 dark:shadow-none text-center max-w-3xl mx-auto">
        <div className="w-20 h-20 rounded-3xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center mb-5 shadow-xs">
          <AiOutlineBug size={36} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-[#F1F5F9] mb-2">
          Welcome to Issues Section
        </h2>
      </div>
    </div>
  );
};

export default IssuesView;