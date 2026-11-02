import { ToastContainer } from 'react-toastify';
import { useTheme } from '../../context/ThemeContext';

const AppToaster = () => {
  const { isDarkMode } = useTheme();

  return (
    <ToastContainer
      position="top-right"
      autoClose={3500}
      newestOnTop
      closeOnClick
      pauseOnFocusLoss
      draggable
      theme={isDarkMode ? 'dark' : 'light'}
    />
  );
};

export default AppToaster;
