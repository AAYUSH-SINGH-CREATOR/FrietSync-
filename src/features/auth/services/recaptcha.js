const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
const SCRIPT_URL = 'https://www.google.com/recaptcha/api.js?render=';
let scriptPromise;

const loadRecaptcha = () => {
  if (!SITE_KEY) return Promise.reject(new Error('CAPTCHA is not configured. Please contact support.'));
  if (window.grecaptcha?.execute) return Promise.resolve(window.grecaptcha);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${SCRIPT_URL}${encodeURIComponent(SITE_KEY)}`;
      script.async = true;
      script.onload = () => window.grecaptcha?.ready(() => resolve(window.grecaptcha));
      script.onerror = () => reject(new Error('CAPTCHA could not be loaded. Please check your connection and try again.'));
      document.head.appendChild(script);
    }).catch((error) => {
      scriptPromise = null;
      throw error;
    });
  }
  return scriptPromise;
};

export const getCaptchaToken = async (action) => {
  const recaptcha = await loadRecaptcha();
  const token = await recaptcha.execute(SITE_KEY, { action });
  if (!token) throw new Error('CAPTCHA verification failed. Please try again.');
  return token;
};
