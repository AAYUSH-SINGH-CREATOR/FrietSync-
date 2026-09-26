
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem('frietSyncToken');
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-blue-50 dark:bg-zinc-900 transition-colors duration-300">
      <h1 className="text-5xl font-extrabold text-zinc-900 dark:text-white">
        helooo i am dashboard
      </h1>
      <button className="border-transparent p-3 rounded-4xl text-2xl bg-green-300 hover:bg-green-500" onClick={handleLogout} >
        logout
      </button>
    </div>
  );
};

export default Dashboard;