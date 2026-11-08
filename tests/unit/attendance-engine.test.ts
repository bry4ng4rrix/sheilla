import { describe, expect, it } from "vitest";
import {
  codeForDay,
  evaluateDay,
  resolvePlan,
  shiftWindow,
  workDayForCheckIn,
  type ShiftDef,
} from "@/server/services/attendance-engine";
import { parseDay, localTimeOn, hhmmToMinutes } from "@/lib/dates";

const J: ShiftDef = {
  code: "J",
  name: "Journée",
  startTime: "07:30",
  endTime: "16:00",
  graceMinutes: 10,
  color: "#000",
};
const N: ShiftDef = {
  code: "N",
  name: "Nuit",
  startTime: "22:00",
  endTime: "06:00",
  graceMinutes: 10,
  color: "#000",
};
const shifts = new Map([
  ["J", J],
  ["N", N],
]);
const day = parseDay("2026-11-04"); // mercredi
const at = (d: Date, hhmm: string, plusDays = 0) =>
  localTimeOn(d, hhmmToMinutes(hhmm) + plusDays * 1440);
const later = new Date("2030-01-01T00:00:00Z");

describe("calcul des retards", () => {
  it("à l'heure dans la tolérance → présent", () => {
    const r = evaluateDay({
      day,
      shift: J,
      checkIn: at(day, "07:38"),
      checkOut: at(day, "16:02"),
      leave: null,
      now: later,
    });
    expect(r.status).toBe("PRESENT");
    expect(r.lateMinutes).toBe(0);
  });
  it("au-delà de la tolérance → retard avec minutes réelles", () => {
    const r = evaluateDay({
      day,
      shift: J,
      checkIn: at(day, "07:55"),
      checkOut: at(day, "16:00"),
      leave: null,
      now: later,
    });
    expect(r.status).toBe("LATE");
    expect(r.lateMinutes).toBe(25);
  });
  it("dépassement horaire signalé au-delà du seuil", () => {
    const r = evaluateDay({
      day,
      shift: J,
      checkIn: at(day, "07:30"),
      checkOut: at(day, "17:15"),
      leave: null,
      now: later,
      overtimeThreshold: 30,
    });
    expect(r.overtimeMinutes).toBe(75);
    expect(r.anomalies).toContain("OVERTIME");
    expect(r.status).toBe("PRESENT");
  });
});

describe("horaires de nuit", () => {
  it("la fenêtre d'un poste de nuit traverse minuit", () => {
    const w = shiftWindow(day, N);
    expect(w.end.getTime() - w.start.getTime()).toBe(8 * 3600_000);
    expect(w.end > at(day, "23:59")).toBe(true);
  });
  it("sortie le lendemain matin = journée complète, pas d'anomalie", () => {
    const r = evaluateDay({
      day,
      shift: N,
      checkIn: at(day, "21:58"),
      checkOut: at(day, "06:05", 1),
      leave: null,
      now: later,
    });
    expect(r.status).toBe("PRESENT");
    expect(r.workedMinutes).toBe(8 * 60 + 7);
  });
  it("une entrée à 05h00 est rattachée au poste de nuit de la veille", () => {
    const plan = (d: Date) => ({
      shift: d.getTime() === day.getTime() ? N : null,
      onCall: false,
      source: "team" as const,
    });
    expect(workDayForCheckIn(at(day, "05:00", 1), plan).getTime()).toBe(
      day.getTime(),
    );
    expect(workDayForCheckIn(at(day, "08:00", 1), plan).getTime()).toBe(
      parseDay("2026-11-05").getTime(),
    );
  });
});

