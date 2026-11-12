import { describe, expect, it } from "vitest";
import { goalProgress, isSavingsGoal, validateGoal } from "./goals";
describe("savings goals", () => {
  it("parses monetary inputs as integer cents", () => {
    expect(validateGoal(" Motorcycle ", "5000.50", "125.25")).toEqual({ name:"Motorcycle", targetCents:500050, savedCents:12525 });
  });
  it("rejects empty names and zero targets", () => {
    expect(() => validateGoal("", "100", "0")).toThrow();
    expect(() => validateGoal("Goal", "0", "0")).toThrow();
  });
  it("rejects negative and excessive-precision amounts", () => {
    expect(() => validateGoal("Goal", "100", "-1")).toThrow();
    expect(() => validateGoal("Goal", "100", "1.999")).toThrow();
  });
  it("validates saved goals", () => {
    const goal = { id:"1", name:"Quest 3", targetCents:50000, savedCents:20000 };
    expect(isSavingsGoal(goal)).toBe(true);
    expect(isSavingsGoal({...goal, savedCents:-1})).toBe(false);
    expect(isSavingsGoal({...goal, targetCents:0})).toBe(false);
  });
  it("calculates progress and remaining funds", () => {
    expect(goalProgress({id:"1",name:"Bike",targetCents:10000,savedCents:2500})).toEqual({percent:25,remainingCents:7500,complete:false});
  });
  it("caps progress at 100 percent for overfunded goals", () => {
    expect(goalProgress({id:"1",name:"Bike",targetCents:10000,savedCents:12500})).toEqual({percent:100,remainingCents:0,complete:true});
  });
});
