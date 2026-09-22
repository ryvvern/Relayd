import { describe, expect, it } from "vitest";
import { computeNextRetry } from "./backoff";

describe("computeNextRetry", () => {
  it("returns a 10-second delay after attempt 1 fails", () => {
    expect(computeNextRetry(1)).toEqual({ delayMs: 10 * 1000 });
  });

  it("returns a 1-minute delay after attempt 2 fails", () => {
    expect(computeNextRetry(2)).toEqual({ delayMs: 60 * 1000 });
  });

  it("returns a 5-minute delay after attempt 3 fails", () => {
    expect(computeNextRetry(3)).toEqual({ delayMs: 5 * 60 * 1000 });
  });

  it("returns a 30-minute delay after attempt 4 fails", () => {
    expect(computeNextRetry(4)).toEqual({ delayMs: 30 * 60 * 1000 });
  });

  it("returns deadLetter after attempt 5 fails", () => {
    expect(computeNextRetry(5)).toEqual({ deadLetter: true });
  });

  it("throws for attempt 0", () => {
    expect(() => computeNextRetry(0)).toThrow();
  });

  it("throws for attempt 6", () => {
    expect(() => computeNextRetry(6)).toThrow();
  });
});
