const SITE_KEY = (import.meta.env.VITE_RECAPTCHA_SITE_KEY || '').trim();
const SCRIPT_URL = 'https://www.google.com/recaptcha/api.js?render=';
let scriptPromise;

const waitForRecaptcha = () => new Promise((resolve, reject) => {
  const ready = (attempt = 0) => {
    if (window.grecaptcha?.ready) {
      window.grecaptcha.ready(() => resolve(window.grecaptcha));
    } else if (attempt >= 50) {
      reject(new Error('CAPTCHA could not initialize. Please try again.'));
    } else {
      window.setTimeout(() => ready(attempt + 1), 100);
    }
  };
  ready();
});

const loadRecaptcha = () => {
  if (!SITE_KEY) {
    const error = new Error('CAPTCHA is not configured. Please contact support.');
    error.name = 'RecaptchaError';
    return Promise.reject(error);
  }
  if (window.grecaptcha?.ready) return waitForRecaptcha();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${SCRIPT_URL}${encodeURIComponent(SITE_KEY)}`;
      script.async = true;
      script.onload = () => waitForRecaptcha().then(resolve, reject);
      script.onerror = () => reject(new Error('CAPTCHA could not be loaded. Please check your connection and try again.'));
      document.head.appendChild(script);
    }).catch((error) => {
      scriptPromise = null;
      error.name = 'RecaptchaError';
      throw error;
    });
  }
  return scriptPromise;
};

export const getCaptchaToken = async (action) => {
  try {
    const recaptcha = await loadRecaptcha();
    const token = await recaptcha.execute(SITE_KEY, { action });
    if (!token) throw new Error('CAPTCHA verification failed. Please try again.');
    return token;
  } catch (error) {
    error.name = 'RecaptchaError';
    throw error;
  }
};
