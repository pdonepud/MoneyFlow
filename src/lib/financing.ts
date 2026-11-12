import { parseMoney } from "./money";

export const FINANCING_KEY = "moneyflow.financing.v1";
export const LOAN_TERMS = [12, 24, 36, 48, 60] as const;
export type FinancingInputs = {
  priceCents: number; downPaymentCents: number; aprPercent: number; termMonths: number;
  insuranceCents: number; fuelCents: number; maintenanceCents: number;
};
export type FinancingResult = {
  financedCents: number; monthlyPaymentCents: number; totalLoanPaymentsCents: number;
  totalInterestCents: number; monthlyOwnershipCents: number; monthlyExtrasCents: number;
};
export function validateFinancing(values: {
  price: string; downPayment: string; apr: string; termMonths: number;
  insurance: string; fuel: string; maintenance: string;
}): FinancingInputs {
  const priceCents = parseMoney(values.price);
  const downPaymentCents = parseMoney(values.downPayment);
  const insuranceCents = parseMoney(values.insurance);
  const fuelCents = parseMoney(values.fuel);
  const maintenanceCents = parseMoney(values.maintenance);
  if (priceCents <= 0) throw new Error("Purchase price must be greater than zero.");
  if (downPaymentCents > priceCents) throw new Error("Down payment cannot exceed purchase price.");
  if (!/^(?:\d+)(?:\.\d{1,3})?$/.test(values.apr.trim())) throw new Error("Enter a valid APR (up to three decimal places).");
  const aprPercent = Number(values.apr);
  if (!Number.isFinite(aprPercent) || aprPercent > 100) throw new Error("APR must be between 0% and 100%.");
  if (!(LOAN_TERMS as readonly number[]).includes(values.termMonths)) throw new Error("Choose a supported loan term.");
  return { priceCents, downPaymentCents, aprPercent, termMonths: values.termMonths, insuranceCents, fuelCents, maintenanceCents };
}
export function calculateFinancing(input: FinancingInputs): FinancingResult {
  const { priceCents, downPaymentCents, aprPercent, termMonths, insuranceCents, fuelCents, maintenanceCents } = input;
  if (![priceCents,downPaymentCents,insuranceCents,fuelCents,maintenanceCents].every(n=>Number.isSafeInteger(n)&&n>=0) ||
    priceCents<=0 || downPaymentCents>priceCents || !Number.isFinite(aprPercent) || aprPercent<0 || aprPercent>100 ||
    !LOAN_TERMS.includes(termMonths as typeof LOAN_TERMS[number])) throw new Error("Invalid financing inputs.");
  const financedCents = priceCents - downPaymentCents;
  const rate = aprPercent / 1200;
  const rawPayment = financedCents === 0 ? 0 : rate === 0 ? financedCents / termMonths :
    financedCents * rate / (1 - Math.pow(1 + rate, -termMonths));
  const monthlyPaymentCents = Math.round(rawPayment);
  // Rounded displayed monthly installment; last installment may differ slightly.
  const totalLoanPaymentsCents = Math.round(rawPayment * termMonths);
  const totalInterestCents = Math.max(0, totalLoanPaymentsCents - financedCents);
  const monthlyExtrasCents = insuranceCents + fuelCents + maintenanceCents;
  const monthlyOwnershipCents = monthlyPaymentCents + monthlyExtrasCents;
  if (![totalLoanPaymentsCents,totalInterestCents,monthlyOwnershipCents].every(Number.isSafeInteger)) throw new Error("Financing total is too large.");
  return { financedCents, monthlyPaymentCents, totalLoanPaymentsCents, totalInterestCents, monthlyOwnershipCents, monthlyExtrasCents };
}
