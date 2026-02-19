import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { supabase } from "./lib/supabase.js";
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import SwipeBackWrapper from "./components/SwipeBackWrapper.jsx";

import AuthPage from "./pages/AuthPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import CreditPage from "./pages/CreditPage.jsx";
import CreditApplyPage from "./pages/CreditApplyPage.jsx";
import CreditRepayPage from "./pages/CreditRepayPage.jsx";
import InvestmentsPage from "./pages/InvestmentsPage.jsx";
import NewPortfolioPage from "./pages/NewPortfolioPage.jsx";
import InvestPage from "./pages/InvestPage.jsx";
import InvestAmountPage from "./pages/InvestAmountPage.jsx";
import PaymentPage from "./pages/PaymentPage.jsx";
import PaymentSuccessPage from "./pages/PaymentSuccessPage.jsx";
import FactsheetPage from "./pages/FactsheetPage.jsx";
import OpenStrategiesPage from "./pages/OpenStrategiesPage.jsx";
import MorePage from "./pages/MorePage.jsx";
import OnboardingPage from "./pages/OnboardingPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import TransactPage from "./pages/TransactPage.jsx";
import UserOnboardingPage from "./pages/UserOnboardingPage.jsx";
import AppLayout from "./layouts/AppLayout.jsx";
import BiometricsDebugPage from "./pages/BiometricsDebugPage.jsx";
import EditProfilePage from "./pages/EditProfilePage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import NotificationSettingsPage from "./pages/NotificationSettingsPage.jsx";
import MintBalancePage from "./pages/MintBalancePage.jsx";
import MarketsPage from "./pages/MarketsPage.jsx";
import StockDetailPage from "./pages/StockDetailPage.jsx";
import StockBuyPage from "./pages/StockBuyPage.jsx";
import NewsArticlePage from "./pages/NewsArticlePage.jsx";
import { NotificationsProvider, createWelcomeNotification, useNotificationsContext } from "./lib/NotificationsContext.jsx";
import ActivityPage from "./pages/ActivityPage.jsx";
import ActionsPage from "./pages/ActionsPage.jsx";
import ProfileDetailsPage from "./pages/ProfileDetailsPage.jsx";
import ChangePasswordPage from "./pages/ChangePasswordPage.jsx";
import LegalDocumentationPage from "./pages/LegalDocumentationPage.jsx";
import StatementsPage from "./pages/StatementsPage.jsx";
import IdentityCheckPage from "./pages/IdentityCheckPage.jsx";
import BankLinkPage from "./pages/BankLinkPage.jsx";
import MintBankPage from "./pages/MintBankPage.jsx";
import InvitePage from "./pages/InvitePage.jsx";
import ActiveSessionsPage from "./pages/ActiveSessionsPage.jsx";
import PinSetupPage from "./pages/PinSetupPage.jsx";
import { useInactivityTimeout } from "./lib/useInactivityTimeout.jsx";
import PinLockScreen from "./components/PinLockScreen.jsx";
import { isPinEnabled } from "./lib/usePin.js";
import GoalLinkModal from "./components/GoalLinkModal.jsx";

const initialHash = window.location.hash;
const isRecoveryMode = initialHash.includes('type=recovery');

const getHashParams = (hash) => {
  if (!hash) return {};
  return Object.fromEntries(new URLSearchParams(hash.substring(1)));
};

const hashParams = getHashParams(initialHash);
const hasError = hashParams.error === 'access_denied';
const errorCode = hashParams.error_code;

const getTokensFromHash = (hash) => {
  if (!hash) return null;
  const params = new URLSearchParams(hash.substring(1));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken) {
    return { accessToken, refreshToken: refreshToken || accessToken };
  }
  return null;
};

const recoveryTokens = isRecoveryMode ? getTokensFromHash(initialHash) : null;

const mainTabs = ['home', 'credit', 'transact', 'investments', 'statements', 'more', 'welcome', 'auth'];

