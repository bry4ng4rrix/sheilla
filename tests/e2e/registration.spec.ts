import { expect, test } from "@playwright/test";
import { ADMIN, login } from "./helpers";

test("inscription : compte en attente, puis refus motivé par l'administrateur", async ({ page, browser }) => {
  const id = Date.now();
  const email = `candidat.${id}@jirama.mg`;
  const password = "Candidat2026x";

  await page.goto("/login");
  await page.getByRole("link", { name: "Demander un accès" }).click();
  await page.fill("#name", `Candidat ${id}`);
  await page.fill("#email", email);
  await page.fill("#matricule", "JA-9999");
  await page.fill("#password", password);
  await page.fill("#confirm", password);
  await page.getByRole("button", { name: "Demander un accès" }).click();
  await expect(page.getByText("Un administrateur doit valider votre compte")).toBeVisible();

  // connexion bloquée tant que la demande n'est pas validée
  await page.goto("/login");
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByText("Votre compte est en attente de validation par un administrateur.")).toBeVisible();

  // l'administrateur voit la demande et la refuse avec un motif
  const admin = await browser.newPage();
  await login(admin, ADMIN);
  await admin.goto("/admin/registrations");
  const card = admin.locator("li", { hasText: email });
  await expect(card.getByText("Aucun dossier libre avec ce matricule")).toBeVisible();
  await card.getByRole("button", { name: "Refuser" }).click();
  await admin.fill("#note", "Matricule inconnu (test E2E)");
  await admin.getByRole("button", { name: "Refuser la demande" }).click();
  await expect(admin.locator("li", { hasText: email })).toHaveCount(0);
  await admin.close();

  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.getByText("Votre demande d'inscription a été refusée.")).toBeVisible();
});
