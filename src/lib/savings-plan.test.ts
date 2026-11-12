import { describe, expect, it } from "vitest";
import { planSavings } from "./savings-plan";
import type { SavingsGoal } from "./goals";
const goals: SavingsGoal[] = [
  {id:"bike",name:"Motorcycle",targetCents:500000,savedCents:450000},
  {id:"quest",name:"Quest",targetCents:50000,savedCents:10000}
];
describe("priority savings planner",()=>{
  it("allocates to selected priority only",()=>{
    expect(planSavings(goals,"quest",25000)).toEqual({priorityId:"quest",availableToPlanCents:25000,allocations:[{goalId:"quest",amountCents:25000}],unallocatedCents:0});
  });
  it("caps recommendation at amount needed",()=>{
    expect(planSavings(goals,"bike",75000)).toMatchObject({allocations:[{goalId:"bike",amountCents:50000}],unallocatedCents:25000});
  });
  it("does not allocate when no goal is chosen",()=>{
    expect(planSavings(goals,null,25000).allocations).toEqual([]);
  });
  it("does not allocate to completed or deleted goals",()=>{
    expect(planSavings([{...goals[0],savedCents:500000}],"bike",25000).allocations).toEqual([]);
    expect(planSavings(goals,"deleted",25000).allocations).toEqual([]);
  });
  it("never recommends funds during a shortfall",()=>{
    expect(planSavings(goals,"bike",0).allocations[0].amountCents).toBe(0);
  });
  it("rejects invalid spendable amounts",()=>{
    expect(()=>planSavings(goals,"bike",-1)).toThrow();
  });
});
