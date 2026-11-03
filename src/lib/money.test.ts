import { describe, expect, it } from "vitest";
import { formatMoney, parseMoney } from "./money";

describe("money helpers", () => {
  it("formats integer cents", () => { expect(formatMoney(123456)).toBe("$1,234.56"); expect(formatMoney(0)).toBe("$0.00"); });
  it("parses decimal dollars without floating point rounding", () => { expect(parseMoney("12.30")).toBe(1230); expect(parseMoney("0.01")).toBe(1); });
  it("rejects invalid values", () => { expect(() => parseMoney("-1")).toThrow(); expect(() => parseMoney("1.234")).toThrow(); });
});
