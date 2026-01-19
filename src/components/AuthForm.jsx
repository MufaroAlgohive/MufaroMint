import { useEffect, useMemo, useRef, useState } from 'react';
import TextInput from './TextInput.jsx';
import PasswordInput from './PasswordInput.jsx';
import PrimaryButton from './PrimaryButton.jsx';

const OTP_LENGTH = 6;

const AuthForm = ({ initialStep = 'email', onSignupComplete, onLoginComplete }) => {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [otp, setOtp] = useState(Array.from({ length: OTP_LENGTH }, () => ''));
  const [toast, setToast] = useState({ message: '', visible: false });
  const toastTimeout = useRef(null);
  const loginTimeout = useRef(null);
  const otpRefs = useRef([]);

  const heroDefault = 'Get started';
  const heroSubDefault = useMemo(
    () => (
      <>
        Create your <span className="mint-brand">MINT</span> account
      </>
    ),
    []
  );

  const showStep = (stepName) => {
    setCurrentStep(stepName);
  };

  useEffect(() => {
    setCurrentStep(initialStep);
  }, [initialStep]);

  const showToast = (message) => {
    if (toastTimeout.current) {
      clearTimeout(toastTimeout.current);
    }
    setToast({ message, visible: true });
    toastTimeout.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3200);
  };

  useEffect(() => {
    return () => {
      if (toastTimeout.current) {
        clearTimeout(toastTimeout.current);
      }
      if (loginTimeout.current) {
        clearTimeout(loginTimeout.current);
      }
    };
  }, []);

  const handleOtpChange = (value, index) => {
    const sanitized = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = sanitized;
    setOtp(next);
    if (sanitized && otpRefs.current[index + 1]) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (event, index) => {
    if (event.key === 'Backspace' && !otp[index] && otpRefs.current[index - 1]) {
      otpRefs.current[index - 1].focus();
    }
  };

  const checkOtpValue = (values) => {
    const code = values.join('');
    if (code.length !== OTP_LENGTH) return;
    if (code !== '000000') {
      showToast('Incorrect OTP');
      setOtp(Array.from({ length: OTP_LENGTH }, () => ''));
      otpRefs.current[0]?.focus();
      return;
    }
    if (onSignupComplete) {
      onSignupComplete();
    }
  };

  useEffect(() => {
    checkOtpValue(otp);
  }, [otp]);

  const handleOtpPaste = (event) => {
    const text = event.clipboardData?.getData('text')?.replace(/\D/g, '') ?? '';
    if (!text) return;
    const next = Array.from({ length: OTP_LENGTH }, (_, index) => text[index] ?? '');
    setOtp(next);
    otpRefs.current[Math.min(text.length, OTP_LENGTH) - 1]?.focus();
  };

  const isLoginStep = currentStep.startsWith('login');
  const heroHeading = isLoginStep ? 'Welcome back' : heroDefault;
  const heroSubheading = isLoginStep ? (
    <>
      Log in to your <span className="mint-brand">MINT</span> account
    </>
  ) : (
    heroSubDefault
  );

  const handleEmailContinue = () => {
    if (email && email.includes('@') && email.includes('.')) {
      showStep('firstName');
      return;
    }
    showToast('Enter a valid email address to continue.');
  };

  const handleFirstNameContinue = () => {
    if (firstName.trim().length > 0) {
      showStep('lastName');
      return;
    }
    showToast('Add your first name to continue.');
  };

  const handleLastNameContinue = () => {
    if (lastName.trim().length > 0) {
      showStep('password');
      return;
    }
    showToast('Add your last name to continue.');
  };

  const handleLoginContinue = () => {
    if (loginEmail && loginEmail.includes('@') && loginEmail.includes('.')) {
      showStep('loginPassword');
      return;
    }
    showToast('Enter the email you signed up with.');
  };

  const handleLoginSubmit = () => {
    if (!loginEmail || !loginEmail.includes('@') || !loginEmail.includes('.')) {
      showToast('Enter a valid email address.');
      return;
    }
    if (loginPassword.length < 6) {
      showToast('Your password must be at least 6 characters.');
      return;
    }

    if (loginTimeout.current) {
      clearTimeout(loginTimeout.current);
    }
    loginTimeout.current = setTimeout(() => {
      if (onLoginComplete) {
        onLoginComplete();
      }
    }, 1500);
  };

  const handlePasswordContinue = () => {
    if (password.length >= 6) {
      showStep('confirm');
      return;
    }
    showToast('Use at least 6 characters for your password.');
  };

  const handleConfirmContinue = () => {
    if (password.length < 6) {
      showToast('Use at least 6 characters for your password.');
      return;
    }
    if (password !== confirmPassword) {
      showToast("Passwords don't match.");
      return;
    }
    showStep('otp');
    otpRefs.current[0]?.focus();
  };

  const formSubmit = (event) => {
    event.preventDefault();
    if (currentStep === 'confirm') {
      handleConfirmContinue();
    }
  };

  return (
    <>
      <div className="flex flex-1 items-center justify-center px-6 pt-32 pb-16 relative z-10">
        <div className="w-full max-w-md space-y-12">
          <div id="hero-copy" className={`text-center space-y-5 ${currentStep === 'otp' ? 'hidden' : ''}`}>
            <h2 id="hero-heading" className="text-5xl sm:text-6xl font-light tracking-tight animate-on-load delay-2">
              {heroHeading}
            </h2>
            <p id="hero-subheading" className="text-lg text-muted-foreground animate-on-load delay-3">
              {heroSubheading}
            </p>
          </div>

          <form id="signup-form" className="space-y-10" noValidate onSubmit={formSubmit}>
            <div id="step-email" className={`step ${currentStep === 'email' ? 'active' : ''} space-y-8`}>
              <div className={`glass glass-input shadow-xl animate-on-load delay-4 ${email ? 'has-value' : ''}`}>
                <TextInput
                  type="email"
                  id="email"
                  placeholder="Your email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
                <PrimaryButton ariaLabel="Continue" onClick={handleEmailContinue}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </PrimaryButton>
              </div>
              <p className="text-center text-sm text-muted-foreground animate-on-load delay-5">
                Already have an account?
                <button
                  type="button"
                  id="show-login"
                  className="font-semibold text-foreground underline-offset-4 hover:underline"
                  onClick={() => showStep('loginEmail')}
                >
                  Login
                </button>
              </p>
            </div>

            <div id="step-first-name" className={`step ${currentStep === 'firstName' ? 'active' : ''} space-y-8`}>
              <div className={`glass glass-input shadow-xl animate-on-load delay-4 ${firstName ? 'has-value' : ''}`}>
                <TextInput
                  id="first-name"
                  placeholder="First name"
                  required
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                />
                <PrimaryButton ariaLabel="Continue" onClick={handleFirstNameContinue}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </PrimaryButton>
              </div>
              <button
                type="button"
                id="back-to-email"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition animate-on-load delay-5"
                onClick={() => showStep('email')}
              >
                ← Back
              </button>
            </div>

            <div id="step-last-name" className={`step ${currentStep === 'lastName' ? 'active' : ''} space-y-8`}>
              <div className={`glass glass-input shadow-xl animate-on-load delay-4 ${lastName ? 'has-value' : ''}`}>
                <TextInput
                  id="last-name"
                  placeholder="Last name"
                  required
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                />
                <PrimaryButton ariaLabel="Continue" onClick={handleLastNameContinue}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </PrimaryButton>
              </div>
              <button
                type="button"
                id="back-to-first-name"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition animate-on-load delay-5"
                onClick={() => showStep('firstName')}
              >
                ← Back
              </button>
            </div>

            <div id="step-login-email" className={`step ${currentStep === 'loginEmail' ? 'active' : ''} space-y-8`}>
              <div className={`glass glass-input shadow-xl animate-on-load delay-4 ${loginEmail ? 'has-value' : ''}`}>
                <TextInput
                  type="email"
                  id="login-email"
                  placeholder="Email"
                  required
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                />
                <PrimaryButton ariaLabel="Continue" onClick={handleLoginContinue}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </PrimaryButton>
              </div>
              <p className="text-center text-sm text-muted-foreground animate-on-load delay-5">
                Need an account?
                <button
                  type="button"
                  id="back-to-signup"
                  className="font-semibold text-foreground underline-offset-4 hover:underline"
                  onClick={() => showStep('email')}
                >
                  Sign up
                </button>
              </p>
            </div>

            <div id="step-login-password" className={`step ${currentStep === 'loginPassword' ? 'active' : ''} space-y-8`}>
              <div className={`glass glass-input shadow-xl animate-on-load delay-4 ${loginPassword ? 'has-value' : ''}`}>
                <PasswordInput
                  id="login-password"
                  placeholder="Password"
                  required
                  minLength={6}
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                />
                <PrimaryButton ariaLabel="Sign in" onClick={handleLoginSubmit}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </PrimaryButton>
              </div>
              <button
                type="button"
                id="back-to-login-email"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition animate-on-load delay-5"
                onClick={() => showStep('loginEmail')}
              >
                ← Back
              </button>
            </div>

            <div id="step-password" className={`step ${currentStep === 'password' ? 'active' : ''} space-y-8`}>
              <div className={`glass glass-input shadow-xl animate-on-load delay-4 ${password ? 'has-value' : ''}`}>
                <PasswordInput
                  id="password"
                  placeholder="Password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <PrimaryButton ariaLabel="Continue" onClick={handlePasswordContinue}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </PrimaryButton>
              </div>
              <button
                type="button"
                id="back-to-last-name"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition animate-on-load delay-5"
                onClick={() => showStep('lastName')}
              >
                ← Back
              </button>
            </div>

            <div id="step-confirm" className={`step ${currentStep === 'confirm' ? 'active' : ''} space-y-8`}>
              <div className={`glass glass-input shadow-xl animate-on-load delay-4 ${confirmPassword ? 'has-value' : ''}`}>
                <PasswordInput
                  id="confirm"
                  placeholder="Confirm password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
                <PrimaryButton ariaLabel="Continue" onClick={handleConfirmContinue}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </PrimaryButton>
              </div>
              <button
                type="button"
                id="back-to-password"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition animate-on-load delay-5"
                onClick={() => showStep('password')}
              >
                ← Back
              </button>
            </div>

            <div id="step-otp" className={`step ${currentStep === 'otp' ? 'active' : ''} space-y-8`}>
              <div className="text-center space-y-3 animate-on-load delay-4">
                <h3 className="text-2xl font-semibold tracking-tight">Confirm your email</h3>
                <p className="text-sm text-muted-foreground">
                  Enter the 6-digit code sent to
                  <span id="otp-email" className="font-semibold text-foreground">
                    {email || 'your email'}
                  </span>
                </p>
                <button
                  type="button"
                  id="edit-email"
                  className="text-sm text-foreground underline underline-offset-4 transition"
                  onClick={() => showStep('email')}
                >
                  Edit Email
                </button>
              </div>
              <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={`otp-${index}`}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    autoComplete={index === 0 ? 'one-time-code' : undefined}
                    baseClassName="otp-input"
                    value={digit}
                    onChange={(event) => handleOtpChange(event.target.value, index)}
                    onKeyDown={(event) => handleOtpKeyDown(event, index)}
                    ref={(el) => {
                      otpRefs.current[index] = el;
                    }}
                  />
                ))}
              </div>
            </div>
          </form>

          <div className="text-center text-xs text-muted-foreground space-y-2 pt-6 animate-on-load delay-5">
            <p>
              By continuing, you agree to our
              <a href="#" className="underline hover:text-foreground transition">
                Terms of Service
              </a>{' '}
              and
              <a href="#" className="underline hover:text-foreground transition">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>

      <div id="toast" className={`toast ${toast.visible ? 'show' : ''}`} role="status" aria-live="polite" aria-atomic="true">
        <div id="toast-message" className="toast-message">
          {toast.message}
        </div>
      </div>
    </>
  );
};

export default AuthForm;
