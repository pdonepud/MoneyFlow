import { describe, expect, it } from "vitest";
import { classifyFreeQuestion, freeAdvice, freeAdviceForQuestion, statedDownPayment } from "./free-advisor";
import type { AdvisorContext } from "./advisor";
const context:AdvisorContext={
  budget:{balanceCents:10000,bufferCents:10000},month:"2026-11",
  obligations:[{id:"b",name:"Rent",category:"your-rent",amountCents:112500,dueDay:1,paidForMonth:null}],
  goals:[{id:"g",name:"Motorcycle",targetCents:500000,savedCents:100000}],
  financing:{priceCents:600000,downPaymentCents:100000,aprPercent:12,termMonths:36,insuranceCents:17000,fuelCents:3000,maintenanceCents:2000}
};
describe("free purchase advisor",()=>{
 it("recognizes supported questions",()=>{
   expect(classifyFreeQuestion("Can I afford the down payment?")).toBe("down-payment");
   expect(classifyFreeQuestion("What is the monthly payment?")).toBe("monthly-cost");
   expect(classifyFreeQuestion("How are my savings goals?")).toBe("goals");
   expect(classifyFreeQuestion("Show my budget")).toBe("budget");
   expect(classifyFreeQuestion("Tell me a joke")).toBe(null);
 });
 it("understands conversational down payment formats",()=>{
   for (const question of [
     "Do u think i can afford a $6000 motorcycle with a 1000$ downpayment",
     "Can I buy a bike with $1,000 down?",
     "Should I buy a motorcycle with a down payment of $1000?"
   ]) {
     expect(classifyFreeQuestion(question)).toBe("down-payment");
     expect(statedDownPayment(question)).toBe(100000);
   }
   expect(statedDownPayment("Can I afford a $6000 motorcycle?")).toBe(null);
 });
 it("flags mismatch between question and saved financing",()=>{
   const result=freeAdviceForQuestion(context,"Can I afford it with $2,000 down?", "down-payment");
   expect(result).toContain("You mentioned a $2,000.00 down payment");
   expect(result).toContain("saved financing estimate uses $1,000.00");
   expect(result).toContain("figures below use the saved estimate");
 });
 it("warns about unfunded down payment",()=>{
   const result=freeAdvice(context,"down-payment");
   expect(result).toContain("$1,000.00");
   expect(result).toContain("$1,125.00 shortfall");
   expect(result).toContain("$386.07");
 });
 it("explains loan costs without claiming monthly affordability",()=>{
   const result=freeAdvice(context,"monthly-cost");
   expect(result).toContain("$166.07");
   expect(result).toContain("$386.07");
   expect(result).toContain("not a monthly affordability verdict");
 });
 it("shows savings separately",()=>{
   expect(freeAdvice(context,"goals")).toContain("$4,000.00 remaining");
 });
 it("handles missing data",()=>{
   expect(freeAdvice({...context,budget:null},"budget")).toContain("Save your available balance");
   expect(freeAdvice({...context,financing:null},"down-payment")).toContain("Calculate and save");
 });
});
