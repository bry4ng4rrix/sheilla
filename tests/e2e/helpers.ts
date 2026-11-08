import { expect, type Page } from "@playwright/test";

export const DEMO = process.env.SEED_DEMO_PASSWORD ?? "Jirama@2026";
export const ADMIN = {
  email: process.env.SEED_ADMIN_EMAIL ?? "admin@jirama.mg",
  password: process.env.SEED_ADMIN_PASSWORD ?? "Admin@2026!",
};
export const HR = { email: "rh@jirama.mg", password: DEMO };
export const EMPLOYEE = {
  email: "fanja.rakotonirina@jirama.mg",
  password: DEMO,
};

export async function login(
  page: Page,
  who: { email: string; password: string },
) {
  await page.goto("/login");
  await page.fill("#email", who.email);
  await page.fill("#password", who.password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Jour ouvrable aléatoire en 2027 pour éviter les chevauchements entre exécutions. */
export function randomWeekday2027() {
  for (;;) {
    const d = new Date(
      Date.UTC(
        2027,
        Math.floor(Math.random() * 12),
        1 + Math.floor(Math.random() * 28),
      ),
    );
    if (d.getUTCDay() >= 1 && d.getUTCDay() <= 5)
      return d.toISOString().slice(0, 10);
  }
}
