import { useEffect, useMemo, useRef, useState } from "react";
import { Info, ArrowRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import { initLoanStep, updateLoan } from "../lib/loanApplication";
import { formatZar } from "../lib/formatCurrency";
import { MintGradientLayout } from "../components/credit/ui/MintGradientLayout";
import { MintCard } from "../components/credit/ui/MintCard";

const BASE_FEE = 169;
const OVER_1K_FEE_RATE = 0.1;
const MONTHLY_RATE = 0.05;
const MAX_MONTHS = 3;
const DEFAULT_MAX_LOAN = 10000;

const getOrdinalSuffix = (day) => {
  if (day > 3 && day < 21) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

const formatDate = (date) => date.toISOString().split("T")[0];

const calculateTotalRepayment = (principal, months) => {
  const baseFee = BASE_FEE;
  const over1kFee = principal > 1000 ? (principal - 1000) * OVER_1K_FEE_RATE : 0;
  const cappedMonths = Math.min(months, MAX_MONTHS);
  const monthlyFee = principal * MONTHLY_RATE * cappedMonths;
  const totalFees = baseFee + over1kFee + monthlyFee;
  return principal + totalFees;
};

const MIN_REPAYMENT_DAYS = 10;

const getSalaryDateForMonth = (year, monthIndex, salaryDay) => {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const clampedDay = Math.min(salaryDay, lastDay);
  return new Date(year, monthIndex, clampedDay);
};

const getNextSalaryDate = (salaryDay, fromDate = new Date(), minDays = MIN_REPAYMENT_DAYS) => {
  const current = new Date(fromDate);
  const currentMonth = current.getMonth();
  const currentYear = current.getFullYear();

  let candidate = getSalaryDateForMonth(currentYear, currentMonth, salaryDay);
  if (candidate <= current) {
    candidate = getSalaryDateForMonth(currentYear, currentMonth + 1, salaryDay);
  }

  const daysUntil = Math.ceil((candidate - current) / (1000 * 60 * 60 * 24));
  if (daysUntil < minDays) {
    candidate = getSalaryDateForMonth(currentYear, currentMonth + 2, salaryDay);
  }

  return candidate;
};

const LoanConfigurationPage = ({ onBack, onBackToCredit, onComplete }) => {
  const [loanRecord, setLoanRecord] = useState(null);
  const [currentStep, setCurrentStep] = useState("amount");
  const [loanAmount, setLoanAmount] = useState("");
  const [loanMonths, setLoanMonths] = useState("");
  const [salaryPaymentDay, setSalaryPaymentDay] = useState(null);
  const [firstRepaymentDate, setFirstRepaymentDate] = useState("");
  const [repaymentSchedule, setRepaymentSchedule] = useState([]);
  const [monthlyRepayment, setMonthlyRepayment] = useState(0);
  const [maxLoanAmount, setMaxLoanAmount] = useState(DEFAULT_MAX_LOAN);
  const [disclaimerText, setDisclaimerText] = useState("Maximum loan cap: R5,000");
  const [disclaimerVisible, setDisclaimerVisible] = useState(true);
  const [repayableInfoVisible, setRepayableInfoVisible] = useState(false);
  const [repayableAmount, setRepayableAmount] = useState(0);
  const [submitStatus, setSubmitStatus] = useState(null);

  const disclaimerTimer = useRef(null);

  const today = useMemo(() => new Date(), []);

  useEffect(() => {
    const init = async () => {
      const record = await initLoanStep(4, { allowRedirect: false });
      if (record) {
        setLoanRecord(record);
        if (record.principal_amount) {
          setLoanAmount(String(record.principal_amount));
        }
        if (record.number_of_months) {
          setLoanMonths(String(record.number_of_months));
        }
        if (record.first_repayment_date) {
          setFirstRepaymentDate(record.first_repayment_date);
        }
      }

      if (supabase) {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        if (userId) {
          const { data: snapshotData } = await supabase
            .from("truid_bank_snapshots")
            .select("net_monthly_income,avg_monthly_income,avg_monthly_expenses,salary_payment_date")
            .eq("user_id", userId)
            .order("captured_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (snapshotData?.salary_payment_date) {
            const raw = snapshotData.salary_payment_date;
            const numericDay = Number(raw);
            if (Number.isFinite(numericDay) && numericDay >= 1 && numericDay <= 31) {
              setSalaryPaymentDay(numericDay);
            } else {
              const parsed = new Date(raw);
              const day = parsed.getDate();
              if (Number.isFinite(day)) {
                setSalaryPaymentDay(day);
              }
            }
          } else if (record?.salary_date) {
            setSalaryPaymentDay(Number(record.salary_date));
          }

          const netIncome = Number(snapshotData?.net_monthly_income)
            || (Number(snapshotData?.avg_monthly_income) - Number(snapshotData?.avg_monthly_expenses))
            || 0;

          if (Number.isFinite(netIncome) && netIncome > 0) {
            const cap = Math.max(1000, Math.floor(netIncome * 0.2));
            setMaxLoanAmount(cap);
            setDisclaimerText(`Maximum loan cap: R${cap.toLocaleString()} (20% of net monthly income)`);
          }
        }
      }
    };

    init();

    return () => {
      if (disclaimerTimer.current) {
        clearTimeout(disclaimerTimer.current);
      }
    };
  }, []);

  const flipAngle = currentStep === "amount" ? 0 : currentStep === "months" ? -120 : -240;

  const buttonText = currentStep === "amount"
    ? "Continue"
    : currentStep === "months"
      ? "Configure Months"
      : "Confirm Schedule";

  const animateDisclaimer = (nextText) => {
    setDisclaimerVisible(false);
    if (disclaimerTimer.current) {
      clearTimeout(disclaimerTimer.current);
    }
    disclaimerTimer.current = setTimeout(() => {
      setDisclaimerText(nextText);
      setDisclaimerVisible(true);
    }, 250);
  };

  const updateRepayable = (amount, months) => {
    if (!amount || !months) return;
    const total = calculateTotalRepayment(amount, months);
    setRepayableAmount(total);
    setMonthlyRepayment(total / months);
    setRepayableInfoVisible(true);
  };

  const buildRepaymentSchedule = (totalRepayment, months, salaryDay, startDate = new Date()) => {
    if (!salaryDay || !months) return [];
    const firstPayment = getNextSalaryDate(salaryDay, startDate);
    const dates = Array.from({ length: months }, (_, idx) => {
      const date = new Date(firstPayment);
      date.setMonth(date.getMonth() + idx);
      return date;
    });

    const segments = dates.map((date, idx) => {
      const prev = idx === 0 ? startDate : dates[idx - 1];
      const days = Math.max(1, Math.ceil((date - prev) / (1000 * 60 * 60 * 24)));
      return { date, days };
    });

    const totalDays = segments.reduce((sum, seg) => sum + seg.days, 0) || 1;
    let remaining = totalRepayment;

    return segments.map((seg, idx) => {
      const isLast = idx === segments.length - 1;
      const amount = isLast
        ? remaining
        : Math.round((totalRepayment * (seg.days / totalDays)) * 100) / 100;
      remaining = Math.round((remaining - amount) * 100) / 100;
      return {
        date: formatDate(seg.date),
        days: seg.days,
        amount
      };
    });
  };

  const handleSubmit = async () => {
    if (currentStep === "amount") {
      const amount = Number(loanAmount);
      if (!amount || amount <= 0) return;
      if (amount > maxLoanAmount) {
        setLoanAmount(String(maxLoanAmount));
        animateDisclaimer(`Maximum loan cap: R${maxLoanAmount.toLocaleString()}`);
        return;
      }
      animateDisclaimer(`Maximum repayment period: ${MAX_MONTHS} Months`);
      setCurrentStep("months");
      return;
    }

    if (currentStep === "months") {
      const months = Number(loanMonths);
      if (!months || months <= 0 || months > MAX_MONTHS) return;
      if (!salaryPaymentDay) return;
      updateRepayable(Number(loanAmount), months);
      const totalRepayment = calculateTotalRepayment(Number(loanAmount), months);
      const schedule = buildRepaymentSchedule(totalRepayment, months, salaryPaymentDay, new Date());
      setRepaymentSchedule(schedule);
      setFirstRepaymentDate(schedule[0]?.date || "");
      const monthlyLabel = schedule[0]?.amount ? formatZar(schedule[0].amount) : formatZar(totalRepayment / months);
      const firstLabel = schedule[0]?.date ? schedule[0].date : "next salary day";
      animateDisclaimer(`Next repayment: ${monthlyLabel} on ${firstLabel}`);
      setCurrentStep("date");
      return;
    }

    if (currentStep === "date") {
      if (!salaryPaymentDay) return;
      if (!repaymentSchedule.length) return;

      setSubmitStatus("loading");

      const totalRepayment = calculateTotalRepayment(Number(loanAmount), Number(loanMonths));
      const monthly = totalRepayment / Number(loanMonths);
      const firstPaymentDate = getNextSalaryDate(salaryPaymentDay, new Date());
      const dateStr = firstPaymentDate ? formatDate(firstPaymentDate) : firstRepaymentDate;
      setFirstRepaymentDate(dateStr);
      setMonthlyRepayment(monthly);

      let didSubmit = false;
      if (loanRecord?.id) {
        const effectiveRate = (totalRepayment - Number(loanAmount)) / Number(loanAmount);
        const updated = await updateLoan(loanRecord.id, {
          principal_amount: Number(loanAmount),
          amount_repayable: totalRepayment,
          first_repayment_date: dateStr,
          number_of_months: Number(loanMonths),
          interest_rate: effectiveRate,
          salary_date: salaryPaymentDay,
          repayment_schedule: repaymentSchedule,
          step_number: 4,
          status: "Submitted"
        });
        didSubmit = Boolean(updated);
      }

      setSubmitStatus(didSubmit ? "success" : "error");

      if (didSubmit && onComplete) {
        onComplete();
      }
    }
  };

  const isDisabled = currentStep === "amount"
    ? !loanAmount
    : currentStep === "months"
      ? !loanMonths || !salaryPaymentDay
      : !repaymentSchedule.length || !salaryPaymentDay;

  const handleBack = () => {
    if (loanRecord?.step_number >= 3 && onBackToCredit) {
      onBackToCredit();
      return;
    }
    if (onBack) {
      onBack();
    }
  };

  return (
    <MintGradientLayout
      title="Loan Configuration"
      subtitle="Set your preferred loan amount, duration, and repayment schedule."
      onBack={handleBack}
      stepInfo="4 / 4"
    >
      <MintCard className="overflow-hidden">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-purple-500 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white shadow-md">
            <Info size={12} /> Loan Setup
          </span>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">Configure your loan</h2>
          <p className="mt-2 text-sm text-slate-500">
            Choose your amount, then confirm the repayment duration and salary day.
          </p>
        </div>

        <div className="mt-8">
          <div className="relative mx-auto max-w-[420px]" style={{ perspective: "1000px" }}>
            <div
              className="relative h-[80px] w-full transition-transform duration-700"
              style={{ transform: `rotateX(${flipAngle}deg)`, transformStyle: "preserve-3d" }}
            >
              <div
                className="absolute inset-0"
                style={{ transform: "rotateX(0deg)", backfaceVisibility: "hidden" }}
              >
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-semibold text-purple-700">R</span>
                <input
                  type="number"
                  min="100"
                  max={maxLoanAmount}
                  placeholder={maxLoanAmount.toString()}
                  value={loanAmount}
                  onChange={(event) => setLoanAmount(event.target.value)}
                  className="h-[80px] w-full rounded-full border border-slate-200 bg-white/90 pl-12 pr-6 text-2xl font-semibold text-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.08)] outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-500/20"
                />
              </div>

              <div
                className="absolute inset-0"
                style={{ transform: "rotateX(120deg)", backfaceVisibility: "hidden" }}
              >
                <input
                  type="number"
                  min="1"
                  max={MAX_MONTHS}
                  placeholder="3"
                  value={loanMonths}
                  onChange={(event) => setLoanMonths(event.target.value)}
                  className="h-[80px] w-full rounded-full border border-slate-200 bg-white/90 px-6 text-2xl font-semibold text-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.08)] outline-none transition focus:border-purple-400 focus:ring-4 focus:ring-purple-500/20"
                />
              </div>

              <div
                className="absolute inset-0"
                style={{ transform: "rotateX(240deg)", backfaceVisibility: "hidden" }}
              >
                <div className="h-[80px] w-full rounded-full border border-slate-200 bg-white/90 px-6 text-lg font-semibold text-slate-800 shadow-[0_10px_30px_rgba(15,23,42,0.08)] flex items-center justify-center">
                  {salaryPaymentDay
                    ? `Salary day: ${salaryPaymentDay}${getOrdinalSuffix(salaryPaymentDay)}`
                    : "Salary day not found"}
                </div>
              </div>
            </div>
          </div>

          <p
            className={`mt-5 flex items-center justify-center gap-2 text-xs font-medium text-slate-500 transition-all duration-300 ${
              disclaimerVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
            }`}
          >
            <Info size={14} className="text-purple-500" />
            <span dangerouslySetInnerHTML={{ __html: disclaimerText }} />
          </p>

          <div className={`mt-2 flex items-center justify-center gap-2 text-sm font-semibold text-slate-700 transition-all duration-300 ${repayableInfoVisible ? "opacity-100" : "opacity-0"}`}>
            <span>Loan repayable:</span>
            <strong className="text-purple-600">{formatZar(repayableAmount)}</strong>
          </div>

          {repaymentSchedule.length > 0 && (
            <details className="mt-4 rounded-2xl border border-slate-100 bg-white px-5 py-4 text-sm text-slate-700">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-widest text-slate-400">
                Repayment schedule
              </summary>
              <div className="mt-3 space-y-2">
                {repaymentSchedule.map((entry) => (
                  <div key={entry.date} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{entry.date}</p>
                      <p className="text-xs text-slate-500">{entry.days} days</p>
                    </div>
                    <span className="font-semibold text-slate-900">{formatZar(entry.amount)}</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isDisabled}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-full bg-slate-900 px-6 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {buttonText} <ArrowRight size={16} />
          </button>

          {submitStatus && (
            <p
              className={`mt-3 text-center text-sm font-semibold ${
                submitStatus === "success"
                  ? "text-emerald-600"
                  : submitStatus === "error"
                    ? "text-red-500"
                    : "text-slate-500"
              }`}
            >
              {submitStatus === "success"
                ? "Loan submitted"
                : submitStatus === "error"
                  ? "Loan failed"
                  : "Submitting..."}
            </p>
          )}

          <div
            className={`mt-5 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-left text-sm text-slate-600 transition-all duration-300 ${
              currentStep === "date" ? "opacity-100 max-h-40" : "opacity-0 max-h-0 overflow-hidden"
            }`}
          >
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Salary payment day
            </label>
            <p className="mt-2 text-base font-semibold text-slate-800">
              {salaryPaymentDay
                ? `${salaryPaymentDay}${getOrdinalSuffix(salaryPaymentDay)} (from bank)`
                : "Not available from bank snapshot"}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              We use your bank salary date to schedule repayments automatically.
            </p>
          </div>
        </div>
      </MintCard>
    </MintGradientLayout>
  );
};

export default LoanConfigurationPage;
