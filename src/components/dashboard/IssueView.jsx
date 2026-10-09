import { AiOutlineBug } from 'react-icons/ai';

const IssuesView = () => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Issues
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Track, prioritize, and resolve issues across your projects.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-md shadow-slate-200/50 text-center max-w-3xl mx-auto">
        <div className="w-20 h-20 rounded-3xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-5 shadow-xs">
          <AiOutlineBug size={36} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Welcome to Issues Section
        </h2>
      </div>
    </div>
  );
};

export default IssuesView;