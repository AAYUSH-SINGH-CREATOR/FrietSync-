import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import MultiInviteForm from '../components/MultiInviteForm';

export default function Invite() {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen bg-slate-50/60 dark:bg-[#292929] flex items-center justify-center p-4 sm:p-6 transition-colors">
      <div className="bg-white dark:bg-[#1d1d1d] rounded-3xl shadow-xl dark:shadow-black/70 border border-gray-100 dark:border-[#303030] max-w-2xl w-full p-7 sm:p-9 md:p-10 transition-colors">
        <div className="flex items-start justify-between pb-5 border-b border-gray-100 dark:border-[#303030] mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-[#F1F5F9] tracking-tight">Invite Team Members</h2>
            <p className="text-sm text-gray-500 dark:text-[#b3b3b3] mt-1 leading-relaxed">
              Add up to 6 collaborators to your workspace with specific roles and UTC expiration dates.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-gray-500 dark:text-[#b3b3b3] hover:text-sky-600 dark:hover:text-[#60A5FA] font-medium text-sm transition shrink-0 ml-4 py-1.5 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-[#242424] cursor-pointer"
          >
            <FiArrowLeft size={16} />
            Back
          </button>
        </div>

        <MultiInviteForm
          onSuccess={() => {
            setTimeout(() => {
              navigate('/dashboard');
            }, 1600);
          }}
          onCancel={() => navigate('/dashboard')}
          showCancel={true}
        />
      </div>
    </div>
  );
}