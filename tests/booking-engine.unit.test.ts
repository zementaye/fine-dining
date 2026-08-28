import { describe, it, expect } from "vitest";
import { windowsOverlap } from "../lib/booking-engine";

describe("windowsOverlap", () => {
  it("detects a full overlap", () => {
    expect(
      windowsOverlap(
        { start: "19:00:00", durationMinutes: 90 },
        { start: "19:30:00", durationMinutes: 90 }
      )
    ).toBe(true);
  });

  it("treats back-to-back bookings as non-overlapping (end is exclusive)", () => {
    expect(
      windowsOverlap(
        { start: "18:00:00", durationMinutes: 90 }, // 18:00-19:30
        { start: "19:30:00", durationMinutes: 90 } // 19:30-21:00
      )
    ).toBe(false);
  });

  it("detects overlap when one window is nested inside another", () => {
    expect(
      windowsOverlap(
        { start: "18:00:00", durationMinutes: 180 },
        { start: "19:00:00", durationMinutes: 30 }
      )
    ).toBe(true);
  });

  it("returns false for windows on clearly different times", () => {
    expect(
      windowsOverlap(
        { start: "12:00:00", durationMinutes: 60 },
        { start: "19:00:00", durationMinutes: 90 }
      )
    ).toBe(false);
  });

  it("detects overlap of exactly one minute", () => {
    expect(
      windowsOverlap(
        { start: "19:00:00", durationMinutes: 91 },
        { start: "20:30:00", durationMinutes: 60 }
      )
    ).toBe(true);
  });
});