describe("pointages incomplets et absences", () => {
  it("entrée sans sortie après la fin du poste → anomalie", () => {
    const r = evaluateDay({
      day,
      shift: J,
      checkIn: at(day, "07:30"),
      checkOut: null,
      leave: null,
      now: at(day, "20:00"),
    });
    expect(r.status).toBe("ANOMALY");
    expect(r.anomalies).toContain("MISSING_CHECKOUT");
  });
  it("entrée sans sortie pendant le poste → encore présent", () => {
    const r = evaluateDay({
      day,
      shift: J,
      checkIn: at(day, "07:30"),
      checkOut: null,
      leave: null,
      now: at(day, "12:00"),
    });
    expect(r.status).toBe("PRESENT");
  });
  it("sortie sans entrée → anomalie", () => {
    const r = evaluateDay({
      day,
      shift: J,
      checkIn: null,
      checkOut: at(day, "16:00"),
      leave: null,
      now: later,
    });
    expect(r.anomalies).toContain("MISSING_CHECKIN");
    expect(r.status).toBe("ANOMALY");
  });
  it("aucun pointage sur un jour planifié passé → absent", () => {
    expect(
      evaluateDay({
        day,
        shift: J,
        checkIn: null,
        checkOut: null,
        leave: null,
        now: later,
      }).status,
    ).toBe("ABSENT");
  });
  it("jour non planifié sans pointage → repos, jamais absent", () => {
    expect(
      evaluateDay({
        day,
        shift: null,
        checkIn: null,
        checkOut: null,
        leave: null,
        now: later,
      }).status,
    ).toBe("OFF");
  });
  it("congé validé → statut congé même sans pointage", () => {
    expect(
      evaluateDay({
        day,
        shift: J,
        checkIn: null,
        checkOut: null,
        leave: "LEAVE",
        now: later,
      }).status,
    ).toBe("LEAVE");
  });
  it("pointages multiples → anomalie", () => {
    const r = evaluateDay({
      day,
      shift: J,
      checkIn: at(day, "07:30"),
      checkOut: at(day, "16:00"),
      multiplePunches: true,
      leave: null,
      now: later,
    });
    expect(r.status).toBe("ANOMALY");
  });
});

describe("plannings et rotations", () => {
  const weekly = {
    kind: "WEEKLY" as const,
    pattern: "J,J,J,J,J,R,R",
    cycleStart: null,
  };
  const cycle = {
    kind: "CYCLE" as const,
    pattern: "J,J,N,N,R,R",
    cycleStart: parseDay("2026-11-02"),
  };
  it("motif hebdomadaire indexé du lundi au dimanche", () => {
    expect(codeForDay(weekly, parseDay("2026-11-02"))).toBe("J"); // lundi
    expect(codeForDay(weekly, parseDay("2026-11-08"))).toBe("R"); // dimanche
  });
  it("rotation cyclique avec décalage d'équipe", () => {
    expect(codeForDay(cycle, parseDay("2026-11-02"))).toBe("J");
    expect(codeForDay(cycle, parseDay("2026-11-04"))).toBe("N");
    expect(codeForDay(cycle, parseDay("2026-11-02"), 2)).toBe("N");
    expect(codeForDay(cycle, parseDay("2026-11-08"))).toBe("J"); // cycle de 6 jours
    expect(codeForDay(cycle, parseDay("2026-10-31"))).toBe("R"); // avant le début du cycle
  });
  it("priorité : dérogation > individuel > équipe > défaut", () => {
    const base = { day, isHoliday: false, shifts, fallback: weekly };
    expect(
      resolvePlan({
        ...base,
        overrides: [{ kind: "REST", shiftCode: null }],
        individual: weekly,
        team: null,
      }).shift,
    ).toBeNull();
    expect(
      resolvePlan({
        ...base,
        overrides: [],
        individual: { ...weekly, pattern: "N,N,N,N,N,N,N" },
        team: { schedule: weekly, offset: 0 },
      }).shift?.code,
    ).toBe("N");
    expect(
      resolvePlan({
        ...base,
        overrides: [],
        individual: null,
        team: { schedule: cycle, offset: 0 },
      }).source,
    ).toBe("team");
    expect(
      resolvePlan({ ...base, overrides: [], individual: null, team: null })
        .shift?.code,
    ).toBe("J");
  });
  it("astreinte cumulée avec le poste prévu", () => {
    const p = resolvePlan({
      day,
      isHoliday: false,
      shifts,
      fallback: weekly,
      overrides: [{ kind: "ON_CALL", shiftCode: null }],
      individual: null,
      team: null,
    });
    expect(p.onCall).toBe(true);
    expect(p.shift?.code).toBe("J");
  });
  it("jour férié chômé en hebdomadaire, travaillé en rotation continue", () => {
    expect(
      resolvePlan({
        day,
        isHoliday: true,
        shifts,
        fallback: weekly,
        overrides: [],
        individual: null,
        team: null,
      }).shift,
    ).toBeNull();
    expect(
      resolvePlan({
        day: parseDay("2026-11-02"),
        isHoliday: true,
        shifts,
        fallback: null,
        overrides: [],
        individual: null,
        team: { schedule: cycle, offset: 0 },
      }).shift?.code,
    ).toBe("J");
  });
});
