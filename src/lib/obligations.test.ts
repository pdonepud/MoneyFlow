import { describe, expect, it } from "vitest";
import { dueDate, isObligation, monthKey, validateObligation } from "./obligations";
describe("obligation rules", () => {
  it("parses amounts and categories", () => {
    expect(validateObligation(" My rent ", "your-rent", "650.00", 1)).toEqual({name:"My rent",category:"your-rent",amountCents:65000,dueDay:1});
    expect(validateObligation("Brother rent", "family-rent", "400", 1).category).toBe("family-rent");
  });
  it("rejects invalid input", () => {
    expect(() => validateObligation("", "your-rent", "100", 1)).toThrow();
    expect(() => validateObligation("Rent", "your-rent", "0", 1)).toThrow();
    expect(() => validateObligation("Rent", "your-rent", "100", 32)).toThrow();
    expect(() => validateObligation("Rent", "invalid", "100", 1)).toThrow();
  });
  it("caps due dates in short months", () => {
    expect(dueDate(2027, 1, 31).getDate()).toBe(28);
    expect(dueDate(2028, 1, 31).getDate()).toBe(29);
  });
  it("uses local calendar months", () => {
    expect(monthKey(new Date(2026,10,2))).toBe("2026-11");
  });
  it("validates saved data", () => {
    const valid = {id:"a",name:"Rent",category:"your-rent",amountCents:10000,dueDay:1,paidForMonth:null};
    expect(isObligation(valid)).toBe(true);
    expect(isObligation({...valid,amountCents:-100})).toBe(false);
  });
});
