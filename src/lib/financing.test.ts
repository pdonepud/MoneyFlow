import { describe, expect, it } from "vitest";
import { calculateFinancing, validateFinancing } from "./financing";
const form = {price:"6000",downPayment:"1000",apr:"12",termMonths:36,insurance:"170",fuel:"30",maintenance:"20"};
describe("financing calculator",()=>{
  it("parses exact cents",()=>expect(validateFinancing({...form,price:"6000.25"}).priceCents).toBe(600025));
  it("computes standard amortization",()=>{
    const result=calculateFinancing(validateFinancing(form));
    expect(result.financedCents).toBe(500000);
    expect(result.monthlyPaymentCents).toBe(16607);
    expect(result.monthlyOwnershipCents).toBe(38607);
    expect(result.totalInterestCents).toBeGreaterThan(0);
  });
  it("handles zero interest",()=>{
    const result=calculateFinancing(validateFinancing({...form,apr:"0",price:"1200",downPayment:"0",termMonths:12,insurance:"0",fuel:"0",maintenance:"0"}));
    expect(result.monthlyPaymentCents).toBe(10000);
    expect(result.totalInterestCents).toBe(0);
  });
  it("handles fully paid purchase",()=>{
    const result=calculateFinancing(validateFinancing({...form,price:"1000",downPayment:"1000"}));
    expect(result.monthlyPaymentCents).toBe(0);
    expect(result.totalInterestCents).toBe(0);
  });
  it("rejects down payments above price",()=>expect(()=>validateFinancing({...form,downPayment:"7000"})).toThrow());
  it("rejects invalid APR and term",()=>{
    expect(()=>validateFinancing({...form,apr:"-1"})).toThrow();
    expect(()=>validateFinancing({...form,apr:"101"})).toThrow();
    expect(()=>validateFinancing({...form,termMonths:13})).toThrow();
  });
  it("rejects negative recurring costs",()=>expect(()=>validateFinancing({...form,insurance:"-10"})).toThrow());
});
