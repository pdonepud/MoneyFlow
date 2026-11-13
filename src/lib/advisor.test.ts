import { describe,expect,it } from "vitest";
import { buildAdvisorFacts,isAdvisorContext } from "./advisor";
const context = {
 budget:{balanceCents:10000,bufferCents:10000},
 obligations:[{id:"1",name:"Rent",category:"your-rent" as const,amountCents:112500,dueDay:1,paidForMonth:null}],
 month:"2026-11",
 goals:[{id:"g",name:"Motorcycle",targetCents:500000,savedCents:100000}],
 financing:{priceCents:600000,downPaymentCents:100000,aprPercent:12,termMonths:36,insuranceCents:17000,fuelCents:3000,maintenanceCents:2000}
};
describe("advisor context",()=>{
 it("accepts valid financial context",()=>expect(isAdvisorContext(context)).toBe(true));
 it("rejects malformed budget",()=>expect(isAdvisorContext({...context,budget:{balanceCents:-1,bufferCents:0}})).toBe(false));
 it("rejects invalid financing",()=>expect(isAdvisorContext({...context,financing:{...context.financing,termMonths:13}})).toBe(false));
 it("rejects missing context",()=>expect(isAdvisorContext({})).toBe(false));
 it("uses deterministic budget and loan figures",()=>{
  const facts=buildAdvisorFacts(context);
  expect(facts).toContain("Budget shortfall: $1,125.00");
  expect(facts).toContain("Estimated total monthly ownership cost: $386.07");
  expect(facts).toContain("Motorcycle: $1,000.00 saved");
 });
});
