export const formatZar = (val) => {
  if (val === null || val === undefined) return "R 0,00";
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  .format(val)
  .replace(/\./g, ','); // Correctly places the comma for cents
};

/**
 * Format currency with specified symbol
 * @param {number} value - The numeric value to format
 * @param {string} currency - Currency symbol (default 'R')
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, currency = 'R') => {
  const amount = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${currency} ${formatted}`;
};
