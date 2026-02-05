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
  const [previousPageName, setPreviousPageName] = useState(null);
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
      if (!Capacitor.isNativePlatform()) {
        window.history.pushState({ page, index: navigationHistory.current.length }, '', window.location.pathname);
      }
    } else {
      navigationHistory.current = [];
      setPreviousPageName(null);
      if (!Capacitor.isNativePlatform()) {
        window.history.replaceState({ page, index: 0 }, '', window.location.pathname);
      }
    }
    
    setCurrentPage(page);
  }, [currentPage, cacheCurrentPageState]);

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
    if (Capacitor.isNativePlatform()) {
      return;
    }

    const handlePopState = (event) => {
      if (navigationHistory.current.length > 0) {
        const prevPage = navigationHistory.current.pop();
        const newPreviousPage = navigationHistory.current.length > 0 
          ? navigationHistory.current[navigationHistory.current.length - 1] 
          : null;
        setPreviousPageName(newPreviousPage);
        setCurrentPage(prevPage);
      } else if (!mainTabs.includes(currentPage)) {
        setPreviousPageName(null);
        setCurrentPage('home');
      } else {
        window.history.pushState({ page: currentPage, index: 0 }, '', window.location.pathname);
      }
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
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
            <InvestmentsPage
              onOpenNotifications={noOp}
              onOpenInvest={noOp}
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
        return <BankLinkPage onBack={noOp} onComplete={noOp} />;
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
            navigateTo("notifications");
          }}
          onOpenMintBalance={() => navigateTo("mintBalance")}
          onOpenActivity={() => navigateTo("activity")}
          onOpenActions={() => navigateTo("actions")}
          onOpenInvestments={() => setCurrentPage("investments")}
          onOpenCredit={() => setCurrentPage("credit")}
          onOpenCreditApply={() => navigateTo("creditApply")}
          onOpenCreditRepay={() => navigateTo("creditRepay")}
          onOpenInvest={() => navigateTo("markets")}
          onOpenWithdraw={handleWithdrawRequest}
          onOpenSettings={() => navigateTo("settings")}
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
            navigateTo("notifications");
          }}
          onOpenCreditApply={() => navigateTo("creditApply")}
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
            navigateTo("notifications");
          }}
          onOpenInvest={() => navigateTo("markets")}
        />
      </AppLayout>
    );
  }

  if (currentPage === "invest") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <AppLayout
          activeTab="home"
          onTabChange={setCurrentPage}
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
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <PaymentPage
          onBack={goBack}
          strategy={paymentItem}
          amount={stockCheckout.amount}
          onSuccess={(response) => {
            console.log("Payment successful:", response);
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
          onContinue={(amount) => {
            setInvestmentAmount(amount);
            navigateTo("payment");
          }}
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
          onSuccess={(response) => {
            console.log("Payment successful:", response);
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
        onTabChange={setCurrentPage}
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
          onTabChange={setCurrentPage}
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
          onTabChange={setCurrentPage}
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
          onTabChange={setCurrentPage}
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
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <ActionsPage
          onBack={goBack}
          onNavigate={navigateTo}
        />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "identityCheck") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <IdentityCheckPage 
          onBack={goBack} 
          onComplete={() => navigateTo("actions")}
        />
      </SwipeBackWrapper>
    );
  }

  if (currentPage === "bankLink") {
    return (
      <SwipeBackWrapper onBack={goBack} enabled={canSwipeBack} previousPage={previousPageComponent}>
        <BankLinkPage
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
