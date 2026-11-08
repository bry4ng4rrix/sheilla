import { expect, test } from "@playwright/test";
import { ADMIN, EMPLOYEE, HR, login, randomWeekday2027 } from "./helpers";

test.describe("parcours employé", () => {
  test("espace personnel, confidentialité et demande de congé", async ({
    page,
  }) => {
    await login(page, EMPLOYEE);
    await expect(page.getByText("Solde de congés")).toBeVisible();
    await expect(page.getByText(/JOURNÉE DU/i)).toBeVisible();

    // RG07 : aucune donnée RH d'autrui
    await page.goto("/employees");
    await expect(page).toHaveURL(/denied=1/);
    expect(
      (await page.request.get("/api/reports/employees?format=xlsx")).status(),
    ).toBe(403);

    // soumission puis annulation d'une demande
    const day = randomWeekday2027();
    await page.goto("/leaves/create");
    await page.selectOption("#type", "EXCEPTIONAL");
    await page.fill("#startDate", day);
    await page.fill("#endDate", day);
    await expect(page.getByText("1 jour décompté")).toBeVisible();
    await page.fill("#reason", "Convocation administrative (test E2E)");
    await page.getByRole("button", { name: "Envoyer la demande" }).click();
    await expect(page).toHaveURL(/\/leaves\/(?!create)[a-z0-9]+$/);
    await expect(
      page.getByText("En attente de décision RH", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Annuler la demande" })
      .first()
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Annuler la demande" })
      .click();
    await expect(page.getByText("Annulée par l'agent")).toBeVisible();
  });
});

test.describe("parcours responsable RH", () => {
  test("recherche du personnel et refus motivé d'une demande", async ({
    page,
    browser,
  }) => {
    // l'employé dépose une demande
    const emp = await browser.newPage();
    await login(emp, EMPLOYEE);
    const day = randomWeekday2027();
    await emp.goto("/leaves/create");
    await emp.selectOption("#type", "EXCEPTIONAL");
    await emp.fill("#startDate", day);
    await emp.fill("#endDate", day);
    await emp.fill("#reason", "Démarche personnelle (test E2E)");
    await emp.getByRole("button", { name: "Envoyer la demande" }).click();
    await expect(emp).toHaveURL(/\/leaves\/(?!create)[a-z0-9]+$/);
    const id = emp.url().split("/").pop();

    await login(page, HR);
    await page.goto("/employees?q=JA-1006");
    await expect(page.getByText("RAKOTONIRINA")).toBeVisible();

    await page.goto(`/hr/leave-requests/${id}`);
    await page.getByRole("button", { name: "Refuser" }).click();
    await page.getByRole("button", { name: "Confirmer le refus" }).click();
    await expect(
      page.getByText("Le motif de refus est obligatoire (RG05)."),
    ).toBeVisible();
    await page.fill(
      "#comment",
      "Présence requise pour l'inventaire (test E2E)",
    );
    await page.getByRole("button", { name: "Confirmer le refus" }).click();
    await expect(page.getByText(/Refusée par/)).toBeVisible();

    // l'employé voit la décision
    await emp.goto(`/leaves/${id}`);
    await expect(
      emp.getByText("Présence requise pour l'inventaire"),
    ).toBeVisible();
    await emp.close();
  });

  test("anomalies, planning et export de rapport", async ({ page }) => {
    await login(page, HR);
    await page.goto("/attendance/anomalies");
    await expect(
      page.getByRole("heading", { name: "Anomalies de pointage" }),
    ).toBeVisible();
    await page.goto("/attendance/schedules");
    await expect(page.getByText("Grille de planning")).toBeVisible();
    const pdf = await page.request.get("/api/reports/attendance?format=pdf");
    expect(pdf.status()).toBe(200);
    expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
    const xlsx = await page.request.get("/api/reports/leaves?format=xlsx");
    expect(xlsx.headers()["content-type"]).toContain("spreadsheetml");
    // le RH ne gère pas les comptes
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/denied=1/);
  });
});

test.describe("parcours administrateur", () => {
  test("comptes, journal d'audit et supervision", async ({ page }) => {
    await login(page, ADMIN);
    await expect(page.getByText("Comptes actifs")).toBeVisible();
    await page.goto("/admin/users?q=rh@jirama.mg");
    await page.getByRole("link", { name: "Sheilla Rakotomalala" }).click();
    await expect(page.getByText("Historique des connexions")).toBeVisible();
    await page.goto("/admin/audit");
    await expect(page.getByText("auth.login").first()).toBeVisible();
  });
});
