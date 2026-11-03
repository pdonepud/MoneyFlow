import { describe, expect, it } from "vitest";
import { isPaycheck, localDateISO, sortPaychecks, validatePaycheck } from "./paychecks";

describe("paycheck domain", () => {
  it("validates a paycheck", () => {
    expect(validatePaycheck("2026-11-02", "925.50", "  Weekly  ", "2026-11-02")).toEqual({ date: "2026-11-02", amountCents: 92550, note: "Weekly" });
  });
  it("rejects zero, malformed dates and long notes", () => {
    expect(() => validatePaycheck("2026-11-02", "0", "")).toThrow();
    expect(() => validatePaycheck("2026-02-30", "10", "")).toThrow();
    expect(() => validatePaycheck("2026-11-02", "10", "a".repeat(201))).toThrow();
  });
  it("rejects future dates but accepts today and earlier dates", () => {
    expect(() => validatePaycheck("2026-11-05", "100", "", "2026-11-02")).toThrow("future");
    expect(validatePaycheck("2026-11-02", "100", "", "2026-11-02").date).toBe("2026-11-02");
    expect(validatePaycheck("2026-11-01", "100", "", "2026-11-02").date).toBe("2026-11-01");
  });
  it("uses the user's local calendar date rather than UTC", () => {
    expect(localDateISO(new Date(2026, 10, 2, 23, 30))).toBe("2026-11-02");
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
