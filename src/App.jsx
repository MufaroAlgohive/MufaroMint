import { useEffect, useState, useRef } from "react";
import { supabase } from "./lib/supabase.js";

import AuthPage from "./pages/AuthPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import CreditPage from "./pages/CreditPage.jsx";
import CreditApplyPage from "./pages/CreditApplyPage.jsx";
import CreditRepayPage from "./pages/CreditRepayPage.jsx";
import InvestmentsPage from "./pages/InvestmentsPage.jsx";
import InvestPage from "./pages/InvestPage.jsx";
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
import MintBalancePage from "./pages/MintBalancePage.jsx";
import ActivityPage from "./pages/ActivityPage.jsx";
import ActionsPage from "./pages/ActionsPage.jsx";
import WithdrawPage from "./pages/WithdrawPage.jsx";
import ProfileDetailsPage from "./pages/ProfileDetailsPage.jsx";
import ChangePasswordPage from "./pages/ChangePasswordPage.jsx";
import LegalDocumentationPage from "./pages/LegalDocumentationPage.jsx";

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

const App = () => {
  const [currentPage, setCurrentPage] = useState(hasError ? "linkExpired" : (isRecoveryMode ? "auth" : "welcome"));
  const [authStep, setAuthStep] = useState(isRecoveryMode ? "newPassword" : "email");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [notificationReturnPage, setNotificationReturnPage] = useState("home");
  const recoveryHandled = useRef(false);

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
    
    if (isRecoveryMode) {
      setupRecoverySession();
    } else {
      setIsCheckingAuth(false);
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
    });
    
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const openAuthFlow = (step) => {
    setAuthStep(step);
    setCurrentPage("auth");
  };

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

  if (currentPage === "welcome") {
    return (
      <OnboardingPage
        onCreateAccount={() => openAuthFlow("email")}
        onLogin={() => openAuthFlow("loginEmail")}
      />
    );
  }

  if (currentPage === "home") {
    return (
      <AppLayout activeTab="home" onTabChange={setCurrentPage}>
        <HomePage
          onOpenNotifications={() => {
            setNotificationReturnPage("home");
            setCurrentPage("notifications");
          }}
          onOpenMintBalance={() => setCurrentPage("mintBalance")}
          onOpenActivity={() => setCurrentPage("activity")}
          onOpenActions={() => setCurrentPage("actions")}
          onOpenInvestments={() => setCurrentPage("investments")}
          onOpenCredit={() => setCurrentPage("credit")}
          onOpenCreditApply={() => setCurrentPage("creditApply")}
          onOpenCreditRepay={() => setCurrentPage("creditRepay")}
          onOpenInvest={() => setCurrentPage("invest")}
          onOpenWithdraw={() => setCurrentPage("withdraw")}
          onOpenSettings={() => setCurrentPage("settings")}
        />
      </AppLayout>
    );
  }

  if (currentPage === "credit") {
    return (
      <AppLayout activeTab="credit" onTabChange={setCurrentPage}>
        <CreditPage
          onOpenNotifications={() => {
            setNotificationReturnPage("credit");
            setCurrentPage("notifications");
          }}
        />
      </AppLayout>
    );
  }

  if (currentPage === "transact") {
    return (
      <AppLayout activeTab="transact" onTabChange={setCurrentPage}>
        <TransactPage />
      </AppLayout>
    );
  }

  if (currentPage === "investments") {
    return (
      <AppLayout activeTab="investments" onTabChange={setCurrentPage}>
        <InvestmentsPage
          onOpenNotifications={() => {
            setNotificationReturnPage("investments");
            setCurrentPage("notifications");
          }}
        />
      </AppLayout>
    );
  }

  if (currentPage === "invest") {
    return (
      <AppLayout activeTab="home" onTabChange={setCurrentPage}>
        <InvestPage
          onBack={() => setCurrentPage("home")}
          onOpenOpenStrategies={() => setCurrentPage("openStrategies")}
          onOpenMarkets={() => setCurrentPage("investments")}
        />
      </AppLayout>
    );
  }

  if (currentPage === "openStrategies") {
    return (
      <OpenStrategiesPage
        onBack={() => setCurrentPage("invest")}
        onOpenFactsheet={() => setCurrentPage("factsheet")}
      />
    );
  }

  if (currentPage === "factsheet") {
    return <FactsheetPage onBack={() => setCurrentPage("openStrategies")} />;
  }

  if (currentPage === "withdraw") {
    return <WithdrawPage />;
  }

  if (currentPage === "more") {
    return (
      <AppLayout activeTab="more" onTabChange={setCurrentPage}>
        <MorePage onNavigate={setCurrentPage} />
      </AppLayout>
    );
  }

  if (currentPage === "settings") {
    return (
      <AppLayout activeTab="more" onTabChange={setCurrentPage}>
        <SettingsPage onNavigate={setCurrentPage} />
      </AppLayout>
    );
  }

  if (currentPage === "biometricsDebug") {
    return (
      <AppLayout activeTab="more" onTabChange={setCurrentPage}>
        <BiometricsDebugPage onNavigate={setCurrentPage} />
      </AppLayout>
    );
  }

  if (currentPage === "editProfile") {
    return <EditProfilePage onNavigate={setCurrentPage} />;
  }

  if (currentPage === "profileDetails") {
    return <ProfileDetailsPage onNavigate={setCurrentPage} />;
  }

  if (currentPage === "notifications") {
    return <NotificationsPage onBack={() => setCurrentPage(notificationReturnPage)} />;
  }

  if (currentPage === "mintBalance") {
    return (
      <AppLayout activeTab="home" onTabChange={setCurrentPage}>
        <MintBalancePage
          onBack={() => setCurrentPage("home")}
          onOpenInvestments={() => setCurrentPage("investments")}
          onOpenCredit={() => setCurrentPage("credit")}
          onOpenActivity={() => setCurrentPage("activity")}
          onOpenSettings={() => setCurrentPage("settings")}
        />
      </AppLayout>
    );
  }

  if (currentPage === "activity") {
    return (
      <AppLayout activeTab="home" onTabChange={setCurrentPage}>
        <ActivityPage onBack={() => setCurrentPage("mintBalance")} />
      </AppLayout>
    );
  }

  if (currentPage === "actions") {
    return <ActionsPage onBack={() => setCurrentPage("home")} />;
  }

  if (currentPage === "creditApply") {
    return <CreditApplyPage />;
  }

  if (currentPage === "creditRepay") {
    return <CreditRepayPage />;
  }

  if (currentPage === "changePassword") {
    return <ChangePasswordPage onNavigate={setCurrentPage} />;
  }

  if (currentPage === "legal") {
    return <LegalDocumentationPage onNavigate={setCurrentPage} />;
  }

  if (currentPage === "userOnboarding") {
    return <UserOnboardingPage onComplete={() => setCurrentPage("home")} />;
  }

  return (
    <AuthPage
      initialStep={authStep}
      onSignupComplete={() => setCurrentPage("userOnboarding")}
      onLoginComplete={() => setCurrentPage("home")}
    />
  );
};

export default App;
