import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import TextInput from './TextInput.jsx';
import PasswordInput from './PasswordInput.jsx';
import PrimaryButton from './PrimaryButton.jsx';
import PasswordStrengthIndicator, { getPasswordStrength } from './PasswordStrengthIndicator.jsx';
import { supabase } from '../lib/supabase.js';
import BiometricPromptModal from './BiometricPromptModal.jsx';
import { 
  isBiometricsAvailable, 
  isFirstLogin, 
  markAsLoggedIn, 
  isBiometricsEnabled, 
  authenticateWithBiometrics,
  getBiometricsUserEmail,
  getBiometryTypeName
} from '../lib/biometrics.js';

const OTP_LENGTH = 6;
const OTP_EXPIRY_TIME = 180;
const RESEND_COOLDOWN = 30;
const MAX_RESEND_ATTEMPTS = 5;
const MAX_OTP_ATTEMPTS = 5;
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_COOLDOWN_TIME = 1800;
const COOLDOWN_TIMES = [300, 1800];

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
  
  const [otpExpiry, setOtpExpiry] = useState(OTP_EXPIRY_TIME);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendAttempts, setResendAttempts] = useState(0);
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);
  const [cooldownLevel, setCooldownLevel] = useState(0);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [showRateLimitScreen, setShowRateLimitScreen] = useState(false);
  const [rateLimitDismissCountdown, setRateLimitDismissCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [loginCooldown, setLoginCooldown] = useState(0);
  const [loginCooldownLevel, setLoginCooldownLevel] = useState(0);
  const [showLoginRateLimitScreen, setShowLoginRateLimitScreen] = useState(false);
  
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [pendingAuthCallback, setPendingAuthCallback] = useState(null);
  const [pendingAuthEmail, setPendingAuthEmail] = useState('');
  const [canUseBiometricLogin, setCanUseBiometricLogin] = useState(false);
  const [biometryType, setBiometryType] = useState(null);
  
  const toastTimeout = useRef(null);
  const loginTimeout = useRef(null);
  const otpRefs = useRef([]);
  const otpExpiryInterval = useRef(null);
  const resendCooldownInterval = useRef(null);
  const rateLimitInterval = useRef(null);
  const rateLimitDismissInterval = useRef(null);
  const loginCooldownInterval = useRef(null);

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

  useEffect(() => {
    const checkBiometricLogin = async () => {
      if (currentStep === 'loginPassword') {
        const { available, biometryType: type } = await isBiometricsAvailable();
        const enabled = isBiometricsEnabled();
        const storedEmail = getBiometricsUserEmail();
        const emailMatches = storedEmail && storedEmail.toLowerCase() === loginEmail.toLowerCase();
        setCanUseBiometricLogin(available && enabled && emailMatches);
        setBiometryType(type);
      }
    };
    checkBiometricLogin();
  }, [currentStep, loginEmail]);

  const handleBiometricLogin = async () => {
    if (!canUseBiometricLogin) return;
    
    setIsLoading(true);
    try {
      const biometryName = getBiometryTypeName(biometryType);
      await authenticateWithBiometrics(`Use ${biometryName} to login`);
      
      markAsLoggedIn(loginEmail);
      if (onLoginComplete) {
        onLoginComplete();
      }
    } catch (error) {
      console.error('Biometric login failed:', error);
      showToast('Biometric authentication failed. Please use your password.');
    } finally {
      setIsLoading(false);
    }
  };

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
      if (toastTimeout.current) clearTimeout(toastTimeout.current);
      if (loginTimeout.current) clearTimeout(loginTimeout.current);
      if (otpExpiryInterval.current) clearInterval(otpExpiryInterval.current);
      if (resendCooldownInterval.current) clearInterval(resendCooldownInterval.current);
      if (rateLimitInterval.current) clearInterval(rateLimitInterval.current);
      if (loginCooldownInterval.current) clearInterval(loginCooldownInterval.current);
    };
  }, []);

  const startLoginRateLimitCooldown = useCallback(() => {
    const cooldownTime = LOGIN_COOLDOWN_TIME;
    setLoginCooldown(cooldownTime);
    setLoginCooldownLevel((prev) => prev + 1);
    setShowLoginRateLimitScreen(true);
    
    if (loginCooldownInterval.current) clearInterval(loginCooldownInterval.current);
    
    loginCooldownInterval.current = setInterval(() => {
      setLoginCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(loginCooldownInterval.current);
          setLoginAttempts(0);
          setShowLoginRateLimitScreen(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const startOtpTimer = useCallback(() => {
    setOtpExpiry(OTP_EXPIRY_TIME);
    setResendCooldown(RESEND_COOLDOWN);
    
    if (otpExpiryInterval.current) clearInterval(otpExpiryInterval.current);
    if (resendCooldownInterval.current) clearInterval(resendCooldownInterval.current);
    
    otpExpiryInterval.current = setInterval(() => {
      setOtpExpiry((prev) => {
        if (prev <= 1) {
          clearInterval(otpExpiryInterval.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    resendCooldownInterval.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(resendCooldownInterval.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (currentStep === 'otp' && otpExpiry === 0) {
      showToast('Code has expired. Please request a new one.');
      setOtp(Array.from({ length: OTP_LENGTH }, () => ''));
    }
  }, [otpExpiry, currentStep]);

  const startRateLimitCooldown = useCallback(() => {
    const cooldownTime = COOLDOWN_TIMES[Math.min(cooldownLevel, COOLDOWN_TIMES.length - 1)];
    setRateLimitCooldown(cooldownTime);
    setCooldownLevel((prev) => prev + 1);
    setShowRateLimitScreen(true);
    setRateLimitDismissCountdown(10);
    
    if (rateLimitInterval.current) clearInterval(rateLimitInterval.current);
    if (rateLimitDismissInterval.current) clearInterval(rateLimitDismissInterval.current);
    
    rateLimitInterval.current = setInterval(() => {
      setRateLimitCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(rateLimitInterval.current);
          setResendAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    rateLimitDismissInterval.current = setInterval(() => {
      setRateLimitDismissCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(rateLimitDismissInterval.current);
          setShowRateLimitScreen(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [cooldownLevel]);

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
    if (event.key === 'Enter') {
      event.preventDefault();
      return;
    }
    if (event.key === 'Backspace' && !otp[index] && otpRefs.current[index - 1]) {
      otpRefs.current[index - 1].focus();
    }
  };

  const isOtpBlocked = otpAttempts >= MAX_OTP_ATTEMPTS || otpExpiry <= 0 || rateLimitCooldown > 0;

  const checkOtpValue = useCallback(async (values) => {
    const code = values.join('');
    if (code.length !== OTP_LENGTH) return;
    
    if (otpExpiry <= 0) {
      showToast('Code has expired. Please request a new one.');
      setOtp(Array.from({ length: OTP_LENGTH }, () => ''));
      return;
    }
    
    if (otpAttempts >= MAX_OTP_ATTEMPTS) {
      showToast('Maximum attempts reached. Please request a new code.');
      setOtp(Array.from({ length: OTP_LENGTH }, () => ''));
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'signup',
      });
      
      if (error) {
        console.log('OTP verification error:', error.message, error);
        const newAttempts = otpAttempts + 1;
        setOtpAttempts(newAttempts);
        
        if (newAttempts >= MAX_OTP_ATTEMPTS) {
          showToast('Maximum attempts reached. Please request a new code.');
          setOtp(Array.from({ length: OTP_LENGTH }, () => ''));
          setIsLoading(false);
          return;
        }
        
        showToast(`Incorrect code. ${MAX_OTP_ATTEMPTS - newAttempts} attempts remaining.`);
        setOtp(Array.from({ length: OTP_LENGTH }, () => ''));
        otpRefs.current[0]?.focus();
        setIsLoading(false);
        return;
      }
      
      if (otpExpiryInterval.current) clearInterval(otpExpiryInterval.current);
      if (resendCooldownInterval.current) clearInterval(resendCooldownInterval.current);
      
      showToast('Email verified successfully!');
      
      const { available } = await isBiometricsAvailable();
      if (available) {
        setPendingAuthEmail(email);
        setPendingAuthCallback(() => onSignupComplete);
        setTimeout(() => {
          setShowBiometricPrompt(true);
        }, 1000);
      } else {
        setTimeout(() => {
          if (onSignupComplete) {
            onSignupComplete();
          }
        }, 1000);
      }
    } catch (err) {
      showToast('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [otpAttempts, otpExpiry, email, onSignupComplete]);

  useEffect(() => {
    const code = otp.join('');
    if (code.length === OTP_LENGTH) {
      checkOtpValue(otp);
    }
  }, [otp, checkOtpValue]);

  const handleOtpPaste = (event) => {
    const text = event.clipboardData?.getData('text')?.replace(/\D/g, '') ?? '';
    if (!text) return;
    const next = Array.from({ length: OTP_LENGTH }, (_, index) => text[index] ?? '');
    setOtp(next);
    otpRefs.current[Math.min(text.length, OTP_LENGTH) - 1]?.focus();
  };

  const handleResendOtp = async () => {
    if (rateLimitCooldown > 0) {
      showToast('Please wait before trying again.');
      return;
    }
    if (resendCooldown > 0) return;
    
    const newResendAttempts = resendAttempts + 1;
    setResendAttempts(newResendAttempts);
    
    if (newResendAttempts >= MAX_RESEND_ATTEMPTS) {
      startRateLimitCooldown();
      showToast('Too many resend attempts. Please wait before trying again.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      
      if (error) {
        showToast(error.message);
        setIsLoading(false);
        return;
      }
      
      setOtpAttempts(0);
      setOtp(Array.from({ length: OTP_LENGTH }, () => ''));
      startOtpTimer();
      showToast('New verification code sent to your email.');
      otpRefs.current[0]?.focus();
    } catch (err) {
      showToast('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditEmail = () => {
    if (rateLimitCooldown > 0) {
      showToast('Please wait before trying again.');
      return;
    }
    
    const newResendAttempts = resendAttempts + 1;
    setResendAttempts(newResendAttempts);
    
    if (newResendAttempts >= MAX_RESEND_ATTEMPTS) {
      startRateLimitCooldown();
      showToast('Too many attempts. Please wait before trying again.');
      return;
    }
    
    if (otpExpiryInterval.current) clearInterval(otpExpiryInterval.current);
    if (resendCooldownInterval.current) clearInterval(resendCooldownInterval.current);
    setOtpAttempts(0);
    setOtpExpiry(OTP_EXPIRY_TIME);
    setOtp(Array.from({ length: OTP_LENGTH }, () => ''));
    setIsEditingEmail(true);
    showStep('email');
  };

  const isLoginStep = currentStep.startsWith('login');
  const isForgotPasswordStep = currentStep === 'forgotPassword' || currentStep === 'newPassword' || currentStep === 'confirmNewPassword';
  
  const getHeroHeading = () => {
    if (currentStep === 'forgotPassword') return 'Reset password';
    if (currentStep === 'newPassword' || currentStep === 'confirmNewPassword') return 'Create new password';
    if (isLoginStep) return 'Welcome back';
    return heroDefault;
  };
  
  const getHeroSubheading = () => {
    if (currentStep === 'forgotPassword') {
      return resetEmailSent 
        ? 'Check your email for the reset link'
        : 'Enter your email to receive a reset link';
    }
    if (currentStep === 'newPassword' || currentStep === 'confirmNewPassword') {
      return 'Choose a strong password for your account';
    }
    if (isLoginStep) {
      return (
        <>
          Log in to your <span className="mint-brand">MINT</span> account
        </>
      );
    }
    return heroSubDefault;
  };
  
  const heroHeading = getHeroHeading();
  const heroSubheading = getHeroSubheading();

  const handleEmailContinue = () => {
    if (email && email.includes('@') && email.includes('.')) {
      if (isEditingEmail) {
        setIsEditingEmail(false);
        showStep('otp');
        startOtpTimer();
        showToast('New verification code sent to your email.');
        setTimeout(() => {
          otpRefs.current[0]?.focus();
        }, 100);
        return;
      }
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

  const handleLoginSubmit = async () => {
    if (loginCooldown > 0) {
      showToast('Too many attempts. Please wait before trying again.');
      return;
    }
    
    if (!loginEmail || !loginEmail.includes('@') || !loginEmail.includes('.')) {
      showToast('Enter a valid email address.');
      return;
    }
    if (loginPassword.length < 6) {
      showToast('Your password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      
      if (error) {
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        
        if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
          startLoginRateLimitCooldown();
          setLoginPassword('');
          setIsLoading(false);
          return;
        }
        
        showToast(`Incorrect email or password. ${MAX_LOGIN_ATTEMPTS - newAttempts} attempts remaining.`);
        setLoginPassword('');
        setIsLoading(false);
        return;
      }
      
      setLoginAttempts(0);
      
      const { available } = await isBiometricsAvailable();
      const firstLogin = isFirstLogin(loginEmail);
      
      if (available && firstLogin) {
        markAsLoggedIn(loginEmail);
        setPendingAuthEmail(loginEmail);
        setPendingAuthCallback(() => onLoginComplete);
        setShowBiometricPrompt(true);
      } else {
        markAsLoggedIn(loginEmail);
        if (onLoginComplete) {
          onLoginComplete();
        }
      }
    } catch (err) {
      showToast('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setResetEmail(loginEmail || '');
    showStep('forgotPassword');
  };

  const handleSendResetEmail = async () => {
    if (!resetEmail || !resetEmail.includes('@') || !resetEmail.includes('.')) {
      showToast('Enter a valid email address.');
      return;
    }
    
    if (!supabase) {
      showToast('Connection error. Please refresh the page.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin,
      });
      
      if (error) {
        showToast(error.message);
        setIsLoading(false);
        return;
      }
      
      setResetEmailSent(true);
      showToast('Password reset link sent to your email.');
    } catch (err) {
      showToast('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewPasswordContinue = () => {
    const strength = getPasswordStrength(newPassword);
    if (strength.level < 3) {
      showToast('Your password must meet all requirements to continue.');
      return;
    }
    showStep('confirmNewPassword');
  };

  const handleConfirmNewPasswordSubmit = async () => {
    if (isLoading) return;
    
    if (newPassword !== confirmNewPassword) {
      showToast("Passwords don't match.");
      return;
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      showToast('Session expired. Please request a new password reset link.');
      setTimeout(() => {
        showStep('forgotPassword');
      }, 1500);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) {
        showToast(error.message);
        setIsLoading(false);
        return;
      }
      
      showToast('Password updated successfully!');
      setTimeout(() => {
        setNewPassword('');
        setConfirmNewPassword('');
        showStep('loginEmail');
      }, 1500);
    } catch (err) {
      showToast('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordContinue = () => {
    const strength = getPasswordStrength(password);
    if (strength.level < 3) {
      showToast('Your password must meet all requirements to continue.');
      return;
    }
    showStep('confirm');
  };

  const handleConfirmContinue = async () => {
    if (isLoading) return;
    
    if (password.length < 8) {
      showToast('Use at least 8 characters for your password.');
      return;
    }
    if (password !== confirmPassword) {
      showToast("Passwords don't match.");
      return;
    }
    
    if (!supabase) {
      showToast('Connection error. Please refresh the page.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          },
        },
      });
      
      if (error) {
        if (error.message.includes('security purposes')) {
          showToast('Please wait a few seconds before trying again.');
        } else {
          showToast(error.message);
        }
        setIsLoading(false);
        return;
      }
      
      if (data?.user?.identities?.length === 0) {
        showToast('An account with this email already exists. Please log in instead.');
        setIsLoading(false);
        return;
      }
      
      startOtpTimer();
      showStep('otp');
      showToast('Verification code sent to your email.');
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);
    } catch (err) {
      showToast('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formSubmit = (event) => {
    event.preventDefault();
    if (currentStep === 'confirm') {
      handleConfirmContinue();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
                  onChange={(event) => setFirstName(event.target.value.replace(/[^a-zA-Z\s'-]/g, ''))}
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
                  onChange={(event) => setLastName(event.target.value.replace(/[^a-zA-Z\s'-]/g, ''))}
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
              {showLoginRateLimitScreen ? (
                <div className="otp-cooldown animate-on-load delay-4">
                  <h4>Too many attempts</h4>
                  <p>
                    {loginCooldownLevel >= 2 
                      ? 'Please contact support or try again later.'
                      : `Please wait ${formatTime(loginCooldown)} before trying again.`
                    }
                  </p>
                  <div className="flex flex-col gap-3 mt-4">
                    <button
                      type="button"
                      className="text-sm text-foreground underline underline-offset-4"
                      onClick={handleForgotPassword}
                    >
                      Reset Password
                    </button>
                    {loginCooldownLevel >= 2 && (
                      <a href="#" className="text-sm text-foreground underline underline-offset-4">
                        Contact Support
                      </a>
                    )}
                  </div>
                  <p className="dismiss-countdown">
                    Time remaining: {formatTime(loginCooldown)}
                  </p>
                </div>
              ) : (
                <>
                  <div className={`glass glass-input shadow-xl animate-on-load delay-4 ${loginPassword ? 'has-value' : ''}`}>
                    <PasswordInput
                      id="login-password"
                      placeholder="Password"
                      required
                      minLength={6}
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                      disabled={loginCooldown > 0}
                    />
                    <PrimaryButton ariaLabel="Sign in" onClick={handleLoginSubmit} disabled={loginCooldown > 0}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                    </PrimaryButton>
                  </div>
                  
                  {canUseBiometricLogin && (
                    <div className="animate-on-load delay-4">
                      <div className="flex items-center gap-4 my-4">
                        <div className="flex-1 h-px bg-muted-foreground/30"></div>
                        <span className="text-sm text-muted-foreground">or</span>
                        <div className="flex-1 h-px bg-muted-foreground/30"></div>
                      </div>
                      <button
                        type="button"
                        onClick={handleBiometricLogin}
                        disabled={isLoading || loginCooldown > 0}
                        className="w-full flex items-center justify-center gap-3 rounded-full border-2 border-slate-200 bg-white py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50"
                      >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                        {isLoading ? 'Verifying...' : `Use ${getBiometryTypeName(biometryType)}`}
                      </button>
                    </div>
                  )}
                  
                  {loginAttempts > 0 && loginAttempts < MAX_LOGIN_ATTEMPTS && (
                    <p className={`otp-attempts ${MAX_LOGIN_ATTEMPTS - loginAttempts <= 3 ? 'otp-error' : ''}`}>
                      {MAX_LOGIN_ATTEMPTS - loginAttempts} attempts remaining
                    </p>
                  )}
                  
                  <div className="flex flex-col items-center gap-3">
                    <button
                      type="button"
                      className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition"
                      onClick={handleForgotPassword}
                    >
                      Forgot password?
                    </button>
                    <button
                      type="button"
                      id="back-to-login-email"
                      className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition animate-on-load delay-5"
                      onClick={() => showStep('loginEmail')}
                    >
                      ← Back
                    </button>
                  </div>
                </>
              )}
            </div>

            <div id="step-forgot-password" className={`step ${currentStep === 'forgotPassword' ? 'active' : ''} space-y-8`}>
              {resetEmailSent ? (
                <div className="text-center space-y-6 animate-on-load delay-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    We've sent a password reset link to <span className="font-semibold text-foreground">{resetEmail}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Click the link in the email to create a new password.
                  </p>
                  <button
                    type="button"
                    className="text-sm text-foreground underline underline-offset-4 transition"
                    onClick={() => {
                      setResetEmailSent(false);
                      showStep('loginEmail');
                    }}
                  >
                    Back to login
                  </button>
                </div>
              ) : (
                <>
                  <div className={`glass glass-input shadow-xl animate-on-load delay-4 ${resetEmail ? 'has-value' : ''}`}>
                    <TextInput
                      type="email"
                      id="reset-email"
                      placeholder="Your email"
                      required
                      autoComplete="email"
                      value={resetEmail}
                      onChange={(event) => setResetEmail(event.target.value)}
                    />
                    <PrimaryButton ariaLabel="Send reset link" onClick={handleSendResetEmail}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                      </svg>
                    </PrimaryButton>
                  </div>
                  <button
                    type="button"
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition animate-on-load delay-5"
                    onClick={() => {
                      setResetEmail('');
                      showStep('loginPassword');
                    }}
                  >
                    ← Back to login
                  </button>
                </>
              )}
            </div>

            <div id="step-new-password" className={`step ${currentStep === 'newPassword' ? 'active' : ''} space-y-6`}>
              <div className={`glass glass-input shadow-xl animate-on-load delay-4 ${newPassword ? 'has-value' : ''}`}>
                <PasswordInput
                  id="new-password"
                  placeholder="New password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
                <PrimaryButton ariaLabel="Continue" onClick={handleNewPasswordContinue}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </PrimaryButton>
              </div>
              
              <PasswordStrengthIndicator password={newPassword} />
            </div>

            <div id="step-confirm-new-password" className={`step ${currentStep === 'confirmNewPassword' ? 'active' : ''} space-y-8`}>
              <div className={`glass glass-input shadow-xl animate-on-load delay-4 ${confirmNewPassword ? 'has-value' : ''}`}>
                <PasswordInput
                  id="confirm-new-password"
                  placeholder="Confirm new password"
                  required
                  value={confirmNewPassword}
                  onChange={(event) => setConfirmNewPassword(event.target.value)}
                />
                <PrimaryButton ariaLabel="Update password" onClick={handleConfirmNewPasswordSubmit}>
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </PrimaryButton>
              </div>
              
              {confirmNewPassword && newPassword !== confirmNewPassword && (
                <p className="text-sm text-center" style={{ color: '#FF3B30' }}>
                  Passwords don't match
                </p>
              )}
              {confirmNewPassword && newPassword === confirmNewPassword && (
                <p className="text-sm text-center" style={{ color: '#34C759' }}>
                  Passwords match
                </p>
              )}
              
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition animate-on-load delay-5"
                onClick={() => showStep('newPassword')}
              >
                ← Back
              </button>
            </div>

            <div id="step-password" className={`step ${currentStep === 'password' ? 'active' : ''} space-y-6`}>
              <div className={`glass glass-input shadow-xl animate-on-load delay-4 ${password ? 'has-value' : ''}`}>
                <PasswordInput
                  id="password"
                  placeholder="Create password"
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
              
              <PasswordStrengthIndicator password={password} />
              
              
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
              
              {confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-center" style={{ color: '#FF3B30' }}>
                  Passwords don't match
                </p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="text-sm text-center" style={{ color: '#34C759' }}>
                  Passwords match
                </p>
              )}
              
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
              {showRateLimitScreen ? (
                <div className="otp-cooldown animate-on-load delay-4">
                  <h4>Too many attempts</h4>
                  <p>
                    Please try again later.
                  </p>
                  {cooldownLevel >= 2 && (
                    <p style={{ marginTop: '12px' }}>
                      Or <a href="#">contact support</a> for help.
                    </p>
                  )}
                  <p className="dismiss-countdown">
                    Returning in {rateLimitDismissCountdown}s...
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-center space-y-3 animate-on-load delay-4">
                    <h3 className="text-2xl font-semibold tracking-tight">Verify your email</h3>
                    <p className="text-sm text-muted-foreground">
                      Enter the 6-digit code sent to{' '}
                      <span id="otp-email" className="font-semibold text-foreground">
                        {email || 'your email'}
                      </span>
                    </p>
                    <button
                      type="button"
                      id="edit-email"
                      className="text-sm text-foreground underline underline-offset-4 transition"
                      onClick={handleEditEmail}
                    >
                      Edit Email
                    </button>
                  </div>
                  
                  <div className={`flex justify-center gap-3 ${isOtpBlocked ? 'otp-blocked' : ''}`} onPaste={isOtpBlocked ? undefined : handleOtpPaste}>
                    {otp.map((digit, index) => (
                      <TextInput
                        key={`otp-${index}`}
                        id={`otp-${index}`}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        autoComplete={index === 0 ? 'one-time-code' : undefined}
                        baseClassName={`otp-input ${isOtpBlocked ? 'otp-input-disabled' : ''}`}
                        value={digit}
                        onChange={(event) => !isOtpBlocked && handleOtpChange(event.target.value, index)}
                        onKeyDown={(event) => !isOtpBlocked && handleOtpKeyDown(event, index)}
                        disabled={isOtpBlocked || isLoading}
                        ref={(el) => {
                          otpRefs.current[index] = el;
                        }}
                      />
                    ))}
                  </div>
                  
                  {isLoading && (
                    <p className="text-center text-sm text-muted-foreground animate-pulse">
                      Verifying...
                    </p>
                  )}
                  
                  {otpExpiry <= 0 && !isLoading && (
                    <p className="otp-error">
                      Code expired. Please request a new one.
                    </p>
                  )}
                  
                  {otpAttempts > 0 && otpAttempts < MAX_OTP_ATTEMPTS && !isLoading && otpExpiry > 0 && (
                    <p className={`otp-attempts ${MAX_OTP_ATTEMPTS - otpAttempts <= 3 ? 'otp-error' : ''}`}>
                      {MAX_OTP_ATTEMPTS - otpAttempts} attempts remaining
                    </p>
                  )}
                  
                  {otpAttempts >= MAX_OTP_ATTEMPTS && (
                    <p className="otp-error">
                      Maximum attempts reached. Request a new code.
                    </p>
                  )}
                  
                  <div className="text-center">
                    <button
                      type="button"
                      className="otp-resend-btn"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0 || rateLimitCooldown > 0}
                    >
                      {rateLimitCooldown > 0 
                        ? `Try again in ${Math.floor(rateLimitCooldown / 60)}m ${rateLimitCooldown % 60}s`
                        : resendCooldown > 0 
                          ? `Resend in ${resendCooldown}s` 
                          : 'Resend Code'}
                    </button>
                    {resendAttempts > 0 && resendAttempts < MAX_RESEND_ATTEMPTS && rateLimitCooldown === 0 && (
                      <p className={`text-xs mt-2 ${MAX_RESEND_ATTEMPTS - resendAttempts <= 3 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {MAX_RESEND_ATTEMPTS - resendAttempts} resend attempts remaining
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </form>

          <div className="text-center text-xs text-muted-foreground space-y-2 pt-6 animate-on-load delay-5">
            <p>
              By continuing, you agree to our{' '}
              <a href="#" className="underline hover:text-foreground transition">
                Terms of Service
              </a>{' '}
              and{' '}
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

      <BiometricPromptModal
        isOpen={showBiometricPrompt}
        onClose={() => {
          setShowBiometricPrompt(false);
          if (pendingAuthCallback) {
            pendingAuthCallback();
          }
        }}
        userEmail={pendingAuthEmail}
        onComplete={() => {
          setShowBiometricPrompt(false);
          if (pendingAuthCallback) {
            pendingAuthCallback();
          }
        }}
      />
    </>
  );
};

export default AuthForm;
