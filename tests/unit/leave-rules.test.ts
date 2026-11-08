import { describe, expect, it } from "vitest";
import {
  assertTransition,
  countLeaveDays,
  rangesOverlap,
} from "@/server/services/leave-rules";
import { parseDay } from "@/lib/dates";

const cal = {
  workingDays: new Set([0, 1, 2, 3, 4]),
  holidays: new Set(["2026-11-01", "2026-12-25"]),
};

describe("calcul des durées", () => {
  it("congé annuel : jours ouvrables hors week-end", () => {
    // lun 2 → dim 8 novembre 2026
    expect(
      countLeaveDays(
        "ANNUAL",
        parseDay("2026-11-02"),
        parseDay("2026-11-08"),
        cal,
      ),
    ).toBe(5);
  });
  it("exclut les jours fériés", () => {
    // mer 23 → lun 28 déc. : 23, 24, (25 férié), 28
    expect(
      countLeaveDays(
        "ANNUAL",
        parseDay("2026-12-23"),
        parseDay("2026-12-28"),
        cal,
      ),
    ).toBe(3);
  });
  it("congé maladie : jours calendaires", () => {
    expect(
      countLeaveDays(
        "SICK",
        parseDay("2026-11-02"),
        parseDay("2026-11-08"),
        cal,
      ),
    ).toBe(7);
  });
  it("période inversée = 0 jour", () => {
    expect(
      countLeaveDays(
        "ANNUAL",
        parseDay("2026-11-08"),
        parseDay("2026-11-02"),
        cal,
      ),
    ).toBe(0);
  });
});

describe("chevauchements et workflow", () => {
  it("détecte un chevauchement, y compris sur un jour commun", () => {
    expect(
      rangesOverlap(
        parseDay("2026-11-02"),
        parseDay("2026-11-05"),
        parseDay("2026-11-05"),
        parseDay("2026-11-09"),
      ),
    ).toBe(true);
    expect(
      rangesOverlap(
        parseDay("2026-11-02"),
        parseDay("2026-11-04"),
        parseDay("2026-11-05"),
        parseDay("2026-11-09"),
      ),
    ).toBe(false);
  });
  it("seule une demande en attente peut recevoir une décision (RG04)", () => {
    expect(() => assertTransition("PENDING", "APPROVED")).not.toThrow();
    expect(() => assertTransition("APPROVED", "REJECTED")).toThrow();
    expect(() => assertTransition("CANCELLED", "APPROVED")).toThrow();
  });
});