const App = () => {
  const [currentPage, setCurrentPage] = useState(hasError ? "linkExpired" : (isRecoveryMode ? "auth" : "welcome"));
  const [previousPageName, setPreviousPageName] = useState(null);
  const [authStep, setAuthStep] = useState(isRecoveryMode ? "newPassword" : "email");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [notificationReturnPage, setNotificationReturnPage] = useState("home");
  const [modal, setModal] = useState(null);
  const [selectedSecurity, setSelectedSecurity] = useState(null);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [selectedArticleId, setSelectedArticleId] = useState(null);
  const [marketsInitialView, setMarketsInitialView] = useState(null);
  const [investmentAmount, setInvestmentAmount] = useState(0);
  const [stockCheckout, setStockCheckout] = useState({ security: null, amount: 0 });
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [pendingGoalFlow, setPendingGoalFlow] = useState(null);
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const selectedGoalIdRef = useRef(null);
  const goalInvestAmountRef = useRef(0);
  const recoveryHandled = useRef(false);
  const { refetch: refetchNotifications } = useNotificationsContext();
  const [showPinLock, setShowPinLock] = useState(false);

  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;
  const isAuthenticated = !['welcome', 'auth', 'linkExpired'].includes(currentPage);
  useInactivityTimeout({
    enabled: isAuthenticated,
    onLogout: () => {
      if (supabase) supabase.auth.signOut({ scope: 'local' });
      sessionStorage.removeItem('mint_pin_unlocked');
      setShowPinLock(false);
      setCurrentPage("welcome");
    },
  });

  const justLoggedInRef = useRef(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        localStorage.setItem('mint_app_hidden_at', Date.now().toString());
      } else {
        if (justLoggedInRef.current) return;
        const hiddenAt = localStorage.getItem('mint_app_hidden_at');
        if (hiddenAt) {
          const elapsed = Date.now() - parseInt(hiddenAt, 10);
          const ONE_MINUTE = 60 * 1000;
          if (elapsed >= ONE_MINUTE && isAuthenticated && !isCheckingAuth) {
            if (isPinEnabled()) {
              sessionStorage.removeItem('mint_pin_unlocked');
              setShowPinLock(true);
            } else {
              if (supabase) supabase.auth.signOut({ scope: 'local' });
              sessionStorage.removeItem('mint_pin_unlocked');
              setShowPinLock(false);
              setCurrentPage("welcome");
            }
          }
          localStorage.removeItem('mint_app_hidden_at');
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, isCheckingAuth]);
  
  const navigationHistory = useRef([]);
  const pageStateCache = useRef({});
  
  const cacheCurrentPageState = useCallback(() => {
    pageStateCache.current[currentPage] = {
      selectedSecurity,
      selectedStrategy,
      selectedArticleId,
      investmentAmount,
      stockCheckout,
      notificationReturnPage,
    };
  }, [currentPage, selectedSecurity, selectedStrategy, selectedArticleId, investmentAmount, stockCheckout, notificationReturnPage]);

  const navigateTo = useCallback((page) => {
    if (page === currentPage) return;
    
    if (!mainTabs.includes(page)) {
      cacheCurrentPageState();
      navigationHistory.current.push(currentPage);
      if (navigationHistory.current.length > 20) {
        navigationHistory.current = navigationHistory.current.slice(-20);
      }
      setPreviousPageName(currentPage);
    } else {
      navigationHistory.current = [];
      setPreviousPageName(null);
    }
    
    setCurrentPage(page);
  }, [currentPage, cacheCurrentPageState]);

  const handleTabChange = useCallback((tab) => {
    if (tab === 'statements') {
      navigateTo(tab);
    } else {
      navigationHistory.current = [];
      setPreviousPageName(null);
      setCurrentPage(tab);
    }
  }, [navigateTo]);

  const goBack = useCallback(() => {
    if (navigationHistory.current.length > 0) {
      const prevPage = navigationHistory.current.pop();
      const newPreviousPage = navigationHistory.current.length > 0 
        ? navigationHistory.current[navigationHistory.current.length - 1] 
        : null;
      setPreviousPageName(newPreviousPage);
      setCurrentPage(prevPage);
      return true;
    }
    
    if (!mainTabs.includes(currentPage)) {
      setPreviousPageName(null);
      setCurrentPage('home');
      return true;
    }
    
    return false;
  }, [currentPage]);

  const canSwipeBack = !mainTabs.includes(currentPage);

  const lastBackPressRef = useRef(0);
  
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return;
    }

    const handleBackButton = () => {
      if (navigationHistory.current.length > 0) {
        const prevPage = navigationHistory.current.pop();
        const newPreviousPage = navigationHistory.current.length > 0 
          ? navigationHistory.current[navigationHistory.current.length - 1] 
          : null;
        setPreviousPageName(newPreviousPage);
        setCurrentPage(prevPage);
        return;
      }
      
      if (!mainTabs.includes(currentPage)) {
        setPreviousPageName(null);
        setCurrentPage('home');
        return;
      }
      
      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) {
        CapacitorApp.exitApp();
      } else {
        lastBackPressRef.current = now;
      }
    };

    const listener = CapacitorApp.addListener('backButton', handleBackButton);

    return () => {
      listener.then(l => l.remove());
    };
  }, [currentPage]);


  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const appContent = document.querySelector(".app-content");
      if (appContent) {
        appContent.scrollTo({ top: 0, left: 0 });
      }
      window.scrollTo({ top: 0, left: 0 });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [currentPage]);

  useEffect(() => {
    if (hasError) {
      window.history.replaceState({}, document.title, window.location.pathname);
      setIsCheckingAuth(false);
      return;
    }

    const setupRecoverySession = async () => {
      if (isRecoveryMode && recoveryTokens && supabase) {
        try {
          const { error } = await supabase.auth.setSession({
            access_token: recoveryTokens.accessToken,
            refresh_token: recoveryTokens.refreshToken
          });
          
          if (!error) {
            setSessionReady(true);
          }
        } catch (err) {
          console.error('Error setting recovery session:', err);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      setIsCheckingAuth(false);
    };
    
    const checkExistingSession = async () => {
      if (supabase && !isRecoveryMode && !hasError) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setCurrentPage("home");
            const alreadyUnlocked = sessionStorage.getItem('mint_pin_unlocked') === 'true';
            if (isPinEnabled() && !alreadyUnlocked) {
              setShowPinLock(true);
            }
          }
        } catch (err) {
          console.error("Session check error:", err);
        }
      }
      setIsCheckingAuth(false);
    };

    if (isRecoveryMode) {
      setupRecoverySession();
    } else {
      checkExistingSession();
    }
  }, []);

  useEffect(() => {
    if (!supabase || isRecoveryMode) {
      return;
    }
    
    const handleRecoveryFlow = () => {
      if (recoveryHandled.current) return;
      recoveryHandled.current = true;
      setAuthStep("newPassword");
      setCurrentPage("auth");
      window.history.replaceState({}, document.title, window.location.pathname);
    };
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        handleRecoveryFlow();
      }
      if (event === 'SIGNED_OUT') {
        if (justLoggedInRef.current || Date.now() < sessionCheckSkipUntilRef.current) {
          return;
        }
        if (['welcome', 'auth', 'linkExpired'].includes(currentPageRef.current)) {
          return;
        }
        sessionExpiredPageRef.current = currentPageRef.current;
        setShowSessionExpired(true);
        setShowPinLock(false);
      }
      if (event === 'TOKEN_REFRESHED' && session) {
        setSessionReady(true);
      }
    });
    
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const [showSessionExpired, setShowSessionExpired] = useState(false);
  const sessionExpiredPageRef = useRef(null);

  const sessionCheckSkipUntilRef = useRef(0);

  const sessionCheckFailCountRef = useRef(0);

  useEffect(() => {
    if (!supabase || !isAuthenticated) return;

    const checkSession = async () => {
      if (justLoggedInRef.current) return;
      if (Date.now() < sessionCheckSkipUntilRef.current) return;
      if (document.hidden) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          const { data: refreshed } = await supabase.auth.refreshSession();
          if (!refreshed?.session) {
            sessionCheckFailCountRef.current += 1;
            console.log(`[session-check] No active session found (attempt ${sessionCheckFailCountRef.current}/3)`);
            if (sessionCheckFailCountRef.current >= 3) {
              sessionExpiredPageRef.current = currentPageRef.current;
              setShowPinLock(false);
              setShowSessionExpired(true);
              sessionCheckFailCountRef.current = 0;
            }
            return;
          }
        }
        sessionCheckFailCountRef.current = 0;
        const activeSession = session || (await supabase.auth.getSession()).data?.session;
        const fingerprint = localStorage.getItem('mint_session_fingerprint');
        if (fingerprint && activeSession?.access_token) {
          try {
            const res = await fetch(`/api/sessions/validate?fingerprint=${encodeURIComponent(fingerprint)}`, {
              headers: { Authorization: `Bearer ${activeSession.access_token}` },
            });
            const json = await res.json();
            if (json.success && json.valid === false) {
              console.log('[session-check] Session revoked remotely');
              await supabase.auth.signOut({ scope: 'local' });
              setShowPinLock(false);
              setCurrentPage("welcome");
              return;
            }
          } catch (valErr) {
            // ignore validation errors
          }
        }
      } catch (err) {
        console.error('[session-check] Error:', err);
      }
    };

    const initialDelay = setTimeout(() => checkSession(), 15000);
    const interval = setInterval(checkSession, 30000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const openAuthFlow = (step) => {
    setAuthStep(step);
    setCurrentPage("auth");
  };

  const openModal = (title, message) => {
    setModal({ title, message });
  };

  const closeModal = () => {
    setModal(null);
  };

  const handleWithdrawRequest = async () => {
    try {
      if (!supabase) {
        openModal("Withdraw", "You don't have any allocations to withdraw from.");
        return;
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        openModal("Withdraw", "You don't have any allocations to withdraw from.");
        return;
      }

      const { count, error } = await supabase
        .from("allocations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userData.user.id);

      if (error || !count) {
        openModal("Withdraw", "You don't have any allocations to withdraw from.");
        return;
      }

      openModal("Withdraw", "Withdrawals are coming soon.");
    } catch (err) {
      console.error("Failed to check allocations", err);
      openModal("Withdraw", "You don't have any allocations to withdraw from.");
    }
  };

  const handleShowComingSoon = (label) => {
    openModal(label, "Coming soon.");
  };

  const renderPageContent = useCallback((pageName, isPreview = false) => {
    const cachedState = pageStateCache.current[pageName] || {};
    const previewSecurity = isPreview ? (cachedState.selectedSecurity || selectedSecurity) : selectedSecurity;
    const previewStrategy = isPreview ? (cachedState.selectedStrategy || selectedStrategy) : selectedStrategy;
    const previewArticleId = isPreview ? (cachedState.selectedArticleId || selectedArticleId) : selectedArticleId;
    
    const noOp = () => {};

    switch (pageName) {
      case 'home':
        return (
          <AppLayout
            activeTab="home"
            onTabChange={noOp}
            onWithdraw={noOp}
            onShowComingSoon={noOp}
            modal={null}
            onCloseModal={noOp}
          >
            <HomePage
              onOpenNotifications={noOp}
              onOpenMintBalance={noOp}
              onOpenActivity={noOp}
              onOpenActions={noOp}
              onOpenInvestments={noOp}
              onOpenCredit={noOp}
              onOpenCreditApply={noOp}
              onOpenCreditRepay={noOp}
              onOpenInvest={noOp}
              onOpenWithdraw={noOp}
              onOpenSettings={noOp}
            />
          </AppLayout>
        );
      case 'credit':
        return (
          <AppLayout
            activeTab="credit"
            onTabChange={noOp}
            onWithdraw={noOp}
            onShowComingSoon={noOp}
            modal={null}
            onCloseModal={noOp}
          >
            <CreditPage
              onOpenNotifications={noOp}
              onOpenCreditApply={noOp}
            />
          </AppLayout>
        );
      case 'statements':
        return (
          <AppLayout
            activeTab="statements"
            onTabChange={noOp}
            onWithdraw={noOp}
            onShowComingSoon={noOp}
            modal={null}
            onCloseModal={noOp}
          >
            <StatementsPage onOpenNotifications={noOp} />
          </AppLayout>
        );
      case 'investments':
        return (
          <AppLayout
            activeTab="investments"
            onTabChange={noOp}
            onWithdraw={noOp}
            onShowComingSoon={noOp}
            modal={null}
            onCloseModal={noOp}
          >
            <NewPortfolioPage
              onBack={noOp}
              onOpenNotifications={noOp}
              onOpenInvest={noOp}
              onOpenStrategies={noOp}
            />
          </AppLayout>
        );
      case 'more':
        return (
          <AppLayout
            activeTab="more"
            onTabChange={noOp}
            onWithdraw={noOp}
            onShowComingSoon={noOp}
            modal={null}
            onCloseModal={noOp}
          >
            <MorePage onNavigate={noOp} />
          </AppLayout>
        );
      case 'markets':
        return (
          <MarketsPage
            onBack={noOp}
            onOpenNotifications={noOp}
            onOpenStockDetail={noOp}
            onOpenNewsArticle={noOp}
            onOpenFactsheet={noOp}
          />
        );
      case 'stockDetail':
        return (
          <StockDetailPage
            security={previewSecurity}
            onBack={noOp}
            onOpenBuy={noOp}
          />
        );
      case 'stockBuy':
        return (
          <StockBuyPage
            security={previewSecurity}
            onBack={noOp}
            onContinue={noOp}
          />
        );
      case 'factsheet':
        return (
          <FactsheetPage 
            onBack={noOp} 
            strategy={previewStrategy}
            onOpenInvest={noOp}
          />
        );
      case 'investAmount':
        return (
          <InvestAmountPage
            onBack={noOp}
            strategy={previewStrategy}
            onContinue={noOp}
          />
        );
      case 'notifications':
        return (
          <NotificationsPage
            onBack={noOp}
            onOpenSettings={noOp}
          />
        );
      case 'notificationSettings':
        return <NotificationSettingsPage onBack={noOp} />;
      case 'settings':
        return (
          <AppLayout
            activeTab="more"
            onTabChange={noOp}
            onWithdraw={noOp}
            onShowComingSoon={noOp}
            modal={null}
            onCloseModal={noOp}
          >
            <SettingsPage onNavigate={noOp} onBack={noOp} />
          </AppLayout>
        );
      case 'mintBalance':
        return (
          <AppLayout
            activeTab="home"
            onTabChange={noOp}
            onWithdraw={noOp}
            onShowComingSoon={noOp}
            modal={null}
            onCloseModal={noOp}
          >
            <MintBalancePage
              onBack={noOp}
              onOpenInvestments={noOp}
              onOpenCredit={noOp}
              onOpenActivity={noOp}
              onOpenSettings={noOp}
              onOpenInvest={noOp}
              onOpenCreditApply={noOp}
            />
          </AppLayout>
        );
      case 'activity':
        return (
          <AppLayout
            activeTab="home"
            onTabChange={noOp}
            onWithdraw={noOp}
            onShowComingSoon={noOp}
            modal={null}
            onCloseModal={noOp}
          >
            <ActivityPage onBack={noOp} />
          </AppLayout>
        );
      case 'actions':
        return (
          <ActionsPage
            onBack={noOp}
            onNavigate={noOp}
          />
        );
      case 'editProfile':
        return <EditProfilePage onNavigate={noOp} onBack={noOp} />;
      case 'profileDetails':
        return <ProfileDetailsPage onNavigate={noOp} onBack={noOp} />;
      case 'creditApply':
        return <CreditApplyPage onBack={noOp} />;
      case 'creditRepay':
        return <CreditRepayPage onBack={noOp} />;
      case 'identityCheck':
        return <IdentityCheckPage onBack={noOp} onComplete={noOp} />;
      case 'bankLink':
        return <MintBankPage onBack={noOp} onComplete={noOp} />;
      case 'invite':
        return <InvitePage onBack={noOp} />;
      case 'newsArticle':
        return <NewsArticlePage articleId={previewArticleId} onBack={noOp} />;
      case 'openStrategies':
        return <OpenStrategiesPage onBack={noOp} onOpenFactsheet={noOp} />;
      case 'changePassword':
        return <ChangePasswordPage onNavigate={noOp} onBack={noOp} />;
      case 'legal':
        return <LegalDocumentationPage onNavigate={noOp} onBack={noOp} />;
      case 'invest':
        return (
          <AppLayout
            activeTab="home"
            onTabChange={noOp}
            onWithdraw={noOp}
            onShowComingSoon={noOp}
            modal={null}
            onCloseModal={noOp}
          >
            <InvestPage
              onBack={noOp}
              onOpenOpenStrategies={noOp}
              onOpenMarkets={noOp}
            />
          </AppLayout>
        );
      case 'biometricsDebug':
        return (
          <AppLayout
            activeTab="more"
            onTabChange={noOp}
            onWithdraw={noOp}
            onShowComingSoon={noOp}
            modal={null}
            onCloseModal={noOp}
          >
            <BiometricsDebugPage onNavigate={noOp} onBack={noOp} />
          </AppLayout>
        );
      case 'transact':
        return (
          <AppLayout
            activeTab="transact"
            onTabChange={noOp}
            onWithdraw={noOp}
            onShowComingSoon={noOp}
            modal={null}
            onCloseModal={noOp}
          >
            <TransactPage />
          </AppLayout>
        );
      case 'creditScore':
        return (
          <AppLayout
            activeTab="credit"
            onTabChange={noOp}
            onWithdraw={noOp}
            onShowComingSoon={noOp}
            modal={null}
            onCloseModal={noOp}
          >
            <CreditPage
              initialView="score"
              onOpenNotifications={noOp}
              onOpenCreditApply={noOp}
            />
          </AppLayout>
        );
      case 'stockPayment': {
        const previewStockCheckout = isPreview ? (cachedState.stockCheckout || stockCheckout) : stockCheckout;
        const currency = previewStockCheckout.security?.currency || "R";
        const normalizedCurrency = currency.toUpperCase() === "ZAC" ? "R" : currency;
        const paymentItem = previewStockCheckout.security
          ? { ...previewStockCheckout.security, name: previewStockCheckout.security?.name || previewStockCheckout.security?.symbol || "Stock", currency: normalizedCurrency }
          : null;
        return (
          <PaymentPage
            onBack={noOp}
            strategy={paymentItem}
            amount={previewStockCheckout.amount}
            onSuccess={noOp}
            onCancel={noOp}
          />
        );
      }
      case 'payment': {
        const previewAmount = isPreview ? (cachedState.investmentAmount || investmentAmount) : investmentAmount;
        return (
          <PaymentPage
            onBack={noOp}
            strategy={previewStrategy}
            amount={previewAmount}
            onSuccess={noOp}
            onCancel={noOp}
          />
        );
      }
      case 'paymentSuccess':
        return <PaymentSuccessPage onDone={noOp} />;
      case 'userOnboarding':
        return <UserOnboardingPage onComplete={noOp} />;
      default:
        return null;
    }
  }, [selectedSecurity, selectedStrategy, selectedArticleId, stockCheckout, investmentAmount]);

  const previousPageComponent = useMemo(() => {
    if (!previousPageName || mainTabs.includes(currentPage)) return null;
    return renderPageContent(previousPageName, true);
  }, [previousPageName, currentPage, renderPageContent]);

  const handleLockLogout = useCallback(() => {
    if (supabase) supabase.auth.signOut({ scope: 'local' });
    sessionStorage.removeItem('mint_pin_unlocked');
    setShowPinLock(false);
    setCurrentPage("welcome");
  }, []);



  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d12]">
        <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (currentPage === "linkExpired") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-semibold text-slate-900 mb-3">Link Expired</h1>
          <p className="text-slate-600 mb-6">
            This password reset link has expired or is no longer valid. Please request a new one.
          </p>
          <button
            onClick={() => openAuthFlow("forgotPassword")}
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5"
          >
            Request New Link
          </button>
        </div>
      </div>
    );
  }

  if (showSessionExpired && isAuthenticated) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-50">
        <div className="flex w-full max-w-sm flex-col items-center px-8">
          <div className="flex items-center gap-3 mb-10">
            <img src="/assets/mint-logo.svg" alt="Mint" className="h-6 w-auto" />
            <span className="mint-brand text-lg font-semibold tracking-[0.12em]">MINT</span>
          </div>
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white border-2 border-slate-200 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="mt-6 text-2xl font-bold text-slate-900">Session Expired</h1>
          <p className="mt-2 text-center text-sm text-slate-500">
            Your session has expired. Please log in again to continue.
          </p>
          <button
            type="button"
            onClick={() => {
              setShowSessionExpired(false);
              setShowPinLock(false);
              setCurrentPage("auth");
              setAuthStep("loginEmail");
            }}
            className="mt-8 w-full rounded-full bg-slate-900 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition active:scale-95"
          >
            Log In Again
          </button>
        </div>
      </div>
    );
  }

  if (showPinLock && isAuthenticated) {
    return (
      <PinLockScreen
        onUnlock={() => {
          setShowPinLock(false);
          sessionStorage.setItem('mint_pin_unlocked', 'true');
        }}
        onLogout={handleLockLogout}
      />
    );
  }


  if (currentPage === "home") {
    return (
      <AppLayout
        activeTab="home"
        onTabChange={handleTabChange}
        onWithdraw={handleWithdrawRequest}
        onShowComingSoon={handleShowComingSoon}
        modal={modal}
        onCloseModal={closeModal}
      >
        <HomePage
          onOpenNotifications={() => {
            setNotificationReturnPage("home");
            navigateTo("notifications");
          }}
          onOpenMintBalance={() => navigateTo("mintBalance")}
          onOpenActivity={() => navigateTo("activity")}
          onOpenActions={() => navigateTo("actions")}
          onOpenInvestments={() => setCurrentPage("investments")}
          onOpenCredit={() => setCurrentPage("credit")}
          onOpenCreditApply={() => navigateTo("creditApply")}
          onOpenCreditRepay={() => navigateTo("creditRepay")}
          onOpenInvest={() => { setMarketsInitialView(null); navigateTo("markets"); }}
          onOpenWithdraw={handleWithdrawRequest}
          onOpenSettings={() => navigateTo("settings")}
          onOpenStrategies={() => { setMarketsInitialView("openstrategies"); navigateTo("markets"); }}
          onOpenMarkets={() => { setMarketsInitialView("invest"); navigateTo("markets"); }}
          onOpenNews={() => { setMarketsInitialView("news"); navigateTo("markets"); }}
          onOpenNewsArticle={(articleId) => { setSelectedArticleId(articleId); navigateTo("newsArticle"); }}
        />
      </AppLayout>
    );
  }
  if (currentPage === "credit") {
    return (
      <AppLayout
        activeTab="credit"
        onTabChange={handleTabChange}
        onWithdraw={handleWithdrawRequest}
        onShowComingSoon={handleShowComingSoon}
        modal={modal}
        onCloseModal={closeModal}
      >
        <CreditPage
          onOpenNotifications={() => {
            setNotificationReturnPage("credit");
            navigateTo("notifications");
          }}
          onOpenCreditApply={() => navigateTo("creditApply")}
        />
      </AppLayout>
    );
  }
  
  if (currentPage === "creditScore") {
    return (
      <AppLayout
        activeTab="credit"
        onTabChange={handleTabChange}
        onWithdraw={handleWithdrawRequest}
        onShowComingSoon={handleShowComingSoon}
        modal={modal}
        onCloseModal={closeModal}
      >
        <CreditPage
          initialView="score"
          onOpenNotifications={() => {
            setNotificationReturnPage("credit");
            navigateTo("notifications");
          }}
          onOpenCreditApply={() => navigateTo("creditApply")}
        />
      </AppLayout>
    );
  }

  if (currentPage === "statements") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <AppLayout
          activeTab="statements"
          onTabChange={handleTabChange}
          onWithdraw={handleWithdrawRequest}
          onShowComingSoon={handleShowComingSoon}
          modal={modal}
          onCloseModal={closeModal}
        >
          <StatementsPage
            onOpenNotifications={() => {
              setNotificationReturnPage("statements");
              navigateTo("notifications");
            }}
          />
        </AppLayout>
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "transact") {
    return (
      <AppLayout
        activeTab="transact"
        onTabChange={handleTabChange}
        onWithdraw={handleWithdrawRequest}
        onShowComingSoon={handleShowComingSoon}
        modal={modal}
        onCloseModal={closeModal}
      >
        <TransactPage />
      </AppLayout>
    );
  }

  if (currentPage === "investments") {
    return (
      <AppLayout
        activeTab="investments"
        onTabChange={handleTabChange}
        onWithdraw={handleWithdrawRequest}
        onShowComingSoon={handleShowComingSoon}
        modal={modal}
        onCloseModal={closeModal}
      >
        <NewPortfolioPage
          onBack={goBack}
          onOpenNotifications={() => {
            setNotificationReturnPage("investments");
            navigateTo("notifications");
          }}
          onOpenInvest={() => navigateTo("markets")}
          onOpenStrategies={() => { setMarketsInitialView("openstrategies"); navigateTo("markets"); }}
        />
      </AppLayout>
    );
  }

  if (currentPage === "invest") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <AppLayout
          activeTab="home"
          onTabChange={handleTabChange}
          onWithdraw={handleWithdrawRequest}
          onShowComingSoon={handleShowComingSoon}
          modal={modal}
          onCloseModal={closeModal}
        >
          <InvestPage
            onBack={goBack}
            onOpenOpenStrategies={() => navigateTo("openStrategies")}
            onOpenMarkets={() => navigateTo("markets")}
          />
        </AppLayout>
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "markets") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <MarketsPage
          onBack={goBack}
          initialViewMode={marketsInitialView}
          onOpenNotifications={() => {
            setNotificationReturnPage("markets");
            navigateTo("notifications");
          }}
          onOpenStockDetail={(security) => {
            setSelectedSecurity(security);
            navigateTo("stockDetail");
          }}
          onOpenNewsArticle={(articleId) => {
            setSelectedArticleId(articleId);
            navigateTo("newsArticle");
          }}
          onOpenFactsheet={(strategy) => {
            setSelectedStrategy(strategy);
            navigateTo("factsheet");
          }}
        />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "stockDetail") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <StockDetailPage
          security={selectedSecurity}
          onBack={goBack}
          onOpenBuy={() => navigateTo("stockBuy")}
          onNavigateToOnboarding={() => navigateTo("identityCheck")}
        />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "stockBuy") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <StockBuyPage
          security={selectedSecurity}
          onBack={goBack}
          onContinue={(amount, security, baseAmount) => {
            setStockCheckout({ security, amount });
            setPendingGoalFlow({
              type: "stock",
              amount,
              baseAmount: baseAmount || amount,
              assetName: security?.name || security?.symbol || "Stock",
              securityId: security?.id || null,
            });
            setShowGoalModal(true);
          }}
        />
        <GoalLinkModal
          isOpen={showGoalModal && pendingGoalFlow?.type === "stock"}
          onClose={() => { setShowGoalModal(false); setPendingGoalFlow(null); setSelectedGoalId(null); selectedGoalIdRef.current = null; goalInvestAmountRef.current = 0; }}
          onConfirm={(goalId) => {
            setSelectedGoalId(goalId);
            selectedGoalIdRef.current = goalId;
            goalInvestAmountRef.current = pendingGoalFlow?.baseAmount || pendingGoalFlow?.amount || stockCheckout.amount;
            setShowGoalModal(false);
            setPendingGoalFlow(null);
            navigateTo("stockPayment");
          }}
          investmentAmount={pendingGoalFlow?.baseAmount || pendingGoalFlow?.amount || stockCheckout.amount}
          assetName={pendingGoalFlow?.assetName || selectedSecurity?.name || "Stock"}
        />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "stockPayment") {
    const currency = stockCheckout.security?.currency || "R";
    const normalizedCurrency = currency.toUpperCase() === "ZAC" ? "R" : currency;
    const paymentItem = stockCheckout.security
      ? { ...stockCheckout.security, name: stockCheckout.security?.name || stockCheckout.security?.symbol || "Stock", currency: normalizedCurrency }
      : null;
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <PaymentPage
          onBack={goBack}
          strategy={paymentItem}
          amount={stockCheckout.amount}
          onSuccess={async (response) => {
            console.log("Payment successful:", response);
            const goalId = selectedGoalIdRef.current;
            const goalAmount = goalInvestAmountRef.current;
            if (goalId && supabase) {
              try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                  const { data: goal, error: fetchErr } = await supabase
                    .from("investment_goals")
                    .select("current_amount, target_amount")
                    .eq("id", goalId)
                    .single();
                  if (fetchErr) console.error("Error fetching goal for update:", fetchErr);
                  if (goal) {
                    const prevInvested = goal.current_amount || 0;
                    const newInvested = prevInvested + (goalAmount || 0);
                    const progress = goal.target_amount > 0 ? Math.min(100, (newInvested / goal.target_amount) * 100) : 0;
                    const { error: updateErr } = await supabase
                      .from("investment_goals")
                      .update({ current_amount: newInvested })
                      .eq("id", goalId);
                    if (updateErr) {
                      console.error("Goal update failed:", updateErr);
                    } else {
                      console.log("Goal updated successfully:", { goalId, newInvested, progress });
                    }
                  }
                }
              } catch (e) {
                console.error("Error updating goal:", e);
              }
            }
            selectedGoalIdRef.current = null;
            goalInvestAmountRef.current = 0;
            setSelectedGoalId(null);
            navigationHistory.current = [];
            setPreviousPageName(null);
            setCurrentPage("paymentSuccess");
          }}
          onCancel={goBack}
        />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "newsArticle") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <NewsArticlePage
          articleId={selectedArticleId}
          onBack={goBack}
        />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "openStrategies") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <OpenStrategiesPage
          onBack={goBack}
          onOpenFactsheet={(strategy) => {
            setSelectedStrategy(strategy);
            navigateTo("factsheet");
          }}
        />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "factsheet") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <FactsheetPage 
          onBack={goBack} 
          strategy={selectedStrategy}
          onOpenInvest={(strategy) => {
            setSelectedStrategy(strategy);
            navigateTo("investAmount");
          }}
          onNavigateToOnboarding={() => navigateTo("identityCheck")}
        />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "investAmount") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <InvestAmountPage
          onBack={goBack}
          strategy={selectedStrategy}
          onContinue={(amount, baseAmount) => {
            setInvestmentAmount(amount);
            setPendingGoalFlow({
              type: "strategy",
              amount,
              baseAmount: baseAmount || amount,
              assetName: selectedStrategy?.name || "Strategy",
              strategyId: selectedStrategy?.id || selectedStrategy?.strategyId || null,
            });
            setShowGoalModal(true);
          }}
        />
        <GoalLinkModal
          isOpen={showGoalModal && pendingGoalFlow?.type === "strategy"}
          onClose={() => { setShowGoalModal(false); setPendingGoalFlow(null); setSelectedGoalId(null); selectedGoalIdRef.current = null; goalInvestAmountRef.current = 0; }}
          onConfirm={(goalId) => {
            setSelectedGoalId(goalId);
            selectedGoalIdRef.current = goalId;
            goalInvestAmountRef.current = pendingGoalFlow?.baseAmount || pendingGoalFlow?.amount || investmentAmount;
            setShowGoalModal(false);
            setPendingGoalFlow(null);
            navigateTo("payment");
          }}
          investmentAmount={pendingGoalFlow?.baseAmount || pendingGoalFlow?.amount || investmentAmount}
          assetName={pendingGoalFlow?.assetName || selectedStrategy?.name || "Strategy"}
        />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "payment") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <PaymentPage
          onBack={goBack}
          strategy={selectedStrategy}
          amount={investmentAmount}
          onSuccess={async (response) => {
            console.log("Payment successful:", response);
            const goalId = selectedGoalIdRef.current;
            const goalAmount = goalInvestAmountRef.current;
            if (goalId && supabase) {
              try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                  const { data: goal, error: fetchErr } = await supabase
                    .from("investment_goals")
                    .select("current_amount, target_amount")
                    .eq("id", goalId)
                    .single();
                  if (fetchErr) console.error("Error fetching goal for update:", fetchErr);
                  if (goal) {
                    const prevInvested = goal.current_amount || 0;
                    const newInvested = prevInvested + (goalAmount || 0);
                    const progress = goal.target_amount > 0 ? Math.min(100, (newInvested / goal.target_amount) * 100) : 0;
                    const { error: updateErr } = await supabase
                      .from("investment_goals")
                      .update({ current_amount: newInvested })
                      .eq("id", goalId);
                    if (updateErr) {
                      console.error("Goal update failed:", updateErr);
                    } else {
                      console.log("Goal updated successfully:", { goalId, newInvested, progress });
                    }
                  }
                }
              } catch (e) {
                console.error("Error updating goal:", e);
              }
            }
            selectedGoalIdRef.current = null;
            goalInvestAmountRef.current = 0;
            setSelectedGoalId(null);
            navigationHistory.current = [];
            setPreviousPageName(null);
            setCurrentPage("paymentSuccess");
          }}
          onCancel={goBack}
        />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "paymentSuccess") {
    return <PaymentSuccessPage onDone={() => setCurrentPage("home")} />;
  }

  if (currentPage === "more") {
    return (
      <AppLayout
        activeTab="more"
        onTabChange={handleTabChange}
        onWithdraw={handleWithdrawRequest}
        onShowComingSoon={handleShowComingSoon}
        modal={modal}
        onCloseModal={closeModal}
      >
        <MorePage onNavigate={navigateTo} />
      </AppLayout>
    );
  }

  if (currentPage === "settings") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <AppLayout
          activeTab="more"
          onTabChange={handleTabChange}
          onWithdraw={handleWithdrawRequest}
          onShowComingSoon={handleShowComingSoon}
          modal={modal}
          onCloseModal={closeModal}
        >
          <SettingsPage onNavigate={navigateTo} onBack={goBack} />
        </AppLayout>
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "biometricsDebug") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <AppLayout
          activeTab="more"
          onTabChange={handleTabChange}
          onWithdraw={handleWithdrawRequest}
          onShowComingSoon={handleShowComingSoon}
          modal={modal}
          onCloseModal={closeModal}
        >
          <BiometricsDebugPage onNavigate={navigateTo} onBack={goBack} />
        </AppLayout>
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "editProfile") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <EditProfilePage onNavigate={navigateTo} onBack={goBack} />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "profileDetails") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <ProfileDetailsPage onNavigate={navigateTo} onBack={goBack} />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "notifications") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <NotificationsPage
          onBack={goBack}
          onOpenSettings={() => navigateTo("notificationSettings")}
        />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "notificationSettings") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <NotificationSettingsPage onBack={goBack} />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "mintBalance") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <AppLayout
          activeTab="home"
          onTabChange={handleTabChange}
          onWithdraw={handleWithdrawRequest}
          onShowComingSoon={handleShowComingSoon}
          modal={modal}
          onCloseModal={closeModal}
        >
          <MintBalancePage
            onBack={goBack}
            onOpenInvestments={() => setCurrentPage("investments")}
            onOpenCredit={() => setCurrentPage("credit")}
            onOpenActivity={() => navigateTo("activity")}
            onOpenSettings={() => navigateTo("settings")}
            onOpenInvest={() => navigateTo("markets")}
            onOpenCreditApply={() => navigateTo("creditApply")}
          />
        </AppLayout>
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "activity") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <AppLayout
          activeTab="home"
          onTabChange={handleTabChange}
          onWithdraw={handleWithdrawRequest}
          onShowComingSoon={handleShowComingSoon}
          modal={modal}
          onCloseModal={closeModal}
        >
          <ActivityPage onBack={goBack} />
        </AppLayout>
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "actions") {
    return (
      <SwipeBackWrapper onBack={() => navigateTo("home")} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <ActionsPage
          onBack={() => navigateTo("home")}
          onNavigate={navigateTo}
        />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "identityCheck") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <IdentityCheckPage 
          onBack={() => navigateTo("home")} 
          onComplete={() => navigateTo("home")}
        />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "bankLink") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <MintBankPage
          onBack={goBack}
          onComplete={() => setCurrentPage("home")}
        />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "invite") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <InvitePage onBack={goBack} />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "creditApply") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <CreditApplyPage onBack={goBack} />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "creditRepay") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <CreditRepayPage onBack={goBack} />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "changePassword") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <ChangePasswordPage onNavigate={navigateTo} onBack={goBack} />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "activeSessions") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <ActiveSessionsPage onBack={goBack} onLogout={() => { if (supabase) supabase.auth.signOut(); setCurrentPage("welcome"); }} />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "pinSetup") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <PinSetupPage onBack={goBack} />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "legal") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <LegalDocumentationPage onNavigate={navigateTo} onBack={goBack} />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "userOnboarding") {
    return <UserOnboardingPage onComplete={() => setCurrentPage("home")} />;
  }

  if (currentPage === "welcome") {
    return (
      <OnboardingPage
        onCreateAccount={() => openAuthFlow("email")}
        onLogin={() => openAuthFlow("loginEmail")}
      />
    );
  }

  const recordSession = async () => {
    try {
      if (!supabase) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;
      const ua = navigator.userAgent || '';
      let browser = 'Unknown';
      if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
      else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
      else if (ua.includes('Firefox')) browser = 'Firefox';
      else if (ua.includes('Edg')) browser = 'Edge';
      else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';
      let os = 'Unknown';
      if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
      else if (ua.includes('Android')) os = 'Android';
      else if (ua.includes('Mac OS')) os = 'macOS';
      else if (ua.includes('Windows')) os = 'Windows';
      else if (ua.includes('Linux')) os = 'Linux';
      const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      const deviceType = isMobile ? 'mobile' : 'desktop';
      let fingerprint = localStorage.getItem('mint_session_fingerprint');
      if (!fingerprint) {
        fingerprint = 'sf_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem('mint_session_fingerprint', fingerprint);
      }
      const res = await fetch('/api/sessions/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userAgent: ua, browser, os, deviceType, sessionFingerprint: fingerprint }),
      });
      const json = await res.json();
      if (json.sessionId) {
        localStorage.setItem('mint_session_id', json.sessionId);
      }
    } catch (err) {
      console.error('Failed to record session:', err);
    }
  };

  const handleSignupComplete = async () => {
    justLoggedInRef.current = true;
    sessionCheckSkipUntilRef.current = Date.now() + 30000;
    localStorage.setItem('mint_last_activity', Date.now().toString());
    setCurrentPage("home");
    try {
      await recordSession();
      if (supabase) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          await createWelcomeNotification(userData.user.id).catch(() => {});
          await refetchNotifications().catch(() => {});
        }
      }
    } catch (err) {
      console.error('Post-signup tasks error:', err);
    }
    justLoggedInRef.current = false;
  };

  const handleLoginComplete = async () => {
    justLoggedInRef.current = true;
    sessionCheckSkipUntilRef.current = Date.now() + 30000;
    setShowSessionExpired(false);
    localStorage.setItem('mint_last_activity', Date.now().toString());
    const returnPage = sessionExpiredPageRef.current;
    if (returnPage && !['welcome', 'auth', 'linkExpired'].includes(returnPage)) {
      setCurrentPage(returnPage);
      sessionExpiredPageRef.current = null;
    } else {
      setCurrentPage("home");
    }
    try {
      await recordSession();
      if (supabase) {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          await refetchNotifications().catch(() => {});
        }
      }
    } catch (err) {
      console.error('Post-login tasks error:', err);
    }
    justLoggedInRef.current = false;
  };

  const handlePreLogin = () => {
    justLoggedInRef.current = true;
    sessionCheckSkipUntilRef.current = Date.now() + 30000;
  };

  return (
    <AuthPage
      initialStep={authStep}
      onSignupComplete={handleSignupComplete}
      onLoginComplete={handleLoginComplete}
      onPreLogin={handlePreLogin}
    />
  );
};

export default App;
