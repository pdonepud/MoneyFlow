import { describe, expect, it } from "vitest";
import { isPaycheck, sortPaychecks, validatePaycheck } from "./paychecks";

describe("paycheck domain", () => {
  it("validates a paycheck", () => {
    expect(validatePaycheck("2026-11-02", "925.50", "  Weekly  ")).toEqual({ date: "2026-11-02", amountCents: 92550, note: "Weekly" });
  });
  it("rejects zero, malformed dates and long notes", () => {
    expect(() => validatePaycheck("2026-11-02", "0", "")).toThrow();
    expect(() => validatePaycheck("2026-02-30", "10", "")).toThrow();
    expect(() => validatePaycheck("2026-11-02", "10", "a".repeat(201))).toThrow();
  });
  it("sorts newest first without mutating input", () => {
    const a = { id: "a", date: "2026-01-01", amountCents: 100, note: "" };
    const b = { id: "b", date: "2026-02-01", amountCents: 200, note: "" };
    const input = [a, b];
    expect(sortPaychecks(input)).toEqual([b, a]);
    expect(input).toEqual([a, b]);
  });
  it("rejects malformed persisted entries", () => {
    expect(isPaycheck({ id: "x", date: "2026-11-02", amountCents: 200, note: "" })).toBe(true);
    expect(isPaycheck({ id: "x", date: "2026-11-02", amountCents: -1, note: "" })).toBe(false);
  });
});
