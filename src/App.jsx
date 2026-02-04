import { useEffect, useState, useRef, useCallback } from "react";
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
import IdentityCheckPage from "./pages/IdentityCheckPage.jsx";
import BankLinkPage from "./pages/BankLinkPage.jsx";
import InvitePage from "./pages/InvitePage.jsx";

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

const mainTabs = ['home', 'credit', 'transact', 'investments', 'more', 'welcome', 'auth'];

const App = () => {
  const [currentPage, setCurrentPage] = useState(hasError ? "linkExpired" : (isRecoveryMode ? "auth" : "welcome"));
  const [authStep, setAuthStep] = useState(isRecoveryMode ? "newPassword" : "email");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [notificationReturnPage, setNotificationReturnPage] = useState("home");
  const [modal, setModal] = useState(null);
  const [selectedSecurity, setSelectedSecurity] = useState(null);
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [selectedArticleId, setSelectedArticleId] = useState(null);
  const [investmentAmount, setInvestmentAmount] = useState(0);
  const [stockCheckout, setStockCheckout] = useState({ security: null, amount: 0 });
  const recoveryHandled = useRef(false);
  const { refetch: refetchNotifications } = useNotificationsContext();
  
  const navigationHistory = useRef([]);
  
  const navigateTo = useCallback((page) => {
    if (page === currentPage) return;
    
    if (!mainTabs.includes(page)) {
      navigationHistory.current.push(currentPage);
      if (navigationHistory.current.length > 20) {
        navigationHistory.current = navigationHistory.current.slice(-20);
      }
    } else {
      navigationHistory.current = [];
    }
    
    setCurrentPage(page);
  }, [currentPage]);

  const goBack = useCallback(() => {
    if (navigationHistory.current.length > 0) {
      const previousPage = navigationHistory.current.pop();
      setCurrentPage(previousPage);
      return true;
    }
    
    if (!mainTabs.includes(currentPage)) {
      setCurrentPage('home');
      return true;
    }
    
    return false;
  }, [currentPage]);

  const canSwipeBack = !mainTabs.includes(currentPage);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
      return;
    }

    const handleBackButton = ({ canGoBack }) => {
      console.log('🔙 Global back button pressed');
      console.log('📍 Current page:', currentPage);
      console.log('📚 Navigation history:', navigationHistory.current);
      console.log('🔓 Can swipe back:', canSwipeBack);

      if (canSwipeBack) {
        const didGoBack = goBack();
        console.log('✅ goBack called, result:', didGoBack);
      } else {
        console.log('📱 On main tab, allowing app exit');
        CapacitorApp.exitApp();
      }
    };

    const listener = CapacitorApp.addListener('backButton', handleBackButton);

    return () => {
      listener.then(l => l.remove());
    };
  }, [currentPage, canSwipeBack, goBack]);

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

  if (currentPage === "home") {
    return (
      <AppLayout
        activeTab="home"
        onTabChange={setCurrentPage}
        onWithdraw={handleWithdrawRequest}
        onShowComingSoon={handleShowComingSoon}
        modal={modal}
        onCloseModal={closeModal}
      >
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
          onOpenInvest={() => setCurrentPage("markets")}
          onOpenWithdraw={handleWithdrawRequest}
          onOpenSettings={() => setCurrentPage("settings")}
        />
      </AppLayout>
    );
  }
  if (currentPage === "credit") {
    return (
      <AppLayout
        activeTab="credit"
        onTabChange={setCurrentPage}
        onWithdraw={handleWithdrawRequest}
        onShowComingSoon={handleShowComingSoon}
        modal={modal}
        onCloseModal={closeModal}
      >
        <CreditPage
          onOpenNotifications={() => {
            setNotificationReturnPage("credit");
            setCurrentPage("notifications");
          }}
          onOpenCreditApply={() => setCurrentPage("creditApply")}
        />
      </AppLayout>
    );
  }
  
  if (currentPage === "creditScore") {
    return (
      <AppLayout
        activeTab="credit"
        onTabChange={setCurrentPage}
        onWithdraw={handleWithdrawRequest}
        onShowComingSoon={handleShowComingSoon}
        modal={modal}
        onCloseModal={closeModal}
      >
        <CreditPage
          initialView="score"
          onOpenNotifications={() => {
            setNotificationReturnPage("credit");
            setCurrentPage("notifications");
          }}
          onOpenCreditApply={() => setCurrentPage("creditApply")}
        />
      </AppLayout>
    );
  }

  if (currentPage === "transact") {
    return (
      <AppLayout
        activeTab="transact"
        onTabChange={setCurrentPage}
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
        onTabChange={setCurrentPage}
        onWithdraw={handleWithdrawRequest}
        onShowComingSoon={handleShowComingSoon}
        modal={modal}
        onCloseModal={closeModal}
      >
        <InvestmentsPage
          onOpenNotifications={() => {
            setNotificationReturnPage("investments");
            setCurrentPage("notifications");
          }}
          onOpenInvest={() => setCurrentPage("markets")}
        />
      </AppLayout>
    );
  }

  if (currentPage === "invest") {
    return (
      <AppLayout
        activeTab="home"
        onTabChange={setCurrentPage}
        onWithdraw={handleWithdrawRequest}
        onShowComingSoon={handleShowComingSoon}
        modal={modal}
        onCloseModal={closeModal}
      >
        <InvestPage
          onBack={() => setCurrentPage("home")}
          onOpenOpenStrategies={() => setCurrentPage("openStrategies")}
          onOpenMarkets={() => setCurrentPage("markets")}
        />
      </AppLayout>
    );
  }

  if (currentPage === "markets") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack}>
        <MarketsPage
          onBack={goBack}
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
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack}>
        <StockDetailPage
          security={selectedSecurity}
          onBack={goBack}
          onOpenBuy={() => navigateTo("stockBuy")}
        />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "stockBuy") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack}>
        <StockBuyPage
          security={selectedSecurity}
          onBack={goBack}
          onContinue={(amount, security) => {
            setStockCheckout({ security, amount });
            navigateTo("stockPayment");
          }}
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
      <PaymentPage
        onBack={() => setCurrentPage("stockBuy")}
        strategy={paymentItem}
        amount={stockCheckout.amount}
        onSuccess={(response) => {
          console.log("Payment successful:", response);
          setCurrentPage("paymentSuccess");
        }}
        onCancel={() => {
          setCurrentPage("stockBuy");
        }}
      />
    );
  }

  if (currentPage === "newsArticle") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack}>
        <NewsArticlePage
          articleId={selectedArticleId}
          onBack={goBack}
        />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "openStrategies") {
    return (
      <OpenStrategiesPage
        onBack={() => setCurrentPage("invest")}
        onOpenFactsheet={(strategy) => {
          setSelectedStrategy(strategy);
          setCurrentPage("factsheet");
        }}
      />
    );
  }

  if (currentPage === "factsheet") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack}>
        <FactsheetPage 
          onBack={goBack} 
          strategy={selectedStrategy}
          onOpenInvest={(strategy) => {
            setSelectedStrategy(strategy);
            navigateTo("investAmount");
          }}
        />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "investAmount") {
    return (
      <InvestAmountPage
        onBack={() => setCurrentPage("factsheet")}
        strategy={selectedStrategy}
        onContinue={(amount) => {
          setInvestmentAmount(amount);
          setCurrentPage("payment");
        }}
      />
    );
  }

  if (currentPage === "payment") {
    return (
      <PaymentPage
        onBack={() => setCurrentPage("investAmount")}
        strategy={selectedStrategy}
        amount={investmentAmount}
        onSuccess={(response) => {
          console.log("Payment successful:", response);
          // TODO: Record transaction in database
          setCurrentPage("paymentSuccess");
        }}
        onCancel={() => {
          setCurrentPage("investAmount");
        }}
      />
    );
  }

  if (currentPage === "paymentSuccess") {
    return <PaymentSuccessPage onDone={() => setCurrentPage("home")} />;
  }

  if (currentPage === "more") {
    return (
      <AppLayout
        activeTab="more"
        onTabChange={setCurrentPage}
        onWithdraw={handleWithdrawRequest}
        onShowComingSoon={handleShowComingSoon}
        modal={modal}
        onCloseModal={closeModal}
      >
        <MorePage onNavigate={setCurrentPage} />
      </AppLayout>
    );
  }

  if (currentPage === "settings") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack}>
        <AppLayout
          activeTab="more"
          onTabChange={setCurrentPage}
          onWithdraw={handleWithdrawRequest}
          onShowComingSoon={handleShowComingSoon}
          modal={modal}
          onCloseModal={closeModal}
        >
          <SettingsPage onNavigate={navigateTo} />
        </AppLayout>
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "biometricsDebug") {
    return (
      <AppLayout
        activeTab="more"
        onTabChange={setCurrentPage}
        onWithdraw={handleWithdrawRequest}
        onShowComingSoon={handleShowComingSoon}
        modal={modal}
        onCloseModal={closeModal}
      >
        <BiometricsDebugPage onNavigate={setCurrentPage} />
      </AppLayout>
    );
  }

  if (currentPage === "editProfile") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack}>
        <EditProfilePage onNavigate={navigateTo} />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "profileDetails") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack}>
        <ProfileDetailsPage onNavigate={navigateTo} />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "notifications") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack}>
        <NotificationsPage
          onBack={() => setCurrentPage(notificationReturnPage)}
          onOpenSettings={() => navigateTo("notificationSettings")}
        />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "notificationSettings") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack}>
        <NotificationSettingsPage onBack={goBack} />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "mintBalance") {
    return (
      <AppLayout
        activeTab="home"
        onTabChange={setCurrentPage}
        onWithdraw={handleWithdrawRequest}
        onShowComingSoon={handleShowComingSoon}
        modal={modal}
        onCloseModal={closeModal}
      >
        <MintBalancePage
          onBack={() => setCurrentPage("home")}
          onOpenInvestments={() => setCurrentPage("investments")}
          onOpenCredit={() => setCurrentPage("credit")}
          onOpenActivity={() => setCurrentPage("activity")}
          onOpenSettings={() => setCurrentPage("settings")}
          onOpenInvest={() => setCurrentPage("markets")}
          onOpenCreditApply={() => setCurrentPage("creditApply")}
        />
      </AppLayout>
    );
  }

  if (currentPage === "activity") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack}>
        <AppLayout
          activeTab="home"
          onTabChange={setCurrentPage}
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
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack}>
        <ActionsPage
          onBack={goBack}
          onNavigate={navigateTo}
        />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "identityCheck") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack}>
        <IdentityCheckPage 
          onBack={goBack} 
          onComplete={() => setCurrentPage("actions")}
        />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "bankLink") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack}>
        <BankLinkPage
          onBack={goBack}
          onComplete={() => setCurrentPage("home")}
        />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "invite") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack}>
        <InvitePage onBack={goBack} />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "creditApply") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack}>
        <CreditApplyPage onBack={goBack} />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "creditRepay") {
    return <CreditRepayPage />;
  }

  if (currentPage === "changePassword") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack}>
        <ChangePasswordPage onNavigate={navigateTo} />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "legal") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack}>
        <LegalDocumentationPage onNavigate={navigateTo} />
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

  const handleSignupComplete = async () => {
    if (supabase) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        await createWelcomeNotification(userData.user.id);
        await refetchNotifications();
      }
    }
    setCurrentPage("home");
  };

  const handleLoginComplete = async () => {
    if (supabase) {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        await createWelcomeNotification(userData.user.id);
        await refetchNotifications();
      }
    }
    setCurrentPage("home");
  };

  return (
    <AuthPage
      initialStep={authStep}
      onSignupComplete={handleSignupComplete}
      onLoginComplete={handleLoginComplete}
    />
  );
};

export default App;
