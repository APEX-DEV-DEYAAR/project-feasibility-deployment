export const formatM = (value: number | string | undefined | null, digits = 1): string =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export const formatInt = (value: number | string | undefined | null): string =>
  Math.round(Number(value || 0)).toLocaleString("en-US");

// Format full number (for actual values not in millions)
export const formatNumber = (value: number | string | undefined | null, digits = 0): string =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

// Format currency with appropriate suffix
export const formatCurrency = (value: number | string | undefined | null): string => {
  const num = Number(value || 0);
  if (num === 0) return "0";
  if (Math.abs(num) >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (Math.abs(num) >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toLocaleString("en-US");
};
