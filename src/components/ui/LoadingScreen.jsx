import logo from '../../assets/logo.svg';

const LoadingScreen = ({ label = 'Loading', fullScreen = false }) => (
  <div
    role="status"
    aria-live="polite"
    className={`${fullScreen ? 'fixed inset-0 z-[100]' : 'absolute inset-0 z-10'} flex items-center justify-center bg-black/45 backdrop-blur-[2px]`}
  >
    <span className="sr-only">{label}</span>
    <img
      src={logo}
      alt=""
      aria-hidden="true"
      className="h-16 w-16 object-contain motion-safe:animate-spin motion-reduce:animate-none"
    />
  </div>
);

export default LoadingScreen;
