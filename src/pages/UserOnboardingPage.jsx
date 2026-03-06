import { useEffect, useRef, useState } from "react";
import SumsubVerification from "../components/SumsubVerification";
import MandateViewer from "../components/MandateViewer";
import { supabase } from "../lib/supabase";
import { useProfile } from "../lib/useProfile";
import "../styles/onboarding-process.css";

const ClipboardCheckIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 5.25H7.5A1.5 1.5 0 0 0 6 6.75v10.5A1.5 1.5 0 0 0 7.5 18.75h9A1.5 1.5 0 0 0 18 17.25V6.75A1.5 1.5 0 0 0 16.5 5.25H15M9 5.25A1.5 1.5 0 0 0 10.5 6.75h3A1.5 1.5 0 0 0 15 5.25M9 5.25A1.5 1.5 0 0 1 10.5 3.75h3A1.5 1.5 0 0 1 15 5.25M9.75 13.5l1.5 1.5 3-3"
    />
  </svg>
);

const ArrowLeftIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
  </svg>
);

const FileContractIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.25 3.75H8.25a1.5 1.5 0 0 0-1.5 1.5v13.5a1.5 1.5 0 0 0 1.5 1.5h7.5a1.5 1.5 0 0 0 1.5-1.5V9.75m-3-6 3 3m-3-3v3h3"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 13.5h6m-6 3h4"
    />
  </svg>
);

const ShieldIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
    />
  </svg>
);

const WalletIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1 0 6h3.75A2.25 2.25 0 0 0 21 13.5V12Zm0 0V9.75a2.25 2.25 0 0 0-2.25-2.25h-13.5A2.25 2.25 0 0 0 3 9.75v7.5A2.25 2.25 0 0 0 5.25 19.5h13.5A2.25 2.25 0 0 0 21 17.25V12ZM5.25 7.5h13.5A2.25 2.25 0 0 1 21 9.75M5.25 7.5A2.25 2.25 0 0 0 3 9.75M5.25 7.5V6a2.25 2.25 0 0 1 2.25-2.25h9A2.25 2.25 0 0 1 18.75 6v1.5"
    />
  </svg>
);

const BankIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6M4.5 9.75v10.5h15V9.75" />
  </svg>
);

const southAfricanBanks = [
  { value: "", label: "Select your bank", logo: null },
  { value: "absa", label: "Absa Bank", logo: "https://logo.clearbit.com/absa.co.za" },
  { value: "african_bank", label: "African Bank", logo: "https://logo.clearbit.com/africanbank.co.za" },
  { value: "bidvest_bank", label: "Bidvest Bank", logo: "https://logo.clearbit.com/bidvestbank.co.za" },
  { value: "capitec", label: "Capitec Bank", logo: "https://logo.clearbit.com/capitecbank.co.za" },
  { value: "discovery_bank", label: "Discovery Bank", logo: "https://logo.clearbit.com/discovery.co.za" },
  { value: "fnb", label: "First National Bank (FNB)", logo: "https://logo.clearbit.com/fnb.co.za" },
  { value: "investec", label: "Investec", logo: "https://logo.clearbit.com/investec.com" },
  { value: "nedbank", label: "Nedbank", logo: "https://logo.clearbit.com/nedbank.co.za" },
  { value: "old_mutual", label: "Old Mutual", logo: "https://logo.clearbit.com/oldmutual.co.za" },
  { value: "sasfin", label: "Sasfin Bank", logo: "https://logo.clearbit.com/sasfin.com" },
  { value: "standard_bank", label: "Standard Bank", logo: "https://logo.clearbit.com/standardbank.co.za" },
  { value: "tyme_bank", label: "TymeBank", logo: "https://logo.clearbit.com/tymebank.co.za" },
  { value: "zero", label: "Bank Zero", logo: "https://logo.clearbit.com/bankzero.co.za" },
  { value: "other", label: "Other", logo: null },
];

const employmentOptions = [
  { value: "", label: "Select your status" },
  { value: "employed", label: "Employed" },
  { value: "self-employed", label: "Self-Employed" },
  { value: "unemployed", label: "Unemployed" },
  { value: "student", label: "Student" },
  { value: "contractor", label: "Contractor" },
  { value: "retired", label: "Retired" },
];

const sourceOfFundsOptions = [
  { value: "", label: "Select source of funds" },
  { value: "salary", label: "Salary / Employment Income" },
  { value: "business", label: "Business Income" },
  { value: "savings", label: "Savings" },
  { value: "investment_returns", label: "Investment Returns" },
  { value: "inheritance", label: "Inheritance" },
  { value: "gift", label: "Gift" },
  { value: "pension", label: "Pension / Retirement Fund" },
  { value: "property_sale", label: "Sale of Property" },
  { value: "other", label: "Other" },
];

const monthlyInvestmentOptions = [
  { value: "", label: "Select amount range" },
  { value: "under_1000", label: "Less than R1,000" },
  { value: "1000_5000", label: "R1,000 - R5,000" },
  { value: "5000_10000", label: "R5,000 - R10,000" },
  { value: "10000_50000", label: "R10,000 - R50,000" },
  { value: "50000_100000", label: "R50,000 - R100,000" },
  { value: "over_100000", label: "More than R100,000" },
];

