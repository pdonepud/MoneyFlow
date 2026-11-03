import { describe, expect, it } from "vitest";
import { calculateBudget, isBudgetSettings, validateBudget } from "./budget";
import type { Obligation } from "./obligations";

const rent: Obligation = { id:"rent", name:"Rent", category:"your-rent", amountCents:65000, dueDay:1, paidForMonth:null };
const phone: Obligation = { id:"phone", name:"Phone", category:"phone", amountCents:6500, dueDay:15, paidForMonth:null };
describe("deterministic budget engine", () => {
  it("calculates remaining cents without rounding", () => {
    expect(calculateBudget({balanceCents:100001,bufferCents:10000},[rent,phone],"2026-11")).toMatchObject({
      unpaidBillsCents:71500, remainingCents:18501, spendableCents:18501, shortfallCents:0, unpaidCount:2
    });
  });
  it("does not subtract bills already paid this month", () => {
    expect(calculateBudget({balanceCents:100000,bufferCents:0},[{...rent,paidForMonth:"2026-11"},phone],"2026-11").unpaidBillsCents).toBe(6500);
  });
  it("does subtract bills paid in a previous month", () => {
    expect(calculateBudget({balanceCents:100000,bufferCents:0},[{...rent,paidForMonth:"2026-10"}],"2026-11").unpaidBillsCents).toBe(65000);
  });
  it("reports a shortfall and never negative spendable funds", () => {
    expect(calculateBudget({balanceCents:10000,bufferCents:5000},[rent],"2026-11")).toMatchObject({
      remainingCents:-60000, spendableCents:0, shortfallCents:60000
    });
  });
  it("works without bills and with zero balance", () => {
    expect(calculateBudget({balanceCents:0,bufferCents:0},[],"2026-11").remainingCents).toBe(0);
  });
  it("validates manual inputs and saved data", () => {
    expect(validateBudget("1200.50","100")).toEqual({balanceCents:120050,bufferCents:10000});
    expect(()=>validateBudget("-1","0")).toThrow();
    expect(()=>validateBudget("1.999","0")).toThrow();
    expect(isBudgetSettings({balanceCents:100,bufferCents:0})).toBe(true);
    expect(isBudgetSettings({balanceCents:-1,bufferCents:0})).toBe(false);
  });
});
