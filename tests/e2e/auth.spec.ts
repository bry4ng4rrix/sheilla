import { expect, test } from "@playwright/test";
import { EMPLOYEE, login } from "./helpers";

test("mauvais mot de passe : message générique sans fuite d'information", async ({
  page,
}) => {
  await page.goto("/login");
  await page.fill("#email", EMPLOYEE.email);
  await page.fill("#password", "mauvais-mot-de-passe");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(
    page.getByText("Identifiants incorrects ou compte désactivé."),
  ).toBeVisible();
});

test("page protégée sans session → redirection vers la connexion", async ({
  page,
}) => {
  await page.goto("/employees");
  await expect(page).toHaveURL(/\/login/);
});

test("connexion puis déconnexion", async ({ page }) => {
  await login(page, EMPLOYEE);
  await page.getByRole("button", { name: "Menu utilisateur" }).click();
  await page.getByRole("menuitem", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
});
