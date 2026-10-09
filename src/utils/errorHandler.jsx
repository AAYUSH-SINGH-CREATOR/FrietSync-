export const getFriendlyErrorMessage = (error, context = '') => {
  const status = error?.response?.status || error?.status;
  const rawMessage = (error?.data?.message || error?.message || '').toLowerCase();

  if (
    !status ||
    status === 0 ||
    error?.name === 'TypeError' ||
    rawMessage.includes('failed to fetch') ||
    rawMessage.includes('network')
  ) {
    return 'Unable to connect to the server. Please check your internet connection.';
  }
  if (status === 400) {
    if (context === 'invite' && rawMessage.includes('yourself')) {
      return "You can't invite yourself.";
    }
    if (context === 'otp' || rawMessage.includes('otp') || rawMessage.includes('code')) {
      return 'Wrong OTP entered. Please check and try again.';
    }
    if (context === 'signup' && rawMessage.includes('password')) {
      return 'Password does not meet the security requirements.';
    }
    if (rawMessage.includes('missing') || rawMessage.includes('required')) {
      return 'Please fill in all required fields.';
    }
  const backendMsg =
      error?.data?.message ||
      error?.data?.error ||
      error?.data?.msg ||
      (typeof error?.data === 'string' ? error?.data : null) ||
      error?.message;
    if (backendMsg && !isTechnicalError(backendMsg)) {
      if (backendMsg.toLowerCase().includes('yourself')) {
        return "You can't invite yourself.";
      }
      return backendMsg;
    }
    return 'Invalid request. Please check your information and try again.';
  }


  if (status === 401) {
    if (context === 'login') {
      return 'Invalid email or password.';
    }
    if (context === 'otp' || rawMessage.includes('otp')) {
      return 'Invalid or expired OTP code.';
    }
    return 'Invalid credentials. Please try again.';
  }

  if (status === 403) {
    return 'Access denied.';
  }

  if (status === 404) {
    if (context === 'login' || context === 'forgot-password') {
      return 'Email not registered.';
    }
    return 'Requested account or resource not found.';
  }

  if (status === 409) {
    if (context === 'signup' || rawMessage.includes('exist') || rawMessage.includes('registered')) {
      return 'An account with this email already exists. Please log in.';
    }
    return 'Conflict occurred. This record already exists.';
  }

  if (status === 410) {
    return 'This verification code has expired. Please request a new one.';
  }

  if (status === 422) {
    const backendMsg = error?.data?.message || error?.message;
    if (backendMsg && !isTechnicalError(backendMsg)) {
      return backendMsg;
    }
    return 'Validation failed. Please verify your details.';
  }

  if (status === 429) {
    return 'Too many requests. Please wait a moment.';
  }

  if (status >= 500) {
    return 'Something went wrong. Please try again later.';
  }

  const backendMsg = error?.data?.message || error?.message;
  if (backendMsg && !isTechnicalError(backendMsg)) {
    return backendMsg;
  }

  return 'Something went wrong. Please try again later.';
};

