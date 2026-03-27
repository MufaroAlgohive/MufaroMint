import { describe, it, expect } from 'vitest';
import { LendingEngine } from './LendingEngine';

describe('LendingEngine NCR Compliance', () => {

  it('Example 1: Mid-month borrow (1-month term)', () => {
    // - Loan: R2,000
    // - Origination: 18th
    // - Salary: 30th
    // - Term: 1 month
    // - Type: Unsecured (4.8%)
    
    const engine = new LendingEngine({
      loanType: 'unsecured',
      principal: 2000,
      originationDate: '2026-03-18',
      nextSalaryDate: '2026-03-30',
      termMonths: 1
    });

    const result = engine.calculateLoan();

    // Expected output check:
    // Days: 12
    // Interest: R38.40 (2000 * 0.048 / 30 * 12)
    // Service Fee: R27.60 (69 / 30 * 12)
    // Initiation Fee: R265 (165 + 0.1 * 1000)
    // Total Repayable: R2,331.00
    // Installment: R2,331.00

    expect(result.schedule[0].days).toBe(12);
    expect(result.totalInterest).toBe(38.40);
    expect(result.totalServiceFees).toBe(27.60);
    expect(result.initiationFee).toBe(265.00);
    expect(result.totalRepayable).toBe(2331.00);
    expect(result.installmentAmount).toBe(2331.00);
  });

  it('Example 2: Beginning of month (2-month term)', () => {
    // - Loan: R2,000
    // - Origination: 1st June (to avoid 31st July issues in simple 30-day examples)
    // - Salary: 25th
    // - Term: 2 months
    // - Type: Unsecured (4.8%)

    const engine = new LendingEngine({
      loanType: 'unsecured',
      principal: 2000,
      originationDate: '2026-06-01',
      nextSalaryDate: '2026-06-25',
      termMonths: 2
    });

    const result = engine.calculateLoan();

    // Expected:
    // Period 1 days: 24 (25 - 1)
    // Period 2 days: 30 (25 July - 25 June)
    // Period 1 interest: 2000 * 0.048 / 30 * 24 = 76.80
    // Period 2 interest: 2000 * 0.048 / 30 * 30 = 96.00
    // Total interest: 172.80
    // Initiation Fee: 265.00
    // Service Fee: 2.3 * 54 = 124.20
    // Total Repayable: 2562.00
    // Installment: 1281.00

    expect(result.schedule[0].days).toBe(24);
    expect(result.schedule[1].days).toBe(30); 
    expect(result.totalInterest).toBe(172.80);
    expect(result.totalServiceFees).toBe(124.20);
    expect(result.totalRepayable).toBe(2562.00);
    expect(result.installmentAmount).toBe(1281.00);
  });

  it('Example 3: Within 4-day rule (33 days)', () => {
    // - Loan: R2,000
    // - Origination: 27th April
    // - Salary: 30th April (3 days difference)
    // - Term: 1 month

    const engine = new LendingEngine({
      loanType: 'unsecured',
      principal: 2000,
      originationDate: '2026-04-27',
      nextSalaryDate: '2026-04-30',
      termMonths: 1
    });

    const result = engine.calculateLoan();

    // Expected: Shifted to 30 May.
    // Days: (30 - 27) + 30 = 33 days.
    // Interest: 2000 * 0.048 / 30 * 33 = 105.60
    // Service Fee: 2.3 * 33 = 75.90
    // Total: 2000 + 105.6 + 75.9 + 265 = 2446.50

    expect(result.paymentDates[0].toISOString().split('T')[0]).toBe('2026-05-30');
    expect(result.schedule[0].days).toBe(33);
    expect(result.totalInterest).toBe(105.60);
    expect(result.totalServiceFees).toBe(75.90);
    expect(result.totalRepayable).toBe(2446.50);
  });

  it('Initiation Fee Cap', () => {
    const engine = new LendingEngine({
      loanType: 'unsecured',
      principal: 15000,
      originationDate: '2026-03-01',
      nextSalaryDate: '2026-03-30',
      termMonths: 1
    });
    const fee = engine.calculateInitiationFee();
    expect(fee).toBe(1050); // Caps at R1,050
  });

  it('Securitised Rate (4.0%)', () => {
    const engine = new LendingEngine({
      loanType: 'securitised',
      principal: 2000,
      originationDate: '2026-03-18',
      nextSalaryDate: '2026-03-30',
      termMonths: 1
    });
    const result = engine.calculateLoan();
    // Interest: 2000 * 0.04 / 30 * 12 = 32.00
    expect(result.totalInterest).toBe(32.00);
  });
});