const OnboardingProcessPage = ({ onBack, onComplete }) => {
  const { profile } = useProfile();
  const [step, setStep] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [employmentStatus, setEmploymentStatus] = useState("");
  const [employerName, setEmployerName] = useState("");
  const [employerIndustry, setEmployerIndustry] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [courseName, setCourseName] = useState("");
  const [graduationDate, setGraduationDate] = useState("");
  const [incomeCurrency, setIncomeCurrency] = useState("USD");
  const [annualIncome, setAnnualIncome] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showProceed, setShowProceed] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [existingOnboardingId, setExistingOnboardingId] = useState(null);
  const [agreedRiskDisclosure, setAgreedRiskDisclosure] = useState(false);
  const [agreedMandate, setAgreedMandate] = useState(false);
  const [mandateValid, setMandateValid] = useState(false);
  const mandateDataRef = useRef(null);
  const [sourceOfFunds, setSourceOfFunds] = useState("");
  const [sourceOfFundsOther, setSourceOfFundsOther] = useState("");
  const [expectedMonthlyInvestment, setExpectedMonthlyInvestment] = useState("");
  const [agreedSourceOfFunds, setAgreedSourceOfFunds] = useState(false);
  const [sofDropdownOpen, setSofDropdownOpen] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankBranchCode, setBankBranchCode] = useState("");
  const [identityNumber, setIdentityNumber] = useState("");
  const [identityCheckLoading, setIdentityCheckLoading] = useState(false);
  const [identityCheckError, setIdentityCheckError] = useState("");
  const [bankDropdownOpen, setBankDropdownOpen] = useState(false);
  const bankDropdownRef = useRef(null);
  const [kycAlreadyVerified, setKycAlreadyVerified] = useState(false);
  const [authStatus, setAuthStatus] = useState({
    isChecked: false,
    isAuthenticated: false,
    displayName: "",
  });
  const dropdownRef = useRef(null);
  const sofDropdownRef = useRef(null);

  const selectedOption = employmentOptions.find(
    (option) => option.value === employmentStatus
  );

  const selectedSofOption = sourceOfFundsOptions.find(
    (option) => option.value === sourceOfFunds
  );

  const selectedBankOption = southAfricanBanks.find(
    (option) => option.value === bankName
  );

  const handleBankSelect = (value) => {
    setBankName(value);
    setBankDropdownOpen(false);
  };

  const bankDetailsReady = bankName && bankAccountNumber && bankBranchCode;

  const goToStep = (nextStep) => {
    setIsFading(true);
    window.setTimeout(() => {
      setStep(nextStep);
      setIsFading(false);
    }, 260);
  };

  const ensureOnboardingRecord = async () => {
    if (existingOnboardingId) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const apiBase = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${apiBase}/api/onboarding/save-employment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ employment_status: "not_provided", annual_income_currency: "ZAR" }),
      });
      const result = await res.json();
      if (result.success && result.onboarding_id) {
        setExistingOnboardingId(result.onboarding_id);
      }
    } catch (err) {
      console.error("[Onboarding] Failed to ensure onboarding record:", err);
    }
  };

  const handleContinue = async () => {
    if (step === 0) {
      goToStep(1);
    }
  };

  const handleIdentityCheckContinue = async () => {
    setIdentityCheckError("");

    const cleanIdNumber = identityNumber.replace(/\D/g, "");
    if (!/^\d{13}$/.test(cleanIdNumber)) {
      setIdentityCheckError("Please enter a valid 13-digit ID number.");
      return;
    }

    if (!supabase) {
      setIdentityCheckError("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      return;
    }

    setIdentityCheckLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setIdentityCheckError("You must be signed in to continue.");
        return;
      }

      const res = await fetch("/api/onboarding/check-id-number", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id_number: cleanIdNumber }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to verify ID number.");
      }

      if (result.exists) {
        setIdentityCheckError("ID already exists");
        return;
      }

      await ensureOnboardingRecord();
      if (kycAlreadyVerified) {
        goToStep(3);
      } else {
        goToStep(2);
      }
    } catch (err) {
      setIdentityCheckError(err?.message || "Failed to verify ID number.");
    } finally {
      setIdentityCheckLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 7) {
      goToStep(6);
    } else if (step === 6) {
      goToStep(5);
    } else if (step === 5) {
      goToStep(4);
    } else if (step === 4) {
      goToStep(3);
    } else if (step === 3) {
      if (kycAlreadyVerified) {
        goToStep(1);
      } else {
        goToStep(2);
      }
    } else if (step === 2) {
      goToStep(1);
    } else if (step === 1) {
      goToStep(0);
    } else if (onBack) {
      onBack();
    }
  };

  const handleSelect = (value) => {
    setEmploymentStatus(value);
    setIsDropdownOpen(false);
  };

  const handleSofSelect = (value) => {
    setSourceOfFunds(value);
    setSofDropdownOpen(false);
  };

  const toNumericIncome = (value) => {
    if (!value) return null;
    const normalized = value.replace(/[\s,]/g, "");
    const parsed = Number.parseFloat(normalized);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const toGraduationDate = (value) => {
    if (!value) return null;
    return `${value}-01`;
  };

  const handleSubmit = async () => {
    setSubmitError("");
    setSubmitSuccess("");

    if (!employmentStatus) {
      setSubmitError("Please select your employment status.");
      return;
    }

    if (!supabase) {
      setSubmitError("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setSubmitError("You must be signed in to continue.");
        return;
      }

      const payload = {
        employment_status: employmentStatus,
        employer_name: showEmployedSection ? employerName || null : null,
        employer_industry: showEmployedSection ? employerIndustry || null : null,
        employment_type: showEmployedSection ? employmentType || null : null,
        institution_name: showStudentSection ? institutionName || null : null,
        course_name: showStudentSection ? courseName || null : null,
        graduation_date: showStudentSection ? toGraduationDate(graduationDate) : null,
        annual_income_amount: toNumericIncome(annualIncome),
        annual_income_currency: incomeCurrency || "USD",
        existing_onboarding_id: existingOnboardingId || null,
      };

      const res = await fetch("/api/onboarding/save-employment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || "Failed to save onboarding details.");
      if (result.onboarding_id) {
        setExistingOnboardingId(result.onboarding_id);
      }

      setSubmitSuccess("Onboarding details saved successfully.");
      goToStep(2);
    } catch (err) {
      setSubmitError(err?.message || "Failed to save onboarding details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (sofDropdownRef.current && !sofDropdownRef.current.contains(event.target)) {
        setSofDropdownOpen(false);
      }
      if (bankDropdownRef.current && !bankDropdownRef.current.contains(event.target)) {
        setBankDropdownOpen(false);
      }
    };

    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  useEffect(() => {
    const loadAuthUser = async () => {
      if (!supabase) {
        setAuthStatus({ isChecked: true, isAuthenticated: false, displayName: "" });
        return;
      }

      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        if (!user) {
          setAuthStatus({ isChecked: true, isAuthenticated: false, displayName: "" });
          return;
        }

        const displayName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email ||
          "Signed in";

        setAuthStatus({ isChecked: true, isAuthenticated: true, displayName });
      } catch {
        setAuthStatus({ isChecked: true, isAuthenticated: false, displayName: "" });
      }
    };

    loadAuthUser();
  }, []);

  useEffect(() => {
    const loadExistingOnboarding = async () => {
      if (!supabase) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) return;

        const res = await fetch("/api/onboarding/status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await res.json();
        if (result.success && result.onboarding_id) {
          setExistingOnboardingId(result.onboarding_id);
        }
      } catch (err) {
        // ignore; user can still proceed normally
      }
    };

    loadExistingOnboarding();
  }, []);

  useEffect(() => {
    if (step !== 2) {
      setShowProceed(false);
    }
    if (step !== 7) {
      setAgreedTerms(false);
      setAgreedPrivacy(false);
    }
  }, [step]);

  useEffect(() => {
    const checkKycStatus = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_URL || "";
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData?.user?.id;
        if (!userId) return;
        const res = await fetch(`${apiBase}/api/sumsub/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        const data = await res.json();
        if (data.success && data.status === "verified") {
          setKycAlreadyVerified(true);
          if (step === 2) setShowProceed(true);
        }
      } catch {
      }
    };
    checkKycStatus();
  }, [step]);

  const showEmployedSection =
    employmentStatus === "employed" ||
    employmentStatus === "self-employed" ||
    employmentStatus === "contractor";

  const showStudentSection = employmentStatus === "student";
  const agreementReady = agreedTerms && agreedPrivacy;
  const sofReady = sourceOfFunds && agreedSourceOfFunds;

  const handleFinalComplete = async () => {
    if (!supabase) {
      if (onComplete) onComplete();
      return;
    }

    let completionSuccess = false;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        if (mandateDataRef.current) {
          const savePayload = { ...mandateDataRef.current, agreedMandate };
          try {
            const mandateRes = await fetch("/api/onboarding/save-mandate", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ mandate_data: savePayload, existing_onboarding_id: existingOnboardingId || null }),
            });
            const mandateResult = await mandateRes.json();
            if (mandateResult.onboarding_id) setExistingOnboardingId(mandateResult.onboarding_id);
          } catch (e) {
            console.error("Mandate save error during completion:", e);
          }
        }

        const completePayload = {
          existing_onboarding_id: existingOnboardingId || null,
          risk_disclosure_agreed: agreedRiskDisclosure || false,
          source_of_funds: sourceOfFunds || null,
          source_of_funds_other: sourceOfFunds === "other" ? (sourceOfFundsOther || null) : null,
          expected_monthly_investment: expectedMonthlyInvestment || null,
          agreed_terms: agreedTerms || false,
          agreed_privacy: agreedPrivacy || false,
          bank_name: bankName || null,
          bank_account_number: bankAccountNumber || null,
          bank_branch_code: bankBranchCode || null,
        };

        const res = await fetch("/api/onboarding/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(completePayload),
        });
        const result = await res.json();
        if (result.success) {
          completionSuccess = true;
        } else {
          console.error("Failed to complete onboarding via API:", result.error);
        }

        if (!completionSuccess) {
          try {
            const { data: userData } = await supabase.auth.getUser();
            const userId = userData?.user?.id;
            if (userId) {
              const { data: existing } = await supabase
                .from("user_onboarding")
                .select("id")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (existing?.id) {
                await supabase
                  .from("user_onboarding")
                  .update({ kyc_status: "onboarding_complete" })
                  .eq("id", existing.id)
                  .eq("user_id", userId);
              } else {
                await supabase
                  .from("user_onboarding")
                  .insert({ user_id: userId, kyc_status: "onboarding_complete", employment_status: "not_provided" });
              }
              completionSuccess = true;
            }
          } catch (directErr) {
            console.error("Direct Supabase fallback also failed:", directErr);
          }
        }
      }
    } catch (err) {
      console.error("Failed to update KYC status:", err);
    }

    if (onComplete) onComplete();
  };

  return (
    <div
      className={`onboarding-process ${isFading ? "fade-out" : "fade-in"} ${
        isDropdownOpen || sofDropdownOpen || bankDropdownOpen ? "dropdown-open" : ""
      }`}
    >
      <div className="min-h-screen flex items-center justify-center px-4 py-8 relative">
        <button
          type="button"
          onClick={handleBack}
          className="back-button animate-fade-in delay-1"
          aria-label="Go back"
        >
          <ArrowLeftIcon width={20} height={20} />
        </button>
        <div className="w-full max-w-2xl onboarding-process-stage">
          <div className="mb-4 text-center text-xs uppercase tracking-[0.2em] text-slate-500">
            {authStatus.isChecked ? (
              authStatus.isAuthenticated ? (
                <>Signed in as {authStatus.displayName}</>
              ) : (
                <>Not signed in</>
              )
            ) : (
              <>Checking session…</>
            )}
          </div>
          {step === 0 ? (
            <div>
              <div className="text-center animate-fade-in delay-1">
                <div className="hero-icon">
                  <ClipboardCheckIcon width={48} height={48} />
                </div>
                <h2
                  className="text-3xl font-light tracking-tight mb-2"
                  style={{ color: "hsl(270 30% 25%)" }}
                >
                  First time onboarding process
                </h2>
                <p className="text-sm mb-6" style={{ color: "hsl(270 20% 50%)" }}>
                  We need to verify a few details before you fully onboard
                </p>
              </div>

              <div className="steps-container animate-fade-in delay-2">
                <div className="step-circle">1</div>
                <div className="step-line"></div>
                <div className="step-circle">2</div>
                <div className="step-line"></div>
                <div className="step-circle">3</div>
                <div className="step-line"></div>
                <div className="step-circle">4</div>
                <div className="step-line"></div>
                <div className="step-circle">5</div>
                <div className="step-line"></div>
                <div className="step-circle">6</div>
                <div className="step-line"></div>
                <div className="step-circle">7</div>
              </div>

              <div className="step-info animate-fade-in delay-3">
                <div className="step-item">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <div className="step-title">Identity Check</div>
                    <div className="step-description">
                      Confirm your ID number is unique in our records
                    </div>
                  </div>
                </div>

                <div className={`step-item ${kycAlreadyVerified ? 'step-item-complete' : ''}`}>
                  <div className={`step-number ${kycAlreadyVerified ? 'step-number-complete' : ''}`}>
                    {kycAlreadyVerified ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : '2'}
                  </div>
                  <div className="step-content">
                    <div className="step-title">
                      Identification
                      {kycAlreadyVerified && <span className="step-verified-badge">Verified</span>}
                    </div>
                    <div className="step-description">
                      {kycAlreadyVerified
                        ? 'Identity verification complete'
                        : 'Verify your identity for security purposes'}
                    </div>
                  </div>
                </div>

                <div className="step-item">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <div className="step-title">Bank Account</div>
                    <div className="step-description">
                      Add your bank account details
                    </div>
                  </div>
                </div>

                <div className="step-item">
                  <div className="step-number">4</div>
                  <div className="step-content">
                    <div className="step-title">Discretionary Mandate</div>
                    <div className="step-description">
                      Review and accept the FSP investment mandate
                    </div>
                  </div>
                </div>

                <div className="step-item">
                  <div className="step-number">5</div>
                  <div className="step-content">
                    <div className="step-title">Risk Disclosure</div>
                    <div className="step-description">
                      Review investment risk disclosure
                    </div>
                  </div>
                </div>

                <div className="step-item">
                  <div className="step-number">6</div>
                  <div className="step-content">
                    <div className="step-title">Source of Funds</div>
                    <div className="step-description">
                      Declare the origin of your investment funds
                    </div>
                  </div>
                </div>

                <div className="step-item">
                  <div className="step-number">7</div>
                  <div className="step-content">
                    <div className="step-title">Agreements</div>
                    <div className="step-description">
                      Review and accept terms and conditions
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center mt-8 animate-fade-in delay-4">
                <button
                  type="button"
                  className="continue-button"
                  onClick={handleContinue}
                >
                  Continue
                </button>
              </div>

              <div className="text-center mt-6 animate-fade-in delay-4">
                <p className="text-xs" style={{ color: "hsl(270 15% 60%)" }}>
                  You'll be taken through our seven-step process
                </p>
              </div>
            </div>
          ) : step === 1 ? (
            <div className="w-full max-w-xl mx-auto">
              <div className="text-center mb-8 animate-fade-in delay-1">
                <p
                  className="text-xs uppercase tracking-[0.2em] mb-2"
                  style={{ color: "hsl(270 20% 55%)" }}
                >
                  Step 1 of 7
                </p>
                <h2
                  className="text-3xl font-light tracking-tight mb-2"
                  style={{ color: "hsl(270 30% 25%)" }}
                >
                  Identity Check
                </h2>
                <p className="text-sm" style={{ color: "hsl(270 20% 50%)" }}>
                  Enter your South African ID number before continuing
                </p>
              </div>

              <div className="space-y-5">
                <div className="animate-fade-in delay-2">
                  <label htmlFor="identity-number">ID Number</label>
                  <div className="glass-field">
                    <input
                      type="text"
                      id="identity-number"
                      placeholder="Enter your 13-digit ID number"
                      value={identityNumber}
                      onChange={(event) => setIdentityNumber(event.target.value.replace(/\D/g, "").slice(0, 13))}
                      inputMode="numeric"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div className="text-xs" style={{ color: "hsl(270 15% 60%)" }}>
                  We will check this number in onboarding pack records before allowing you to proceed.
                </div>

                <div className="pt-2 animate-fade-in delay-3">
                  <button
                    type="button"
                    className="submit-btn"
                    onClick={handleIdentityCheckContinue}
                    disabled={identityCheckLoading}
                  >
                    {identityCheckLoading ? "Checking..." : "Continue"}
                  </button>
                  {identityCheckError ? (
                    <p className="form-error" role="alert">
                      {identityCheckError}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : step === 2 ? (
            <div className="w-full max-w-3xl mx-auto">
              <div className="text-center mb-8 animate-fade-in delay-1">
                <p
                  className="text-xs uppercase tracking-[0.2em] mb-2"
                  style={{ color: "hsl(270 20% 55%)" }}
                >
                  Step 2 of 7
                </p>
                <h2
                  className="text-3xl font-light tracking-tight mb-2"
                  style={{ color: "hsl(270 30% 25%)" }}
                >
                  Identity Verification
                </h2>
                <p className="text-sm" style={{ color: "hsl(270 20% 50%)" }}>
                  {kycAlreadyVerified
                    ? "Your identity has already been verified"
                    : "Verify your identity securely with Sumsub"}
                </p>
              </div>
              {kycAlreadyVerified ? (
                <div className="text-center py-8 animate-fade-in delay-2">
                  <div
                    className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-8 h-8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium mb-2" style={{ color: "hsl(270 30% 25%)" }}>
                    Identity Verified
                  </h3>
                  <p className="text-sm mb-6" style={{ color: "hsl(270 20% 50%)" }}>
                    Your identity has been successfully verified
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium" style={{ background: "hsl(152 80% 95%)", color: "hsl(152 60% 30%)" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <span>Verification Complete</span>
                  </div>
                </div>
              ) : (
                <SumsubVerification onVerified={() => setShowProceed(true)} />
              )}
              {showProceed && (
                <div className="text-center mt-8 animate-fade-in delay-2">
                  <button
                    type="button"
                    className="continue-button proceed-button"
                    onClick={() => goToStep(3)}
                  >
                    Continue to Bank Details
                  </button>
                </div>
              )}
            </div>
          ) : step === 3 ? (
            <div className="w-full max-w-3xl mx-auto bank-step-wrapper">
              <div className="text-center animate-fade-in delay-1">
                <div className="hero-icon">
                  <BankIcon width={48} height={48} />
                </div>
                <h2
                  className="text-3xl font-light tracking-tight mb-2"
                  style={{ color: "hsl(270 30% 25%)" }}
                >
                  Bank Account Details
                </h2>
                <p className="text-sm mb-6" style={{ color: "hsl(270 20% 50%)" }}>
                  Link your South African bank account to <span className="mint-brand">MINT</span>
                </p>
              </div>

              <div className="progress-bar animate-fade-in delay-1">
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step"></div>
                <div className="progress-step"></div>
                <div className="progress-step"></div>
                <div className="progress-step"></div>
              </div>

              <div className="bank-section animate-fade-in delay-2">
                <div className="bank-section-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" />
                  </svg>
                  Select Your Bank
                </div>
                <div className="custom-select" ref={bankDropdownRef}>
                  <div
                    className={`bank-select-trigger ${bankDropdownOpen ? "active" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setBankDropdownOpen((prev) => !prev)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setBankDropdownOpen((prev) => !prev);
                      }
                    }}
                  >
                    {bankName ? (
                      <span className="bank-select-value">
                        {selectedBankOption?.logo && (
                          <img
                            src={selectedBankOption.logo}
                            alt=""
                            className="bank-option-logo"
                            onError={(e) => { e.target.style.display = "none"; }}
                          />
                        )}
                        <span>{selectedBankOption?.label}</span>
                      </span>
                    ) : (
                      <span className="bank-select-placeholder">Choose a bank</span>
                    )}
                    <svg className="bank-select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </div>
                  <div className={`bank-dropdown-list ${bankDropdownOpen ? "active" : ""}`}>
                    {southAfricanBanks.map((option) => (
                      <div
                        key={option.value || "placeholder"}
                        className={`bank-dropdown-option ${bankName === option.value ? "selected" : ""}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleBankSelect(option.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleBankSelect(option.value);
                          }
                        }}
                      >
                        {option.logo && (
                          <img
                            src={option.logo}
                            alt=""
                            className="bank-option-logo"
                            onError={(e) => { e.target.style.display = "none"; }}
                          />
                        )}
                        <span>{option.label}</span>
                        {bankName === option.value && (
                          <svg className="bank-option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                  <input type="hidden" id="bank-name" name="bank-name" value={bankName} />
                </div>
              </div>

              <div className="bank-account-fields animate-fade-in delay-3 hide-when-dropdown-open">
                <div className="bank-section-label">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="15" height="15">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5-3.9 19.5m-2.1-19.5-3.9 19.5" />
                  </svg>
                  Account Details
                </div>
                <div className="bank-inputs-card">
                  <div className="bank-input-row">
                    <label htmlFor="bank-account-number">Account Number</label>
                    <div className="bank-input-field">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18" className="bank-input-icon">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
                      </svg>
                      <input
                        type="text"
                        id="bank-account-number"
                        placeholder="Enter your account number"
                        value={bankAccountNumber}
                        onChange={(event) => setBankAccountNumber(event.target.value.replace(/\D/g, ""))}
                        inputMode="numeric"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <div className="bank-input-divider"></div>
                  <div className="bank-input-row">
                    <label htmlFor="bank-branch-code">Branch Code</label>
                    <div className="bank-input-field">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18" className="bank-input-icon">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                      </svg>
                      <input
                        type="text"
                        id="bank-branch-code"
                        placeholder="Enter your branch code"
                        value={bankBranchCode}
                        onChange={(event) => setBankBranchCode(event.target.value.replace(/\D/g, ""))}
                        inputMode="numeric"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bank-security-notice animate-fade-in delay-3 hide-when-dropdown-open">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16" className="bank-security-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
                <span>Your banking details are encrypted and stored securely. They will only be used for transactions you authorise.</span>
              </div>

              <div className="text-center mt-8 animate-fade-in delay-4 hide-when-dropdown-open">
                <button
                  type="button"
                  className={`continue-button agreement-continue ${bankDetailsReady ? "enabled" : ""}`}
                  disabled={!bankDetailsReady}
                  onClick={() => goToStep(4)}
                >
                  Continue to Mandate
                </button>
              </div>

              <div className="text-center mt-6 animate-fade-in delay-4 hide-when-dropdown-open">
                <p className="text-xs" style={{ color: "hsl(270 15% 60%)" }}>
                  Step 3 of 7
                </p>
              </div>
            </div>
          ) : step === 4 ? (
            <div className="w-full max-w-3xl mx-auto">
              <div className="text-center animate-fade-in delay-1">
                <div className="hero-icon">
                  <FileContractIcon width={48} height={48} />
                </div>
                <h2
                  className="text-3xl font-light tracking-tight mb-2"
                  style={{ color: "hsl(270 30% 25%)" }}
                >
                  Discretionary FSP Mandate
                </h2>
                <p className="text-sm mb-6" style={{ color: "hsl(270 20% 50%)" }}>
                  Please review and accept the investment management mandate
                </p>
              </div>

              <div className="progress-bar animate-fade-in delay-1">
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step"></div>
                <div className="progress-step"></div>
                <div className="progress-step"></div>
              </div>

              <div className="animate-fade-in delay-2" style={{
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid hsl(270 20% 90%)',
                boxShadow: '0 4px 20px rgba(100, 60, 140, 0.08)',
                background: 'white',
              }}>
                <MandateViewer
                  profile={profile}
                  onValidChange={setMandateValid}
                  onDataChange={(data) => { mandateDataRef.current = data; }}
                />
              </div>

              <div className="checkbox-container animate-fade-in delay-3" style={{ display: 'block' }}>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={agreedMandate}
                    onChange={(event) => setAgreedMandate(event.target.checked)}
                  />
                  <span className="checkbox-label">
                    I have read and agree to the Discretionary FSP Mandate and authorise ALGOHIVE to manage my investments as described
                  </span>
                </label>
              </div>

              {!mandateValid && agreedMandate && (
                <p className="text-center animate-fade-in" style={{ color: "#ef4444", fontSize: "12px", marginTop: "8px" }}>
                  Please fill in all required client details (name, surname, ID, address, email, cell number), enter your initials, and select at least one option under each checkbox group in the Schedules section before continuing.
                </p>
              )}

              {submitError && (
                <p className="text-center animate-fade-in" style={{ color: "#ef4444", fontSize: "12px", marginTop: "8px" }}>
                  {submitError}
                </p>
              )}

              <div className="text-center mt-8 animate-fade-in delay-4">
                <button
                  type="button"
                  className={`continue-button agreement-continue ${agreedMandate && mandateValid ? "enabled" : ""}`}
                  disabled={!agreedMandate || !mandateValid}
                  onClick={() => goToStep(5)}
                >
                  Continue to Risk Disclosure
                </button>
              </div>

              <div className="text-center mt-6 animate-fade-in delay-4">
                <p className="text-xs" style={{ color: "hsl(270 15% 60%)" }}>
                  Step 4 of 7
                </p>
              </div>
            </div>
          ) : step === 5 ? (
            <div className="w-full max-w-3xl mx-auto">
              <div className="text-center animate-fade-in delay-1">
                <div className="hero-icon">
                  <ShieldIcon width={48} height={48} />
                </div>
                <h2
                  className="text-3xl font-light tracking-tight mb-2"
                  style={{ color: "hsl(270 30% 25%)" }}
                >
                  Risk Disclosure
                </h2>
                <p className="text-sm mb-6" style={{ color: "hsl(270 20% 50%)" }}>
                  Please review the investment risk disclosure
                </p>
              </div>

              <div className="progress-bar animate-fade-in delay-1">
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step"></div>
                <div className="progress-step"></div>
              </div>

              <div className="agreement-card animate-fade-in delay-2">
                <div className="agreement-title">Investment Risk Disclosure</div>

                <div className="agreement-section">
                  <div className="section-title">1. Investment Risk Warning</div>
                  <div className="agreement-text">
                    Investing in financial instruments involves risk, including the possible loss of some or all of your principal investment. Past performance is not indicative of future results. The value of investments and the income derived from them may go down as well as up.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">2. Market Volatility</div>
                  <div className="agreement-text">
                    Financial markets can be volatile and unpredictable. Prices of securities, including those listed on the JSE, can fluctuate significantly due to various factors including economic conditions, political events, company performance, and market sentiment.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">3. No Guaranteed Returns</div>
                  <div className="agreement-text">
                    MINT does not guarantee any returns on investments. All investment decisions are made at your own risk. You should only invest money that you can afford to lose without affecting your standard of living.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">4. Regulatory Compliance</div>
                  <div className="agreement-text">
                    MINT operates in compliance with South African financial regulations. We are committed to transparency and providing you with the information needed to make informed investment decisions. However, we do not provide personalised financial advice.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">5. Diversification Notice</div>
                  <div className="agreement-text">
                    Concentrating investments in a single security, sector, or asset class increases risk. We encourage you to diversify your portfolio and seek independent financial advice if needed.
                  </div>
                </div>
              </div>

              <div className="checkbox-container animate-fade-in delay-3" style={{ display: 'block' }}>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={agreedRiskDisclosure}
                    onChange={(event) => setAgreedRiskDisclosure(event.target.checked)}
                  />
                  <span className="checkbox-label">
                    I acknowledge that I have read and understand the investment risk disclosure
                  </span>
                </label>
              </div>

              <div className="text-center mt-8 animate-fade-in delay-4">
                <button
                  type="button"
                  className={`continue-button agreement-continue ${agreedRiskDisclosure ? "enabled" : ""}`}
                  disabled={!agreedRiskDisclosure}
                  onClick={() => goToStep(6)}
                >
                  Continue to Source of Funds
                </button>
              </div>

              <div className="text-center mt-6 animate-fade-in delay-4">
                <p className="text-xs" style={{ color: "hsl(270 15% 60%)" }}>
                  Step 5 of 7
                </p>
              </div>
            </div>
          ) : step === 6 ? (
            <div className="w-full max-w-3xl mx-auto">
              <div className="text-center animate-fade-in delay-1">
                <div className="hero-icon">
                  <WalletIcon width={48} height={48} />
                </div>
                <h2
                  className="text-3xl font-light tracking-tight mb-2"
                  style={{ color: "hsl(270 30% 25%)" }}
                >
                  Source of Funds
                </h2>
                <p className="text-sm mb-6" style={{ color: "hsl(270 20% 50%)" }}>
                  Declare the origin of your investment funds
                </p>
              </div>

              <div className="progress-bar animate-fade-in delay-1">
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step"></div>
              </div>

              <div className="space-y-5">
                <div className="animate-fade-in delay-2">
                  <label htmlFor="source-of-funds">Primary Source of Funds</label>
                  <div className="custom-select" ref={sofDropdownRef}>
                    <div
                      className={`glass-field select-trigger ${
                        sofDropdownOpen ? "active" : ""
                      }`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSofDropdownOpen((prev) => !prev)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSofDropdownOpen((prev) => !prev);
                        }
                      }}
                    >
                      <div
                        className="selected-value"
                        data-placeholder="Select source of funds"
                      >
                        {sourceOfFunds ? selectedSofOption?.label : ""}
                      </div>
                    </div>
                    <div className={`custom-dropdown ${sofDropdownOpen ? "active" : ""}`}>
                      {sourceOfFundsOptions.map((option) => (
                        <div
                          key={option.value || "placeholder"}
                          className={`custom-option ${
                            sourceOfFunds === option.value ? "selected" : ""
                          }`}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSofSelect(option.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleSofSelect(option.value);
                            }
                          }}
                        >
                          {option.label}
                        </div>
                      ))}
                    </div>
                    <input
                      type="hidden"
                      id="source-of-funds"
                      name="source-of-funds"
                      value={sourceOfFunds}
                    />
                  </div>
                </div>

                <div
                  className={`conditional-section hide-when-dropdown-open ${
                    sourceOfFunds === "other" ? "active" : ""
                  }`}
                >
                  <label htmlFor="source-of-funds-other">Please describe your source of funds</label>
                  <div className="glass-field">
                    <input
                      type="text"
                      id="source-of-funds-other"
                      placeholder="Describe your source of funds"
                      value={sourceOfFundsOther}
                      onChange={(event) => setSourceOfFundsOther(event.target.value)}
                    />
                  </div>
                </div>

                <div className="animate-fade-in delay-3 hide-when-dropdown-open">
                  <label htmlFor="expected-monthly-investment">Expected Monthly Investment Amount</label>
                  <div className="glass-field">
                    <select
                      id="expected-monthly-investment"
                      value={expectedMonthlyInvestment}
                      onChange={(event) => setExpectedMonthlyInvestment(event.target.value)}
                    >
                      {monthlyInvestmentOptions.map((option) => (
                        <option key={option.value || "placeholder"} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="animate-fade-in delay-3 hide-when-dropdown-open" style={{ display: 'block' }}>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={agreedSourceOfFunds}
                      onChange={(event) => setAgreedSourceOfFunds(event.target.checked)}
                    />
                    <span className="checkbox-label">
                      I declare that the funds I will use for investing are from legitimate sources and I am the beneficial owner of these funds
                    </span>
                  </label>
                </div>

                <div className="text-center mt-8 animate-fade-in delay-4 hide-when-dropdown-open">
                  <button
                    type="button"
                    className={`continue-button agreement-continue ${sofReady ? "enabled" : ""}`}
                    disabled={!sofReady}
                    onClick={() => goToStep(7)}
                  >
                    Continue to Agreements
                  </button>
                </div>

                <div className="text-center mt-6 animate-fade-in delay-4 hide-when-dropdown-open">
                  <p className="text-xs" style={{ color: "hsl(270 15% 60%)" }}>
                    Step 6 of 7
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-3xl mx-auto">
              <div className="text-center animate-fade-in delay-1">
                <div className="hero-icon">
                  <FileContractIcon width={48} height={48} />
                </div>
                <h2
                  className="text-3xl font-light tracking-tight mb-2"
                  style={{ color: "hsl(270 30% 25%)" }}
                >
                  Contract Agreement
                </h2>
                <p className="text-sm mb-6" style={{ color: "hsl(270 20% 50%)" }}>
                  Please review and accept our <span className="mint-brand">MINT</span> terms and conditions
                </p>
              </div>

              <div className="progress-bar animate-fade-in delay-1">
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
                <div className="progress-step active"></div>
              </div>

              <div className="agreement-card animate-fade-in delay-2">
                <div className="agreement-title">Terms and Conditions</div>

                <div className="agreement-section">
                  <div className="section-title">1. Introduction</div>
                  <div className="agreement-text">
                    Welcome to MINT. By accessing or using our services, you agree to be bound by these Terms and Conditions. Please read them carefully before proceeding. These terms govern your use of our platform and all related services.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">2. User Account</div>
                  <div className="agreement-text">
                    You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must provide accurate, current, and complete information during the registration process and keep your information updated.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">3. Privacy and Data Protection</div>
                  <div className="agreement-text">
                    We collect, process, and store your personal data in accordance with our Privacy Policy. By using our services, you consent to such processing and warrant that all data provided by you is accurate. We implement industry-standard security measures to protect your information.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">4. Use of Services</div>
                  <div className="agreement-text">
                    You agree to use our services only for lawful purposes and in accordance with these Terms. You must not use our services in any way that could damage, disable, or impair our platform, or interfere with any other party's use of our services.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">5. Intellectual Property</div>
                  <div className="agreement-text">
                    All content, features, and functionality of our services, including but not limited to text, graphics, logos, and software, are the exclusive property of MINT and are protected by international copyright, trademark, and other intellectual property laws.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">6. Limitation of Liability</div>
                  <div className="agreement-text">
                    MINT shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use or inability to use our services. Our total liability shall not exceed the amount paid by you, if any, for accessing our services.
                  </div>
                </div>

                <div className="agreement-section">
                  <div className="section-title">7. Modifications</div>
                  <div className="agreement-text">
                    We reserve the right to modify these Terms at any time. We will notify users of any material changes via email or through our platform. Your continued use of our services after such modifications constitutes acceptance of the updated Terms.
                  </div>
                </div>
              </div>

              <div className="checkbox-container animate-fade-in delay-3">
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(event) => setAgreedTerms(event.target.checked)}
                  />
                  <span className="checkbox-label">
                    I have read and agree to the Terms and Conditions
                  </span>
                </label>

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={agreedPrivacy}
                    onChange={(event) => setAgreedPrivacy(event.target.checked)}
                  />
                  <span className="checkbox-label">
                    I consent to the Privacy Policy and data processing
                  </span>
                </label>
              </div>

              <div className="text-center mt-8 animate-fade-in delay-4">
                <button
                  type="button"
                  className={`continue-button agreement-continue ${agreementReady ? "enabled" : ""}`}
                  disabled={!agreementReady}
                  onClick={handleFinalComplete}
                >
                  Accept and Continue
                </button>
              </div>

              <div className="text-center mt-6 animate-fade-in delay-4">
                <p className="text-xs" style={{ color: "hsl(270 15% 60%)" }}>
                  Step 7 of 7 - Final step to complete your onboarding
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingProcessPage;
