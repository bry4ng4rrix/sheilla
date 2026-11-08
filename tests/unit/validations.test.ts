import { describe, expect, it } from "vitest";
import {
  decisionSchema,
  employeeSchema,
  leaveSchema,
  userSchema,
} from "@/lib/validations";
import { ROLE_PERMISSIONS } from "@/lib/permissions";

describe("RG03 — demande de congé", () => {
  it("refuse une date de fin antérieure au début", () => {
    const r = leaveSchema.safeParse({
      type: "ANNUAL",
      startDate: "2026-11-10",
      endDate: "2026-11-09",
      reason: "Vacances",
    });
    expect(r.success).toBe(false);
  });
  it("exige un motif", () => {
    expect(
      leaveSchema.safeParse({
        type: "ANNUAL",
        startDate: "2026-11-10",
        endDate: "2026-11-12",
        reason: "",
      }).success,
    ).toBe(false);
  });
});

describe("RG05 — refus motivé", () => {
  it("refus sans justification rejeté", () => {
    expect(
      decisionSchema.safeParse({ decision: "REJECTED", comment: "" }).success,
    ).toBe(false);
  });
  it("refus justifié accepté, validation sans commentaire acceptée", () => {
    expect(
      decisionSchema.safeParse({
        decision: "REJECTED",
        comment: "Effectif insuffisant",
      }).success,
    ).toBe(true);
    expect(
      decisionSchema.safeParse({ decision: "APPROVED", comment: "" }).success,
    ).toBe(true);
  });
});

describe("dossiers et comptes", () => {
  const base = {
    matricule: "ja-1234",
    lastName: "Rabe",
    firstName: "Koto",
    gender: "M",
    positionId: "p1",
    hireDate: "2020-01-01",
    contractType: "CDI",
  };
  it("matricule normalisé en majuscules, caractères spéciaux refusés", () => {
    expect(employeeSchema.parse(base).matricule).toBe("JA-1234");
    expect(
      employeeSchema.safeParse({ ...base, matricule: "JA 12/34" }).success,
    ).toBe(false);
  });
  it("politique de mot de passe", () => {
    const u = { name: "X", email: "x@jirama.mg", roleCode: "EMPLOYEE" };
    expect(userSchema.safeParse({ ...u, password: "court" }).success).toBe(
      false,
    );
    expect(
      userSchema.safeParse({ ...u, password: "Solide2026xx" }).success,
    ).toBe(true);
  });
});

describe("RBAC", () => {
  it("un employé n'a accès à aucune donnée RH d'autrui", () => {
    expect(ROLE_PERMISSIONS.EMPLOYEE).not.toContain("employees.view");
    expect(ROLE_PERMISSIONS.EMPLOYEE).not.toContain("leaves.manage");
    expect(ROLE_PERMISSIONS.EMPLOYEE).not.toContain("attendance.manage");
  });
  it("le RH ne gère pas les comptes ni les paramètres système", () => {
    expect(ROLE_PERMISSIONS.HR).not.toContain("users.manage");
    expect(ROLE_PERMISSIONS.HR).not.toContain("settings.manage");
    expect(ROLE_PERMISSIONS.HR).toContain("leaves.manage");
  });
  it("l'administrateur dispose de toutes les permissions", () => {
    expect(ROLE_PERMISSIONS.ADMIN).toEqual(
      expect.arrayContaining([
        ...ROLE_PERMISSIONS.HR,
        "users.manage",
        "audit.view",
      ]),
    );
  });
});
