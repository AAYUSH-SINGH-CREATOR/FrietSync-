import DashboardNavbar from '../components/layout/DashboardNavbar';

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <DashboardNavbar />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Welcome to your Dashboard 
          </h1>
          <p className="text-gray-600 mb-6">
            You are logged in successfully with FrietSync.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;