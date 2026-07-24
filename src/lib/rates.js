/** Staffing rate helpers — 2080 hrs/year (40×52), Ceipal-style bill+pay. */

export const HOURS_PER_YEAR = 2080;
export const HOURLY = 'Hourly';
export const ANNUAL = 'Annual';

export function isAnnual(unit) {
  return String(unit || '').toLowerCase() === 'annual';
}

export function toHourly(amount, unit) {
  const n = Number(amount) || 0;
  return isAnnual(unit) ? n / HOURS_PER_YEAR : n;
}

export function toAnnual(amount, unit) {
  const n = Number(amount) || 0;
  return isAnnual(unit) ? n : n * HOURS_PER_YEAR;
}

export function convertAmount(amount, fromUnit, toUnit) {
  if (isAnnual(fromUnit) === isAnnual(toUnit)) return Number(amount) || 0;
  return isAnnual(toUnit) ? toAnnual(amount, fromUnit) : toHourly(amount, fromUnit);
}

export function margin(bill, pay) {
  return (Number(bill) || 0) - (Number(pay) || 0);
}

export function marginPercent(bill, pay) {
  const b = Number(bill) || 0;
  if (b <= 0) return 0;
  return Math.round(((b - (Number(pay) || 0)) / b) * 10000) / 100;
}

export function markupPercent(bill, pay) {
  const p = Number(pay) || 0;
  if (p <= 0) return 0;
  return Math.round((((Number(bill) || 0) - p) / p) * 10000) / 100;
}

export function money(n, digits = 2) {
  const v = Number(n);
  if (Number.isNaN(v)) return '—';
  return v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function unitSuffix(unit) {
  return isAnnual(unit) ? '/yr' : '/hr';
}

/**
 * Smart unit switch: convert both bill & pay when toggling Hourly ↔ Annual.
 */
export function switchUnit(bill, pay, fromUnit, toUnit) {
  return {
    billRate: Math.round(convertAmount(bill, fromUnit, toUnit) * 100) / 100,
    payRate: Math.round(convertAmount(pay, fromUnit, toUnit) * 100) / 100,
    rateUnit: isAnnual(toUnit) ? ANNUAL : HOURLY,
  };
}

/** Guess if user typed annual vs hourly from magnitude (for paste UX). */
export function inferUnitFromAmount(amount) {
  const n = Number(amount) || 0;
  if (n >= 1000) return ANNUAL; // e.g. 120000 salary
  if (n > 0 && n < 500) return HOURLY; // e.g. 85/hr
  return HOURLY;
}
