import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import DashboardNavbar from '../../../components/layout/DashboardNavbar';
import Sidebar from '../../../components/layout/Sidebar';

const Dashboard = () => {
  const [projectFilter, setProjectFilter] = useState('all');
  const [pendingInviteCount, setPendingInviteCount] = useState(0);

  return (
    <div className="min-h-screen bg-[#eaedf1] dark:bg-[#0F172A] flex flex-col font-sans text-slate-800 dark:text-[#F1F5F9] transition-colors duration-200">
      <DashboardNavbar />

      <Sidebar
        projectFilter={projectFilter}
        setProjectFilter={setProjectFilter}
        pendingInviteCount={pendingInviteCount}
      />
      <div className="flex-1 w-full pl-[84px] sm:pl-[104px] pr-4 sm:pr-8 py-6">
        <main className="max-w-[1500px] w-full mx-auto">
          <Outlet
            context={{
              projectFilter,
              setProjectFilter,
              pendingInviteCount,
              setPendingInviteCount,
            }}
          />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;