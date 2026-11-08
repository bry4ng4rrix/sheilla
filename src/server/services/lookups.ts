import "server-only";
import { prisma } from "@/lib/prisma";

/** Listes de choix pour les formulaires (postes groupés par service, équipes). */
export async function orgOptions() {
  const [departments, teams] = await Promise.all([
    prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        positions: { where: { isActive: true }, orderBy: { title: "asc" } },
      },
    }),
    prisma.team.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return {
    departments: departments.map((d) => ({
      id: d.id,
      name: d.name,
      positions: d.positions.map((p) => ({ id: p.id, label: p.title })),
    })),
    teams: teams.map((t) => ({ id: t.id, label: t.name })),
  };
}
