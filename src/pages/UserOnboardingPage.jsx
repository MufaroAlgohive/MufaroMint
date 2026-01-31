import { useEffect, useRef, useState } from "react";
import SumsubConnector from "../components/SumsubConnector";
import { supabase } from "../lib/supabase";
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

const employmentOptions = [
  { value: "", label: "Select your status" },
  { value: "employed", label: "Employed" },
  { value: "self-employed", label: "Self-Employed" },
  { value: "unemployed", label: "Unemployed" },
  { value: "student", label: "Student" },
  { value: "contractor", label: "Contractor" },
  { value: "retired", label: "Retired" },
];

const OnboardingProcessPage = ({ onBack, onComplete }) => {
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
  const [authStatus, setAuthStatus] = useState({
    isChecked: false,
    isAuthenticated: false,
    displayName: "",
  });
  const dropdownRef = useRef(null);

  const selectedOption = employmentOptions.find(
    (option) => option.value === employmentStatus
  );

  const goToStep = (nextStep) => {
    setIsFading(true);
    window.setTimeout(() => {
      setStep(nextStep);
      setIsFading(false);
    }, 260);
  };

  const handleContinue = () => {
    if (step === 0) {
      goToStep(1);
    }
  };

  const handleBack = () => {
    if (step === 3) {
      goToStep(2);
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
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const userId = authData?.user?.id;
      if (!userId) {
        setSubmitError("You must be signed in to continue.");
        return;
      }

      const payload = {
        user_id: userId,
        employment_status: employmentStatus,
        employer_name: showEmployedSection ? employerName || null : null,
        employer_industry: showEmployedSection ? employerIndustry || null : null,
        employment_type: showEmployedSection ? employmentType || null : null,
        institution_name: showStudentSection ? institutionName || null : null,
        course_name: showStudentSection ? courseName || null : null,
        graduation_date: showStudentSection ? toGraduationDate(graduationDate) : null,
        annual_income_amount: toNumericIncome(annualIncome),
        annual_income_currency: incomeCurrency || "USD",
      };

      if (existingOnboardingId) {
        const { error } = await supabase
          .from("user_onboarding")
          .update(payload)
          .eq("id", existingOnboardingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_onboarding").insert(payload);
        if (error) throw error;
      }

      setSubmitSuccess("Onboarding details saved successfully.");
      goToStep(2);
    } catch (err) {
      setSubmitError(err?.message || "Failed to save onboarding details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sumsubApiBase =
    import.meta.env.VITE_SUMSUB_API_BASE ||
    (import.meta.env.DEV ? "http://localhost:3000" : "");

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
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
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        const userId = authData?.user?.id;
        if (!userId) return;

        const { data, error } = await supabase
          .from("user_onboarding")
          .select("id")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1);
        if (error) throw error;

        const record = data?.[0];
        if (record?.id) {
          setExistingOnboardingId(record.id);
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
    if (step !== 3) {
      setAgreedTerms(false);
      setAgreedPrivacy(false);
    }
  }, [step]);

  const showEmployedSection =
    employmentStatus === "employed" ||
    employmentStatus === "self-employed" ||
    employmentStatus === "contractor";

  const showStudentSection = employmentStatus === "student";
  const agreementReady = agreedTerms && agreedPrivacy;

  const handleFinalComplete = async () => {
    if (!supabase) {
      if (onComplete) onComplete();
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) {
        const userId = userData.user.id;

        const { data: existingAction } = await supabase
          .from("required_actions")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (existingAction) {
          await supabase
            .from("required_actions")
            .update({ kyc_verified: true })
            .eq("user_id", userId);
        } else {
          await supabase
            .from("required_actions")
            .insert({ user_id: userId, kyc_verified: true });
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
        isDropdownOpen ? "dropdown-open" : ""
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
              </div>

              <div className="step-info animate-fade-in delay-3">
                <div className="step-item">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <div className="step-title">Additional Details</div>
                    <div className="step-description">
                      Complete your profile with personal information
                    </div>
                  </div>
                </div>

                <div className="step-item">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <div className="step-title">Identification</div>
                    <div className="step-description">
                      Verify your identity for security purposes
                    </div>
                  </div>
                </div>

                <div className="step-item">
                  <div className="step-number">3</div>
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
                  You'll be taken through our three-step process
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
                  Step 1 of 3
                </p>
                <h2
                  className="text-3xl font-light tracking-tight mb-2"
                  style={{ color: "hsl(270 30% 25%)" }}
                >
                  Employment details
                </h2>
                <p className="text-sm" style={{ color: "hsl(270 20% 50%)" }}>
                  Help us understand your <span className="mint-brand">MINT</span> profile
                </p>
              </div>

              <div className="space-y-5">
                <div className="animate-fade-in delay-2">
                  <label htmlFor="employment-status">Employment Status</label>
                  <div className="custom-select" ref={dropdownRef}>
                    <div
                      className={`glass-field select-trigger ${
                        isDropdownOpen ? "active" : ""
                      }`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setIsDropdownOpen((prev) => !prev)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setIsDropdownOpen((prev) => !prev);
                        }
                      }}
                    >
                      <div
                        className="selected-value"
                        data-placeholder="Select your status"
                      >
                        {employmentStatus ? selectedOption?.label : ""}
                      </div>
                    </div>
                    <div className={`custom-dropdown ${isDropdownOpen ? "active" : ""}`}>
                      {employmentOptions.map((option) => (
                        <div
                          key={option.value || "placeholder"}
                          className={`custom-option ${
                            employmentStatus === option.value ? "selected" : ""
                          }`}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSelect(option.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleSelect(option.value);
                            }
                          }}
                        >
                          {option.label}
                        </div>
                      ))}
                    </div>
                    <input
                      type="hidden"
                      id="employment-status"
                      name="employment-status"
                      value={employmentStatus}
                    />
                  </div>
                </div>

                <div
                  className={`conditional-section space-y-4 hide-when-dropdown-open ${
                    showEmployedSection ? "active" : ""
                  }`}
                >
                  <div className="grid-2">
                    <div>
                      <label htmlFor="employer-name">Employer Name</label>
                      <div className="glass-field">
                        <input
                          type="text"
                          id="employer-name"
                          placeholder="Company name"
                          value={employerName}
                          onChange={(event) => setEmployerName(event.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="employer-industry">Industry</label>
                      <div className="glass-field">
                        <select
                          id="employer-industry"
                          value={employerIndustry}
                          onChange={(event) => setEmployerIndustry(event.target.value)}
                        >
                          <option value="">Select industry</option>
                          <option value="technology">Technology</option>
                          <option value="finance">Finance</option>
                          <option value="healthcare">Healthcare</option>
                          <option value="education">Education</option>
                          <option value="retail">Retail</option>
                          <option value="manufacturing">Manufacturing</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="employment-type">Employment Type</label>
                    <div className="glass-field">
                      <select
                        id="employment-type"
                        value={employmentType}
                        onChange={(event) => setEmploymentType(event.target.value)}
                      >
                        <option value="">Select type</option>
                        <option value="full-time">Full-Time</option>
                        <option value="part-time">Part-Time</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div
                  className={`conditional-section space-y-4 hide-when-dropdown-open ${
                    showStudentSection ? "active" : ""
                  }`}
                >
                  <div className="grid-2">
                    <div>
                      <label htmlFor="institution-name">Institution Name</label>
                      <div className="glass-field">
                        <input
                          type="text"
                          id="institution-name"
                          placeholder="University name"
                          value={institutionName}
                          onChange={(event) => setInstitutionName(event.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="course-name">Course / Major</label>
                      <div className="glass-field">
                        <input
                          type="text"
                          id="course-name"
                          placeholder="e.g. Computer Science"
                          value={courseName}
                          onChange={(event) => setCourseName(event.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="graduation-date">Expected Graduation</label>
                    <div className="glass-field">
                      <input
                        type="month"
                        id="graduation-date"
                        value={graduationDate}
                        onChange={(event) => setGraduationDate(event.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="animate-fade-in delay-3 hide-when-dropdown-open">
                  <label htmlFor="annual-income">Annual Income</label>
                  <div className="income-row">
                    <div className="glass-field">
                      <select
                        id="income-currency"
                        value={incomeCurrency}
                        onChange={(event) => setIncomeCurrency(event.target.value)}
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="ZAR">ZAR</option>
                        <option value="NGN">NGN</option>
                        <option value="KES">KES</option>
                        <option value="GHS">GHS</option>
                      </select>
                    </div>
                    <div className="glass-field">
                      <input
                        type="text"
                        id="annual-income"
                        placeholder="e.g. 50,000"
                        value={annualIncome}
                        onChange={(event) => setAnnualIncome(event.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 animate-fade-in delay-4 hide-when-dropdown-open">
                  <button
                    type="button"
                    className="submit-btn"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : "Continue"}
                  </button>
                  {submitError ? (
                    <p className="form-error" role="alert">
                      {submitError}
                    </p>
                  ) : null}
                  {submitSuccess ? (
                    <p className="form-success" role="status">
                      {submitSuccess}
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
                  Step 2 of 3
                </p>
                <h2
                  className="text-3xl font-light tracking-tight mb-2"
                  style={{ color: "hsl(270 30% 25%)" }}
                >
                  Identification
                </h2>
                <p className="text-sm" style={{ color: "hsl(270 20% 50%)" }}>
                  Verify your identity securely with Sumsub.
                </p>
              </div>
              <SumsubConnector apiBase={sumsubApiBase} onVerified={() => setShowProceed(true)} />
              {showProceed ? (
                <div className="text-center mt-8 animate-fade-in delay-2">
                  <button
                    type="button"
                    className="continue-button proceed-button"
                    onClick={() => goToStep(3)}
                  >
                    Proceed to next step
                  </button>
                </div>
              ) : null}
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
                  Step 3 of 3 - Final step to complete your onboarding
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
