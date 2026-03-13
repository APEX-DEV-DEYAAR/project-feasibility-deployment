import { describe, it, expect } from "vitest";
import { formatM, formatInt, formatNumber, formatCurrency } from "./formatters";

describe("formatM", () => {
  it("formats number with 1 decimal by default", () => {
    expect(formatM(123.456)).toBe("123.5");
  });

  it("handles zero", () => {
    expect(formatM(0)).toBe("0.0");
  });

  it("handles null and undefined", () => {
    expect(formatM(null)).toBe("0.0");
    expect(formatM(undefined)).toBe("0.0");
  });

  it("handles string input", () => {
    expect(formatM("99.99")).toBe("100.0");
  });

  it("respects custom digits", () => {
    expect(formatM(1.2345, 2)).toBe("1.23");
  });

  it("formats large numbers with commas", () => {
    expect(formatM(1234.5)).toBe("1,234.5");
  });
});

describe("formatInt", () => {
  it("rounds and formats with commas", () => {
    expect(formatInt(1234.7)).toBe("1,235");
  });

  it("handles zero, null, undefined", () => {
    expect(formatInt(0)).toBe("0");
    expect(formatInt(null)).toBe("0");
    expect(formatInt(undefined)).toBe("0");
  });
});

describe("formatNumber", () => {
  it("formats with specified decimal places", () => {
    expect(formatNumber(1234.567, 2)).toBe("1,234.57");
  });

  it("defaults to 0 decimal places", () => {
    expect(formatNumber(1234.567)).toBe("1,235");
  });
});

describe("formatCurrency", () => {
  it("formats millions with M suffix", () => {
    expect(formatCurrency(5000000)).toBe("5.0M");
  });

  it("formats thousands with K suffix", () => {
    expect(formatCurrency(75000)).toBe("75.0K");
  });

  it("formats small numbers plainly", () => {
    expect(formatCurrency(500)).toBe("500");
  });

  it("returns '0' for zero", () => {
    expect(formatCurrency(0)).toBe("0");
    expect(formatCurrency(null)).toBe("0");
  });

  it("handles negative millions", () => {
    expect(formatCurrency(-2000000)).toBe("-2.0M");
  });
});
